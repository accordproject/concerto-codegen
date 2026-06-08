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
const protobuf = require('protobufjs');
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const ProtobufVisitor = require('../../lib/codegen/fromcto/protobuf/protobufvisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const PROTOBUF_WELL_KNOWN = path.join(__dirname, '../../node_modules/protobufjs');

/**
 * Parse and resolve generated .proto files with protobufjs.
 * @param {string} outputDir - directory containing generated proto files
 */
function verifyProtobufParses(outputDir) {
    const root = protobuf.Root.fromJSON(
        protobuf.loadSync(
            path.join(PROTOBUF_WELL_KNOWN, 'google/protobuf/timestamp.proto')
        ).toJSON()
    );

    root.resolvePath = (origin, target) => {
        if (target.startsWith('google/protobuf/')) {
            return path.join(PROTOBUF_WELL_KNOWN, target);
        }
        return path.join(outputDir, path.basename(target));
    };

    const protoFiles = fs.readdirSync(outputDir).filter((file) => file.endsWith('.proto'));

    for (const file of protoFiles) {
        const filePath = path.join(outputDir, file);
        protobuf.parse(fs.readFileSync(filePath, 'utf-8'), root, {
            keepCase: true,
            filename: filePath,
        });
    }

    try {
        root.resolveAll();
    } catch (err) {
        throw new Error(err.message);
    }
}

/**
 * Generate Protobuf from a model and verify it parses with protobufjs.
 * @param {ModelManager} modelManager - the model to convert
 * @param {Object} [visitorOptions] - options passed to ProtobufVisitor
 */
async function verifyProtobufCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new ProtobufVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        verifyProtobufParses(outputDir);
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
        const skipReason = getSkipReason(testCase, 'protobuf');
        const title = skipReason
            ? `generated Protobuf from ${testCase.name} parses with protobufjs (pending: ${skipReason})`
            : `generated Protobuf from ${testCase.name} parses with protobufjs`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyProtobufCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
