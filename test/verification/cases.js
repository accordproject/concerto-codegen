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

const { ModelManager } = require('@accordproject/concerto-core');
const MetaModelUtil = require('@accordproject/concerto-metamodel').MetaModelUtil;

const MODEL_DIR = path.join(__dirname, '../codegen/fromcto/data/model');

/**
 * Each case loads one fixture (or valid combination) into its own ModelManager.
 * Do not combine unrelated CTO files — some share namespaces or have import deps.
 *
 * `skip` may be a string (all targets) or `{ typescript: '...', jsonschema: '...', protobuf: '...', graphql: '...' }`.
 */
const CASES = [
    {
        name: 'metamodel',
        setup(modelManager) {
            // Same as `concerto compile --target <format> --metamodel` in concerto-cli
            modelManager.addCTOModel(MetaModelUtil.metaModelCto);
        },
    },
    {
        name: 'hr_base',
        files: ['hr_base.cto'],
        skip: {
            // jsonschema: 'empty Level enum produces invalid JSON Schema (enum must have >= 1 item)',
            // graphql: 'map types emit invalid GraphQL SDL (key/value field syntax)',
        },
    },
    {
        name: 'hr_integration',
        files: ['hr_base.cto', 'hr.cto'],
        visitorOptions: { showCompositionRelationships: true },
        skip: {
            // typescript: 'TypescriptVisitor emits non-compilable TS (duplicate ICategory, map import bugs)',
            // jsonschema: 'ambiguous $ref for org.acme.hr@1.0.0.Person.nextOfKin',
            // // protobuf: 'scalar map keys (e.g. SSN) are not valid Proto3 map key types',
            // graphql: 'map type   s emit invalid GraphQL SDL (key/value field syntax)',
        },
    },
    {
        name: 'stringlength',
        files: ['stringlength.cto'],
    },
    {
        name: 'model-base',
        files: ['model-base.cto'],
    },
    {
        name: 'agreement',
        files: ['agreement.cto'],
    },
    {
        name: 'circular',
        files: ['circular.cto'],
    },
];

function getSkipReason(testCase, target) {
    if (!testCase.skip) {
        return null;
    }
    if (typeof testCase.skip === 'string') {
        return testCase.skip;
    }
    return testCase.skip[target] || null;
}

function createModelManager(testCase) {
    const modelManager = new ModelManager();

    if (testCase.setup) {
        testCase.setup(modelManager);
    } else {
        for (const fileName of testCase.files) {
            modelManager.addCTOModel(
                fs.readFileSync(path.join(MODEL_DIR, fileName), 'utf-8'),
                fileName
            );
        }
    }

    return modelManager;
}

function applyVerificationEnv() {
    process.env.ENABLE_MAP_TYPE = 'true';
    process.env.IMPORT_ALIASING = 'true';
}

module.exports = {
    CASES,
    MODEL_DIR,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
};
