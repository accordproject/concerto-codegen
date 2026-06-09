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
const TypescriptVisitor = require('../../lib/codegen/fromcto/typescript/typescriptvisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const TSC = path.join(__dirname, '../../node_modules/typescript/bin/tsc');

/**
 * Generate TypeScript from a model and verify it compiles with tsc.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to TypescriptVisitor
 */
async function verifyTypescriptCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new TypescriptVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        fs.writeFileSync(
            path.join(outputDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    target: 'es2016',
                    module: 'commonjs',
                    strict: true,
                    skipLibCheck: true,
                    noEmit: true,
                    esModuleInterop: true,
                    forceConsistentCasingInFileNames: true,
                },
                include: ['**/*.ts'],
            })
        );

        try {
            execFileSync(process.execPath, [TSC, '-p', outputDir], {
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
    this.timeout(60000);

    before(function () {
        applyVerificationEnv();
    });

    CASES.forEach(function (testCase) {
        const skipReason = getSkipReason(testCase, 'typescript');
        const title = skipReason
            ? `generated TypeScript from ${testCase.name} compiles with tsc (pending: ${skipReason})`
            : `generated TypeScript from ${testCase.name} compiles with tsc`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyTypescriptCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
