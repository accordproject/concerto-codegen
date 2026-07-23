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
const VocabularyVisitor = require('../../lib/codegen/fromcto/vocabulary/vocabularyvisitor.js');
const { validateVocabulary } = require('../../verification/docker/vocabulary/validate.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

/**
 * Generate Vocabulary YAML and verify each .voc file has a valid vocabulary
 * structure using @accordproject/concerto-vocabulary's VocabularyManager.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to VocabularyVisitor
 */
async function verifyVocabularyValidates(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new VocabularyVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const vocFiles = fs.readdirSync(outputDir)
            .filter((name) => name.endsWith('.voc'))
            .map((name) => path.join(outputDir, name));

        if (vocFiles.length === 0) {
            throw new Error('VocabularyVisitor produced no .voc files');
        }

        for (const voc of vocFiles) {
            const text = fs.readFileSync(voc, 'utf-8');
            try {
                validateVocabulary(text);
            } catch (err) {
                throw new Error(`${path.basename(voc)}: ${err.message}`);
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
        const skipReason = getSkipReason(testCase, 'vocabulary');
        const title = skipReason
            ? `generated Vocabulary from ${testCase.name} validates (pending: ${skipReason})`
            : `generated Vocabulary from ${testCase.name} validates`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyVocabularyValidates(modelManager, testCase.visitorOptions || {});
        });
    });
});
