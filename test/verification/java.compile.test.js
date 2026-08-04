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
const JavaVisitor = require('../../lib/codegen/fromcto/java/javavisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const JACKSON_VERSION = '2.17.2';
const JACKSON_JAR = path.join(
    __dirname,
    '../../verification/templates',
    `jackson-annotations-${JACKSON_VERSION}.jar`
);
const JACKSON_URL = `https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-annotations/${JACKSON_VERSION}/jackson-annotations-${JACKSON_VERSION}.jar`;

/**
 * Download the Jackson annotations JAR used by generated Java code.
 * @returns {Promise<void>} resolves when the JAR has been written to disk
 */
function downloadJacksonJar() {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(JACKSON_JAR), { recursive: true });
        const file = fs.createWriteStream(JACKSON_JAR);
        https.get(JACKSON_URL, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download Jackson annotations (${response.statusCode})`));
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
 * Return the path to the Jackson annotations JAR, downloading it if needed.
 * @returns {Promise<string>} absolute path to the JAR
 */
async function ensureJacksonJar() {
    if (!fs.existsSync(JACKSON_JAR)) {
        await downloadJacksonJar();
    }
    return JACKSON_JAR;
}

/**
 * Collect generated Java source files under a directory tree.
 * @param {string} dir root directory
 * @returns {string[]} absolute paths to .java files
 */
function collectJavaFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir)) {
        const filePath = path.join(dir, entry);
        if (fs.statSync(filePath).isDirectory()) {
            files.push(...collectJavaFiles(filePath));
        } else if (entry.endsWith('.java')) {
            files.push(filePath);
        }
    }
    return files;
}

/**
 * Return a skip reason when javac is not available.
 * @returns {string|null} skip reason or null when javac is available
 */
function getJavacSkipReason() {
    const version = spawnSync('javac', ['-version'], { encoding: 'utf-8' });
    if (version.error || version.status !== 0) {
        return 'javac (JDK) not installed';
    }
    return null;
}

const JAVAC_SKIP_REASON = getJavacSkipReason();
let jacksonJar;

/**
 * Generate Java from a model and verify it compiles with javac.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to JavaVisitor
 */
async function verifyJavaCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new JavaVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const javaFiles = collectJavaFiles(outputDir);
        if (javaFiles.length === 0) {
            return;
        }

        try {
            execFileSync('javac', ['-cp', jacksonJar, ...javaFiles], {
                cwd: outputDir,
                encoding: 'utf-8',
                stdio: ['ignore', 'pipe', 'pipe'],
            });
        } catch (err) {
            const details = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
            throw new Error(details || err.message);
        }
    } finally {
        await cleanup();
    }
}

describe('verification', function () {
    this.timeout(120000);

    before(async function () {
        applyVerificationEnv();
        if (JAVAC_SKIP_REASON) {
            // eslint-disable-next-line no-console
            console.warn(`Skipping Java verification tests: ${JAVAC_SKIP_REASON}`);
            return;
        }
        jacksonJar = await ensureJacksonJar();
    });

    CASES.forEach(function (testCase) {
        const skipReason = getSkipReason(testCase, 'java') || JAVAC_SKIP_REASON;
        const title = skipReason
            ? `generated Java from ${testCase.name} compiles with javac (pending: ${skipReason})`
            : `generated Java from ${testCase.name} compiles with javac`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyJavaCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
