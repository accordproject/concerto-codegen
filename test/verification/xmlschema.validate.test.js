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
const XmlSchemaVisitor = require('../../lib/codegen/fromcto/xmlschema/xmlschemavisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const XSD_META_SCHEMA_PATH = process.env.XMLSCHEMA_META_SCHEMA
    || '/usr/local/share/XMLSchema.xsd';
const XSD_META_SCHEMA_URL = 'http://www.w3.org/2001/XMLSchema.xsd';

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
 * Resolve the W3C XML Schema for Schemas used by xmllint --schema.
 * @returns {string} path or URL to the meta-schema
 */
function resolveXsdMetaSchema() {
    if (fs.existsSync(XSD_META_SCHEMA_PATH)) {
        return XSD_META_SCHEMA_PATH;
    }
    return XSD_META_SCHEMA_URL;
}

/**
 * Generate XML Schema from a model and verify each .xsd with xmllint --schema.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to XmlSchemaVisitor
 */
async function verifyXmlSchemaValid(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });
    const metaSchema = resolveXsdMetaSchema();

    try {
        modelManager.accept(new XmlSchemaVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const xsdFiles = fs.readdirSync(outputDir)
            .filter((name) => name.endsWith('.xsd'))
            .map((name) => path.join(outputDir, name));

        if (xsdFiles.length === 0) {
            throw new Error('XmlSchemaVisitor produced no .xsd files');
        }

        for (const xsd of xsdFiles) {
            try {
                execFileSync('xmllint', ['--noout', '--schema', metaSchema, xsd], {
                    encoding: 'utf-8',
                    stdio: ['ignore', 'pipe', 'pipe'],
                });
            } catch (err) {
                const details = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
                throw new Error(`${path.basename(xsd)}: ${details || err.message}`);
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
        const skipReason = XMLLINT_SKIP_REASON || getSkipReason(testCase, 'xmlschema');
        const title = skipReason
            ? `generated XML Schema from ${testCase.name} validates with xmllint --schema (pending: ${skipReason})`
            : `generated XML Schema from ${testCase.name} validates with xmllint --schema`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyXmlSchemaValid(modelManager, testCase.visitorOptions || {});
        });
    });
});
