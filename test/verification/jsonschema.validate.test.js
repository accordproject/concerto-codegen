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
const Ajv = require('ajv');
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const JSONSchemaVisitor = require('../../lib/codegen/fromcto/jsonschema/jsonschemavisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

async function verifyJsonSchemaCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new JSONSchemaVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const schemaPath = path.join(outputDir, 'schema.json');
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

        const ajv = new Ajv({ strict: false });
        try {
            ajv.compile(schema);
        } catch (err) {
            throw new Error(err.message);
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
        const skipReason = getSkipReason(testCase, 'jsonschema');
        const title = skipReason
            ? `generated JSON Schema from ${testCase.name} compiles with ajv (pending: ${skipReason})`
            : `generated JSON Schema from ${testCase.name} compiles with ajv`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyJsonSchemaCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
