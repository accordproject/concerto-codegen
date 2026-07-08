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
const ProtobufVisitor = require('../../lib/codegen/fromcto/protobuf/protobufvisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

/**
 * Return a skip reason when protoc is not available to validate generated schemas.
 * @returns {string|null} skip reason or null when protoc is available
 */
function getProtocSkipReason() {
    const version = spawnSync('protoc', ['--version'], { encoding: 'utf-8' });
    if (version.error || version.status !== 0) {
        return 'protoc not installed';
    }
    return null;
}

const PROTOC_SKIP_REASON = getProtocSkipReason();

/**
 * Generate Protobuf from a model and verify it compiles with protoc.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to ProtobufVisitor
 */
async function verifyProtobufCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new ProtobufVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const protoFiles = fs.readdirSync(outputDir)
            .filter((fileName) => fileName.endsWith('.proto'))
            .sort()
            .map((fileName) => path.join(outputDir, fileName));

        if (protoFiles.length === 0) {
            return;
        }

        try {
            execFileSync('protoc', [
                `-I${outputDir}`,
                `--descriptor_set_out=${path.join(outputDir, 'descriptor.pb')}`,
                ...protoFiles,
            ], {
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
        if (PROTOC_SKIP_REASON) {
            // eslint-disable-next-line no-console
            console.warn(`Skipping Protobuf verification tests: ${PROTOC_SKIP_REASON}`);
        }
    });

    CASES.forEach(function (testCase) {
        const skipReason = getSkipReason(testCase, 'protobuf') || PROTOC_SKIP_REASON;
        const title = skipReason
            ? `generated Protobuf from ${testCase.name} compiles with protoc (pending: ${skipReason})`
            : `generated Protobuf from ${testCase.name} compiles with protoc`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyProtobufCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
