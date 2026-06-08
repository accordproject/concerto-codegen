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
const { parse } = require('graphql');
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const GraphQLVisitor = require('../../lib/codegen/fromcto/graphql/graphqlvisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

/**
 * Parse generated GraphQL SDL with the graphql parser.
 * @param {string} outputDir - directory containing model.gql
 */
function verifyGraphQLParses(outputDir) {
    const schemaPath = path.join(outputDir, 'model.gql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    try {
        parse(schema);
    } catch (err) {
        throw new Error(err.message);
    }
}

/**
 * Generate GraphQL from a model and verify it parses with graphql.
 * @param {ModelManager} modelManager - the model to convert
 * @param {Object} [visitorOptions] - options passed to GraphQLVisitor
 */
async function verifyGraphQLCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new GraphQLVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        verifyGraphQLParses(outputDir);
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
        const skipReason = getSkipReason(testCase, 'graphql');
        const title = skipReason
            ? `generated GraphQL from ${testCase.name} parses with graphql (pending: ${skipReason})`
            : `generated GraphQL from ${testCase.name} parses with graphql`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyGraphQLCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
