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

/**
 * Smoke test for what consumers resolve through the `exports` map, run after
 * `npm run build`.
 *
 * The mocha suites load lib/ directly, so nothing else exercises the browser
 * ES module build (dist/esm-browser) that bundlers pick through the `browser`
 * condition, or Node's `import` of the package. Each browser check bundles a
 * small application with esbuild, the way a consumer's bundler would, and runs
 * it in a fresh JavaScript context with none of Node's globals (no `global`,
 * `process`, `Buffer` or `require`), so a Node-only reference fails here
 * instead of in someone's browser.
 *
 * Run with `npm run test:esm`.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { builtinModules, createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import * as esbuild from 'esbuild';

const require = createRequire(import.meta.url);
const packageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserDir = path.join(packageDir, 'dist', 'esm-browser');
const PACKAGE = '@accordproject/concerto-codegen';
const INFER_MODEL = `${PACKAGE}/lib/codegen/fromjson/cto/inferModel`;

const MODEL = `namespace smoke@1.0.0
concept Address {
  o String street
}
concept Person identified by email {
  o String email
  o String name optional
  o Address address
  o DateTime born
}`;

const checks = [];

/**
 * Register a named check.
 *
 * @param {string} name - what the check covers
 * @param {Function} fn - the check body; throws to fail
 */
function check(name, fn) {
    checks.push([name, fn]);
}

/**
 * The export names of a module namespace, without the interop names Node adds
 * when ES modules import CommonJS.
 *
 * @param {object} namespace - a module namespace or exports object
 * @return {string[]} the sorted export names
 */
function namesOf(namespace) {
    return Object.keys(namespace).filter(name => name !== 'default' && name !== 'module.exports').sort();
}

/**
 * Bundles an application for the browser, as a consumer's bundler would.
 *
 * @param {string} contents - the application's entry module
 * @param {object} [options] - extra esbuild options
 * @return {Promise<{code: string, inputs: string[]}>} the bundle, and the
 *     files (relative to the package) that contributed code to it
 */
async function bundle(contents, options = {}) {
    const result = await esbuild.build({
        stdin: { contents, resolveDir: packageDir, loader: 'js' },
        absWorkingDir: packageDir,
        bundle: true,
        platform: 'browser',
        format: 'iife',
        write: false,
        metafile: true,
        logLevel: 'silent',
        ...options,
    });
    // metafile.inputs also lists modules that were parsed and then tree-shaken
    // away, so read what each input contributed to the output instead.
    const [output] = Object.values(result.metafile.outputs);
    return {
        code: result.outputFiles[0].text,
        inputs: Object.entries(output.inputs)
            .filter(([, input]) => input.bytesInOutput > 0)
            .map(([input]) => input.split('\\').join('/')),
    };
}

/**
 * Runs a bundle in a fresh context that has the standard JavaScript built-ins
 * plus the browser APIs the code under test uses, but none of Node's globals.
 *
 * @param {string} code - the bundle
 * @return {object} the value the bundle assigned to globalThis.result
 */
function runInBrowserLikeContext(code) {
    const context = vm.createContext({ console, URL, TextEncoder, TextDecoder, Blob, setTimeout, clearTimeout });
    vm.runInContext(code, context);
    return context.result;
}

check('Node resolves the package to the CommonJS entry point', () => {
    assert.strictEqual(fileURLToPath(import.meta.resolve(PACKAGE)), path.join(packageDir, 'index.js'));
});

check('Node import and require expose the same names', async () => {
    assert.deepStrictEqual(namesOf(await import(PACKAGE)), namesOf(require(PACKAGE)));
});

check('Node resolves the inferModel subpath', () => {
    const inferModel = require(INFER_MODEL);
    assert.match(inferModel('smoke@1.0.0', 'Root', { name: 'x' }), /concept Root/);
});

check('the browser build exposes the same names as the CommonJS entry point', async () => {
    const cjs = require(PACKAGE);
    const esm = await import(pathToFileURL(path.join(browserDir, 'index.mjs')).href);
    assert.deepStrictEqual(namesOf(esm), namesOf(cjs));
    assert.deepStrictEqual(namesOf(esm.CodeGen), namesOf(cjs.CodeGen));
    assert.deepStrictEqual(Object.keys(esm.CodeGen.formats).sort(), Object.keys(cjs.CodeGen.formats).sort());
    assert.deepStrictEqual(namesOf(esm.Common), namesOf(cjs.Common));
    assert.strictEqual(esm.TypescriptVisitor, esm.CodeGen.TypescriptVisitor);
    assert.strictEqual(esm.CodeGen.formats.typescript, esm.TypescriptVisitor);
    assert.strictEqual(esm.DirectedGraph, esm.Common.DirectedGraph);
    assert.strictEqual(esm.version.version, cjs.version.version);
});

check('the browser build has no require calls, Node globals or Node builtin imports', () => {
    const builtins = new Set([...builtinModules, ...builtinModules.map(name => `node:${name}`)]);
    const offenders = [];
    for (const file of fs.readdirSync(browserDir, { recursive: true }).filter(file => file.endsWith('.mjs'))) {
        const source = fs.readFileSync(path.join(browserDir, file), 'utf8');
        if (/\b__require\(/.test(source)) {
            offenders.push(`${file}: __require() call`);
        }
        // `global` and `process` are rewritten to globalThis members by
        // build-esm.js. Comments and string literals are removed before looking.
        const code = esbuild.transformSync(source, { format: 'esm', minifyWhitespace: true, legalComments: 'none' }).code
            .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
        if (/(^|[^.\w$])(global|process)\b(?!\s*:)/.test(code)) {
            offenders.push(`${file}: free global or process`);
        }
        if (source.includes(packageDir) || source.includes(packageDir.split(path.sep).join('/'))) {
            offenders.push(`${file}: contains the local build path`);
        }
        for (const [, specifier] of source.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) {
            if (builtins.has(specifier)) {
                offenders.push(`${file}: imports ${specifier}`);
            }
        }
    }
    assert.deepStrictEqual(offenders, []);
});

check('a bundled application generates code in a browser-like context', async () => {
    const { code, inputs } = await bundle(`
        import { ModelManager } from '@accordproject/concerto-core';
        import { InMemoryWriter } from '@accordproject/concerto-util';
        import { CodeGen, Common, BenchmarkModelGenerator } from '${PACKAGE}';
        import inferModel from '${INFER_MODEL}';

        const modelManager = new ModelManager();
        modelManager.addCTOModel(${JSON.stringify(MODEL)}, 'smoke.cto');
        const generated = {};
        for (const [format, Visitor] of Object.entries(CodeGen.formats)) {
            const fileWriter = new InMemoryWriter();
            modelManager.accept(new Visitor(), { fileWriter });
            generated[format] = [...fileWriter.getFilesInMemory().values()].join('\\n').length;
        }
        const graph = new Common.DirectedGraph();
        modelManager.accept(new Common.ConcertoGraphVisitor(), { graph, createDependencyGraph: true });
        const fromSchema = new CodeGen.JSONSchemaToConcertoVisitor().visit(
            CodeGen.JSONSchemaToConcertoVisitor.parse({ type: 'object', properties: { id: { type: 'string' } } }),
            { metaModelNamespace: 'concerto.metamodel@1.0.0', namespace: 'smoke@1.0.0' });
        globalThis.result = {
            generated,
            typescript: (() => {
                const fileWriter = new InMemoryWriter();
                modelManager.accept(new CodeGen.TypescriptVisitor(), { fileWriter });
                return [...fileWriter.getFilesInMemory().values()].join('');
            })(),
            graphHasPerson: graph.hasVertex('smoke@1.0.0.Person'),
            fromSchemaModels: fromSchema.models.length,
            inferred: inferModel('smoke@1.0.0', 'Root', { name: 'x' }),
            jsonSize: new BenchmarkModelGenerator().jsonSize({ a: 1 }),
        };
    `);
    const ownModules = inputs.filter(input => !input.startsWith('node_modules/') && input !== '<stdin>');
    assert.ok(ownModules.length > 0, 'nothing bundled from this package');
    assert.deepStrictEqual(ownModules.filter(input => !input.startsWith('dist/esm-browser/')), [], 'bundled from outside dist/esm-browser');

    const result = runInBrowserLikeContext(code);
    const empty = Object.entries(result.generated).filter(([, length]) => length === 0).map(([format]) => format);
    assert.deepStrictEqual(empty, [], 'formats that generated nothing');
    assert.match(result.typescript, /interface IPerson/);
    assert.ok(result.graphHasPerson, 'graph has no Person vertex');
    assert.strictEqual(result.fromSchemaModels, 1);
    assert.match(result.inferred, /concept Root/);
    assert.strictEqual(result.jsonSize, 7);
});

// Importing one generator must not pull in the others. The markers are string
// literals the minifier keeps: one from the generator that is imported, and one
// from each of three that are not (ajv is only reached by JSONSchemaToConcertoVisitor).
check('a bundle that imports one generator leaves the others out', async () => {
    const markers = {
        typescript: '/* eslint-disable @typescript-eslint/no-empty-interface */',
        rust: 'use serde::{ Deserialize, Serialize };',
        java: 'import java.util.HashMap;',
        ajv: 'http://json-schema.org/draft-07/schema#',
    };
    const { code, inputs } = await bundle(`import { TypescriptVisitor } from '${PACKAGE}'; console.log(TypescriptVisitor);`, { minify: true });
    const found = Object.keys(markers).filter(name => code.includes(markers[name]));
    assert.deepStrictEqual(found, ['typescript'], `bundled ${found.join(', ')}`);
    assert.ok(!inputs.some(input => input.includes('concerto-vocabulary')), 'concerto-vocabulary was bundled');
});

let failures = 0;
for (const [name, fn] of checks) {
    try {
        await fn();
        console.log(`ok   ${name}`);
    } catch (err) {
        failures++;
        console.error(`FAIL ${name}\n     ${err.message}`);
    }
}

if (failures > 0) {
    console.error(`\n${failures} of ${checks.length} ESM smoke checks failed`);
    process.exit(1);
}
console.log(`\n${checks.length} ESM smoke checks passed`);
