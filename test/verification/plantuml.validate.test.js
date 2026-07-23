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
const PlantUMLVisitor = require('../../lib/codegen/fromcto/plantuml/plantumlvisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const PLANTUML_VERSION = '1.2024.7';
const PLANTUML_JAR = process.env.PLANTUML_JAR || path.join(
    __dirname,
    '../../verification/templates',
    `plantuml-${PLANTUML_VERSION}.jar`
);
const PLANTUML_URL = `https://github.com/plantuml/plantuml/releases/download/v${PLANTUML_VERSION}/plantuml-${PLANTUML_VERSION}.jar`;

/**
 * Download the official PlantUML JAR used to syntax-check generated diagrams.
 * @param {string} [url] URL to fetch, following redirects as needed
 * @param {number} [redirects] remaining redirects to follow
 * @returns {Promise<void>} resolves when the JAR has been written to disk
 */
function downloadPlantumlJar(url = PLANTUML_URL, redirects = 5) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                if (redirects === 0) {
                    reject(new Error('Too many redirects while downloading plantuml.jar'));
                    return;
                }
                response.resume();
                resolve(downloadPlantumlJar(response.headers.location, redirects - 1));
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download plantuml.jar (${response.statusCode})`));
                return;
            }
            fs.mkdirSync(path.dirname(PLANTUML_JAR), { recursive: true });
            const file = fs.createWriteStream(PLANTUML_JAR);
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', reject);
    });
}

/**
 * Return the path to the plantuml JAR, downloading it if needed.
 * @returns {Promise<string>} absolute path to the JAR
 */
async function ensurePlantumlJar() {
    if (!fs.existsSync(PLANTUML_JAR)) {
        await downloadPlantumlJar();
    }
    return PLANTUML_JAR;
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
let plantumlJar;

/**
 * Generate PlantUML from a model and verify each .puml has valid syntax
 * using `java -jar plantuml.jar -syntax`.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to PlantUMLVisitor
 */
async function verifyPlantUmlSyntax(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new PlantUMLVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const pumlFiles = fs.readdirSync(outputDir)
            .filter((name) => name.endsWith('.puml'))
            .map((name) => path.join(outputDir, name));

        if (pumlFiles.length === 0) {
            throw new Error('PlantUMLVisitor produced no .puml files');
        }

        for (const puml of pumlFiles) {
            const input = fs.readFileSync(puml, 'utf-8');
            let result;
            try {
                result = execFileSync('java', ['-jar', plantumlJar, '-syntax'], {
                    input,
                    encoding: 'utf-8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
            } catch (err) {
                const details = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
                throw new Error(`${path.basename(puml)}: ${details || err.message}`);
            }
            if (/^ERROR/m.test(result)) {
                throw new Error(`${path.basename(puml)}: ${result.trim()}`);
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
            console.warn(`Skipping PlantUML verification tests: ${JAVA_SKIP_REASON}`);
            return;
        }
        plantumlJar = await ensurePlantumlJar();
    });

    CASES.forEach(function (testCase) {
        const skipReason = getSkipReason(testCase, 'plantuml') || JAVA_SKIP_REASON;
        const title = skipReason
            ? `generated PlantUML from ${testCase.name} has valid syntax (pending: ${skipReason})`
            : `generated PlantUML from ${testCase.name} has valid syntax`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyPlantUmlSyntax(modelManager, testCase.visitorOptions || {});
        });
    });
});
