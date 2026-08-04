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
const os = require('os');
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const RustVisitor = require('../../lib/codegen/fromcto/rust/rustvisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const CARGO_TOML = [
    '[package]',
    'name = "verify"',
    'version = "0.1.0"',
    'edition = "2021"',
    '',
    '[lib]',
    'path = "src/lib.rs"',
    '',
    '[dependencies]',
    'serde = { version = "1", features = ["derive"] }',
    'chrono = { version = "0.4", features = ["serde"] }',
    '',
].join('\n');

// Compiled crate artifacts are shared across cases so serde/chrono are built once.
const SHARED_TARGET_DIR = path.join(os.tmpdir(), 'concerto-rust-verify-target');

/**
 * Return a skip reason when cargo is not available to build net crates.
 * @returns {string|null} skip reason or null when cargo is available
 */
function getCargoSkipReason() {
    const version = spawnSync('cargo', ['--version'], { encoding: 'utf-8' });
    if (version.error || version.status !== 0) {
        return 'cargo (Rust toolchain) not installed';
    }
    return null;
}

const CARGO_SKIP_REASON = getCargoSkipReason();

/**
 * Generate Rust from a model and verify it compiles with cargo check.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to RustVisitor
 */
async function verifyRustCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        const src = path.join(outputDir, 'src');
        fs.mkdirSync(src, { recursive: true });

        modelManager.accept(new RustVisitor(), {
            fileWriter: new FileWriter(src),
            ...visitorOptions,
        });

        // mod.rs is the crate root; cargo expects it to be named lib.rs.
        const modRs = path.join(src, 'mod.rs');
        if (fs.existsSync(modRs)) {
            fs.renameSync(modRs, path.join(src, 'lib.rs'));
        }

        fs.writeFileSync(path.join(outputDir, 'Cargo.toml'), CARGO_TOML);

        try {
            execFileSync('cargo', ['check', '--quiet'], {
                cwd: outputDir,
                encoding: 'utf-8',
                stdio: ['ignore', 'pipe', 'pipe'],
                env: { ...process.env, CARGO_TARGET_DIR: SHARED_TARGET_DIR },
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
    this.timeout(600000);

    before(function () {
        applyVerificationEnv();
        if (CARGO_SKIP_REASON) {
            // eslint-disable-next-line no-console
            console.warn(`Skipping Rust verification tests: ${CARGO_SKIP_REASON}`);
        }
    });

    CASES.forEach(function (testCase) {
        const skipReason = getSkipReason(testCase, 'rust') || CARGO_SKIP_REASON;
        const title = skipReason
            ? `generated Rust from ${testCase.name} compiles with cargo check (pending: ${skipReason})`
            : `generated Rust from ${testCase.name} compiles with cargo check`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyRustCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
