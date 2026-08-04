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

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const MarkdownVisitor = require('../../lib/codegen/fromcto/markdown/markdownvisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const MARKDOWNLINT_CONFIG = process.env.MARKDOWNLINT_CONFIG || path.join(__dirname, '../../verification/docker/markdown/markdownlint.json');
const MARKDOWNLINT_CLI = require.resolve('markdownlint-cli');

/**
 * Generate Markdown from a model and verify it lints clean with markdownlint.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to MarkdownVisitor
 */
async function verifyMarkdownLints(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new MarkdownVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const mdFiles = fs.readdirSync(outputDir)
            .filter((name) => name.endsWith('.md'))
            .map((name) => path.join(outputDir, name));

        if (mdFiles.length === 0) {
            throw new Error('MarkdownVisitor produced no .md files');
        }

        for (const md of mdFiles) {
            try {
                execFileSync(process.execPath, [
                    MARKDOWNLINT_CLI,
                    '-c',
                    MARKDOWNLINT_CONFIG,
                    md,
                ], {
                    encoding: 'utf-8',
                    stdio: ['ignore', 'pipe', 'pipe'],
                });
            } catch (err) {
                const details = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
                throw new Error(`${path.basename(md)}: ${details || err.message}`);
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
        const skipReason = getSkipReason(testCase, 'markdown');
        const title = skipReason
            ? `generated Markdown from ${testCase.name} lints clean with markdownlint (pending: ${skipReason})`
            : `generated Markdown from ${testCase.name} lints clean with markdownlint`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyMarkdownLints(modelManager, testCase.visitorOptions || {});
        });
    });
});
