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
const { ModelManager } = require('@accordproject/concerto-core');

const { ModelManager } = require('@accordproject/concerto-core');
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
 * Generate a crate for a model into a temp dir and hand it to a callback.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} visitorOptions options passed to RustVisitor
 * @param {Function} callback receives the crate directory
 */
async function withGeneratedCrate(modelManager, visitorOptions, callback) {
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
        await callback(outputDir);
    } finally {
        await cleanup();
    }
}

/**
 * Run cargo check on a crate.
 * @param {string} crateDir crate directory
 * @throws {Error} with the compiler output when the crate does not compile
 */
function cargoCheck(crateDir) {
    try {
        execFileSync('cargo', ['check', '--quiet'], {
            cwd: crateDir,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, CARGO_TARGET_DIR: SHARED_TARGET_DIR },
        });
    } catch (err) {
        const details = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
        throw new Error(details || err.message);
    }
}

/**
 * Generate Rust from a model and verify it compiles with cargo check.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to RustVisitor
 */
async function verifyRustCompiles(modelManager, visitorOptions = {}) {
    await withGeneratedCrate(modelManager, visitorOptions, cargoCheck);
}

/**
 * Read the by-value type graph out of generated Rust source: a struct or enum
 * points at each type it holds directly, boxed or not. Vec and HashMap are
 * skipped because they never make a type infinitely sized.
 * @param {string} source generated Rust source
 * @returns {{edges: Map<string, Set<string>>, boxed: object[]}} the graph and
 * every boxed field as {owner, target, line}
 */
function readTypeGraph(source) {
    const edges = new Map();
    const boxed = [];
    let owner = null;

    source.split('\n').forEach((line) => {
        const item = line.match(/^pub (?:struct|enum) (\w+)/);
        if (item) {
            owner = item[1];
            edges.set(owner, new Set());
            return;
        }
        if (!owner) {
            return;
        }
        const field = line.match(/^\s+pub \w+: (.+),$/);
        const variant = line.match(/^\s+\w+\((\w+)\),$/);
        const held = field ? field[1] : variant && variant[1];
        if (!held || /(?:Vec|HashMap)</.test(held)) {
            return;
        }
        const boxedType = held.match(/Box<(\w+)>/);
        const target = boxedType ? boxedType[1] : held.match(/(\w+)>*$/)[1];
        edges.get(owner).add(target);
        if (boxedType) {
            boxed.push({ owner, target, line: line.trim() });
        }
    });
    return { edges, boxed };
}

/**
 * Whether one type can reach another through the type graph.
 * @param {Map<string, Set<string>>} edges the type graph
 * @param {string} from start type
 * @param {string} to type to find
 * @returns {boolean} true if there is a path from to
 */
function reaches(edges, from, to) {
    const seen = new Set();
    const pending = [from];
    while (pending.length > 0) {
        const type = pending.pop();
        if (type === to) {
            return true;
        }
        if (!seen.has(type)) {
            seen.add(type);
            pending.push(...(edges.get(type) ?? []));
        }
    }
    return false;
}

/**
 * Verify that every Box in the generated Rust sits on a type cycle. Compiling
 * proves no box is missing, but an unneeded box compiles too, so each boxed
 * field must point at a type that leads back to the struct holding it.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to RustVisitor
 */
async function verifyEveryBoxIsNeeded(modelManager, visitorOptions = {}) {
    await withGeneratedCrate(modelManager, visitorOptions, (crateDir) => {
        const src = path.join(crateDir, 'src');
        const source = fs
            .readdirSync(src)
            .filter((file) => file.endsWith('.rs'))
            .map((file) => fs.readFileSync(path.join(src, file), 'utf-8'))
            .join('\n');
        const { edges, boxed } = readTypeGraph(source);
        const unnecessary = boxed
            .filter(({ owner, target }) => !reaches(edges, target, owner))
            .map(({ owner, line }) => `${owner}: ${line}`);

        if (unnecessary.length > 0) {
            throw new Error(`Unneeded Box:\n${unnecessary.join('\n')}`);
        }
    });
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

        const runBoxes = skipReason ? it.skip : it;
        runBoxes(`generated Rust from ${testCase.name} has no unneeded Box`, async function () {
            const modelManager = createModelManager(testCase);
            await verifyEveryBoxIsNeeded(modelManager, testCase.visitorOptions || {});
        });
    });

    describe('recursion with flattenSubclassesToUnion', function () {
        const NS = 'namespace org.recursion@1.0.0\n';
        const SHAPES = {
            'contained union holding its owner': `${NS}
concept Base {}
concept A extends Base { o Base b optional }`,
            'mutual cycle through two unions': `${NS}
concept BaseA {}
concept BaseB {}
concept A extends BaseA { o BaseB b optional }
concept B extends BaseB { o BaseA a optional }`,
            'relationship cycle through a contained class': `${NS}
asset Base identified by id { o String id }
asset A extends Base { o B b }
concept B { --> A r }`,
            'abstract base referring to its own union': `${NS}
abstract concept Base { o Base next optional }
concept Sub extends Base {}`,
            'inherited field that loops only in the subclass': `${NS}
concept Base { o A a }
concept A extends Base {}`,
            'map whose value type holds the owner': `${NS}
map Index { o String o A }
concept A { o Index index optional }`,
            'relationship to a base whose union holds the owner': `${NS}
asset Base identified by id { o String id }
asset A extends Base { o B b }
concept B { --> Base r }`,
        };

        const MULTI_FILE_SHAPES = {
            'union base whose only subclass is in another namespace': [
                'namespace org.base@1.0.0\nconcept Base {}\nconcept Holder { o Base b }',
                'namespace org.sub@1.0.0\nimport org.base@1.0.0.Base\nconcept A extends Base {}',
            ],
        };

        const ALL_SHAPES = {
            ...Object.fromEntries(
                Object.entries(SHAPES).map(([name, cto]) => [name, [cto]])
            ),
            ...MULTI_FILE_SHAPES,
        };

        const buildModelManager = (ctos) => {
            const modelManager = new ModelManager({ strict: true });
            ctos.forEach((cto, i) =>
                modelManager.addCTOModel(cto, `recursion${i}.cto`)
            );
            return modelManager;
        };

        Object.entries(ALL_SHAPES).forEach(([name, ctos]) => {
            const run = CARGO_SKIP_REASON ? it.skip : it;
            run(`compiles with cargo check: ${name}`, async function () {
                await verifyRustCompiles(buildModelManager(ctos), {
                    flattenSubclassesToUnion: true,
                });
            });
            run(`has no unneeded Box: ${name}`, async function () {
                await verifyEveryBoxIsNeeded(buildModelManager(ctos), {
                    flattenSubclassesToUnion: true,
                });
            });
        });
    });

    const dateTimeTitle = CARGO_SKIP_REASON
        ? `generated Rust deserializes Concerto DateTime values (pending: ${CARGO_SKIP_REASON})`
        : 'generated Rust deserializes Concerto DateTime values';
    (CARGO_SKIP_REASON ? it.skip : it)(dateTimeTitle, async function () {
        const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

        try {
            const src = path.join(outputDir, 'src');
            fs.mkdirSync(src, { recursive: true });

            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.0.0
            map Schedule { o String o DateTime }
            transaction Order {
                o DateTime placed
                o DateTime shipped optional
                o DateTime[] scans
                o DateTime[] returns optional
                o Schedule schedule optional
            }
            `, 'acme.cto');
            modelManager.accept(new RustVisitor(), { fileWriter: new FileWriter(src) });
            fs.renameSync(path.join(src, 'mod.rs'), path.join(src, 'lib.rs'));

            // Concerto JSON holds DateTime values as ISO 8601 strings, and
            // leaves out optional properties that have no value.
            fs.writeFileSync(path.join(src, 'main.rs'), [
                'use chrono::{ TimeZone, Utc };',
                'use verify::org_acme_1_0_0::Order;',
                '',
                'fn main() {',
                '    let order: Order = serde_json::from_str(r#"{"$class":"org.acme@1.0.0.Order","$timestamp":"2024-01-02T03:04:05.678Z","placed":"2024-01-02T03:04:05.678Z","shipped":"2024-01-03T00:00:00.000+01:00","scans":["2024-01-04T00:00:00.000Z"],"returns":["2024-01-05T00:00:00.000Z"],"schedule":{"a":"2024-01-06T00:00:00.000Z"}}"#).unwrap();',
                '    assert_eq!(order.placed, Utc.with_ymd_and_hms(2024, 1, 2, 3, 4, 5).unwrap() + chrono::Duration::milliseconds(678));',
                '    assert_eq!(order._timestamp, order.placed);',
                '    assert_eq!(order.shipped, Some(Utc.with_ymd_and_hms(2024, 1, 2, 23, 0, 0).unwrap()));',
                '    assert_eq!(order.scans.len(), 1);',
                '    assert_eq!(order.returns.map(|r| r.len()), Some(1));',
                '    assert_eq!(order.schedule.map(|s| s.len()), Some(1));',
                '',
                '    let order: Order = serde_json::from_str(r#"{"$class":"org.acme@1.0.0.Order","$timestamp":"2024-01-02T03:04:05.678Z","placed":"2024-01-02T03:04:05.678Z","scans":[]}"#).unwrap();',
                '    assert!(order.shipped.is_none() && order.returns.is_none() && order.schedule.is_none());',
                '',
                '    // The serialized form deserializes again.',
                '    let json = serde_json::to_string(&order).unwrap();',
                '    let again: Order = serde_json::from_str(&json).unwrap();',
                '    assert_eq!(again.placed, order.placed);',
                '}',
                '',
            ].join('\n'));
            // cargo picks up src/main.rs as the crate's binary.
            fs.writeFileSync(path.join(outputDir, 'Cargo.toml'), `${CARGO_TOML}serde_json = "1"\n`);

            try {
                execFileSync('cargo', ['run', '--quiet'], {
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
    });
});
