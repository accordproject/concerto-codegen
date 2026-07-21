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
const OpenApiVisitor = require('../../lib/codegen/fromcto/openapi/openapivisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const REDOCLY_CONFIG_PATH = process.env.REDOCLY_CONFIG
    || path.join(__dirname, '../../verification/docker/openapi/redocly.yaml');
const REDOCLY_CLI = require.resolve('@redocly/cli/bin/cli.js');

/**
 * Generate OpenAPI from a model and verify it lints clean with redocly.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to OpenApiVisitor
 */
async function verifyOpenApiLints(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new OpenApiVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const jsonFiles = fs.readdirSync(outputDir)
            .filter((name) => name.endsWith('.json'))
            .map((name) => path.join(outputDir, name));

        if (jsonFiles.length === 0) {
            throw new Error('OpenApiVisitor produced no .json files');
        }

        for (const json of jsonFiles) {
            try {
                execFileSync(process.execPath, [
                    REDOCLY_CLI,
                    'lint',
                    json,
                    '--config',
                    REDOCLY_CONFIG_PATH,
                    '--format',
                    'stylish',
                ], {
                    encoding: 'utf-8',
                    stdio: ['ignore', 'pipe', 'pipe'],
                });
            } catch (err) {
                const details = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
                throw new Error(`${path.basename(json)}: ${details || err.message}`);
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
        const skipReason = getSkipReason(testCase, 'openapi');
        const title = skipReason
            ? `generated OpenAPI from ${testCase.name} lints clean with redocly (pending: ${skipReason})`
            : `generated OpenAPI from ${testCase.name} lints clean with redocly`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyOpenApiLints(modelManager, testCase.visitorOptions || {});
        });
    });
});
