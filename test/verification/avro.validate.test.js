/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const AvroVisitor = require('../../lib/codegen/fromcto/avro/avrovisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const AVRO_TOOLS_VERSION = '1.12.0';
const AVRO_TOOLS_JAR = process.env.AVRO_TOOLS_JAR || path.join(
    __dirname,
    '../../verification/templates',
    `avro-tools-${AVRO_TOOLS_VERSION}.jar`
);
const AVRO_TOOLS_URL = `https://repo1.maven.org/maven2/org/apache/avro/avro-tools/${AVRO_TOOLS_VERSION}/avro-tools-${AVRO_TOOLS_VERSION}.jar`;

/**
 * Download the Apache avro-tools JAR used to compile generated Avro IDL.
 * @returns {Promise<void>} resolves when the JAR has been written to disk
 */
function downloadAvroToolsJar() {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(AVRO_TOOLS_JAR), { recursive: true });
        const file = fs.createWriteStream(AVRO_TOOLS_JAR);
        https.get(AVRO_TOOLS_URL, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download avro-tools (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', reject);
    });
}

/**
 * Return the path to the avro-tools JAR, downloading it if needed.
 * @returns {Promise<string>} absolute path to the JAR
 */
async function ensureAvroToolsJar() {
    if (!fs.existsSync(AVRO_TOOLS_JAR)) {
        await downloadAvroToolsJar();
    }
    return AVRO_TOOLS_JAR;
}

/**
 * Return a skip reason when java is not available.
 * @returns {string|null} skip reason or null when java is available
 */
function getJavaSkipReason() {
    const version = spawnSync('java', ['-version'], { encoding: 'utf-8' });
    if (version.error || version.status !== 0) {
        return 'java (JRE) not installed';
    }
    return null;
}

const JAVA_SKIP_REASON = getJavaSkipReason();
let avroToolsJar;

/**
 * Generate Avro IDL from a model and verify each .avdl compiles with avro-tools idl.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to AvroVisitor
 */
async function verifyAvroIdlCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new AvroVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const avdlFiles = fs.readdirSync(outputDir)
            .filter((name) => name.endsWith('.avdl'))
            .map((name) => path.join(outputDir, name));

        if (avdlFiles.length === 0) {
            throw new Error('AvroVisitor produced no .avdl files');
        }

        for (const avdl of avdlFiles) {
            try {
                execFileSync('java', ['-jar', avroToolsJar, 'idl', avdl], {
                    encoding: 'utf-8',
                    stdio: ['ignore', 'pipe', 'pipe'],
                });
            } catch (err) {
                const details = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
                throw new Error(`${path.basename(avdl)}: ${details || err.message}`);
            }
        }
    } finally {
        await cleanup();
    }
}

describe('verification', function () {
    this.timeout(120000);

    before(async function () {
        applyVerificationEnv();
        if (JAVA_SKIP_REASON) {
            // eslint-disable-next-line no-console
            console.warn(`Skipping Avro verification tests: ${JAVA_SKIP_REASON}`);
            return;
        }
        avroToolsJar = await ensureAvroToolsJar();
    });

    CASES.forEach(function (testCase) {
        const skipReason = getSkipReason(testCase, 'avro') || JAVA_SKIP_REASON;
        const title = skipReason
            ? `generated Avro IDL from ${testCase.name} compiles with avro-tools idl (pending: ${skipReason})`
            : `generated Avro IDL from ${testCase.name} compiles with avro-tools idl`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyAvroIdlCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
