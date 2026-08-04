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
const GoLangVisitor = require('../../lib/codegen/fromcto/golang/golangvisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const GO_MOD = [
    'module verify',
    '',
    'go 1.22',
    '',
].join('\n');

/**
 * Return a skip reason when go is not available to build the generated code.
 * @returns {string|null} skip reason or null when go is available
 */
function getGoSkipReason() {
    const version = spawnSync('go', ['version'], { encoding: 'utf-8' });
    if (version.error || version.status !== 0) {
        return 'go (Go toolchain) not installed';
    }
    return null;
}

const GO_SKIP_REASON = getGoSkipReason();

/**
 * Collect generated Go source files at the top level of a directory.
 * @param {string} dir root directory
 * @returns {string[]} absolute paths to .go files
 */
function collectGoFiles(dir) {
    return fs.readdirSync(dir)
        .filter((entry) => entry.endsWith('.go'))
        .map((entry) => path.join(dir, entry));
}

/**
 * Generate Go from a model and verify it compiles with go build.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to GoLangVisitor
 */
async function verifyGoCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new GoLangVisitor(), {
            fileWriter: new FileWriter(outputDir),
            ...visitorOptions,
        });

        const goFiles = collectGoFiles(outputDir);
        if (goFiles.length === 0) {
            return;
        }

        // The Go visitor emits one file per Concerto namespace, each declaring
        // its own package, flat into the output directory. Go requires one
        // package per directory, so fan each file out into a subdirectory
        // named after its package before building.
        for (const file of goFiles) {
            const contents = fs.readFileSync(file, 'utf-8');
            const match = contents.match(/^package (\S+)/m);
            const pkg = match ? match[1] : 'main';
            const pkgDir = path.join(outputDir, pkg);
            fs.mkdirSync(pkgDir, { recursive: true });
            fs.renameSync(file, path.join(pkgDir, path.basename(file)));
        }

        fs.writeFileSync(path.join(outputDir, 'go.mod'), GO_MOD);

        try {
            execFileSync('go', ['build', './...'], {
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
    this.timeout(120000);

    before(function () {
        applyVerificationEnv();
        if (GO_SKIP_REASON) {
            // eslint-disable-next-line no-console
            console.warn(`Skipping Go verification tests: ${GO_SKIP_REASON}`);
        }
    });

    CASES.forEach(function (testCase) {
        const skipReason = getSkipReason(testCase, 'golang') || GO_SKIP_REASON;
        const title = skipReason
            ? `generated Go from ${testCase.name} compiles with go build (pending: ${skipReason})`
            : `generated Go from ${testCase.name} compiles with go build`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyGoCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
