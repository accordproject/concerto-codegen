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

const fs = require('fs');
const path = require('path');
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const MermaidVisitor = require('../../lib/codegen/fromcto/mermaid/mermaidvisitor.js');
const { parseMermaid } = require('../../verification/docker/mermaid/validate.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

/**
 * Generate Mermaid and verify each .mmd parses with mermaid.parse.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to MermaidVisitor
 */
async function verifyMermaidParses(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new MermaidVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const mmdFiles = fs.readdirSync(outputDir)
            .filter((name) => name.endsWith('.mmd'))
            .map((name) => path.join(outputDir, name));

        if (mmdFiles.length === 0) {
            throw new Error('MermaidVisitor produced no .mmd files');
        }

        for (const mmd of mmdFiles) {
            const text = fs.readFileSync(mmd, 'utf-8');
            try {
                await parseMermaid(text);
            } catch (err) {
                throw new Error(`${path.basename(mmd)}: ${err.message}`);
            }
        }
    } finally {
        await cleanup();
    }
}

describe('verification', function () {
    this.timeout(60000);

    before(function () {
        applyVerificationEnv();
    });

    CASES.forEach(function (testCase) {
        const skipReason = getSkipReason(testCase, 'mermaid');
        const title = skipReason
            ? `generated Mermaid from ${testCase.name} parses (pending: ${skipReason})`
            : `generated Mermaid from ${testCase.name} parses`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyMermaidParses(modelManager, testCase.visitorOptions || {});
        });
    });
});
