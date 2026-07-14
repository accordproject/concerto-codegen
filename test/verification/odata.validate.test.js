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
const path = require('path');
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const ODataVisitor = require('../../lib/codegen/fromcto/odata/odatavisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

/**
 * Return a skip reason when xmllint is not available.
 * @returns {string|null} skip reason or null when xmllint is available
 */
function getXmllintSkipReason() {
    const version = spawnSync('xmllint', ['--version'], { encoding: 'utf-8' });
    if (version.error || version.status !== 0) {
        return 'xmllint (libxml2) not installed';
    }
    return null;
}

const XMLLINT_SKIP_REASON = getXmllintSkipReason();

/**
 * Generate OData CSDL and verify each .csdl is well-formed XML.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to ODataVisitor
 */
async function verifyODataWellFormed(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new ODataVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const csdlFiles = fs.readdirSync(outputDir)
            .filter((name) => name.endsWith('.csdl'))
            .map((name) => path.join(outputDir, name));

        if (csdlFiles.length === 0) {
            throw new Error('ODataVisitor produced no .csdl files');
        }

        for (const csdl of csdlFiles) {
            try {
                execFileSync('xmllint', ['--noout', csdl], {
                    encoding: 'utf-8',
                    stdio: ['ignore', 'pipe', 'pipe'],
                });
            } catch (err) {
                const details = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
                throw new Error(`${path.basename(csdl)}: ${details || err.message}`);
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
        const skipReason = XMLLINT_SKIP_REASON || getSkipReason(testCase, 'odata');
        const title = skipReason
            ? `generated OData CSDL from ${testCase.name} is well-formed XML (pending: ${skipReason})`
            : `generated OData CSDL from ${testCase.name} is well-formed XML`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyODataWellFormed(modelManager, testCase.visitorOptions || {});
        });
    });
});
