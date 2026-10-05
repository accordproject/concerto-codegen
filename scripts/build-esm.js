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

/*
 * Emits the ES module build that the `browser` export condition points at:
 *
 *   dist/esm-browser/index.mjs   the package entry point
 *   dist/esm-browser/lib/...     one module per CommonJS module under lib/
 *
 * Node keeps loading the CommonJS sources (index.js and lib/) for both `import`
 * and `require`, so there is a single copy of each class in a Node process.
 *
 * The layout follows Concerto's scripts/build-esm.js. Run it with
 * `npm run build:esm`.
 */

const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');
const esbuild = require('esbuild');

const packageDir = path.join(__dirname, '..');
const libDir = path.join(packageDir, 'lib');
const outdir = path.join(packageDir, 'dist', 'esm-browser');
const packageJson = require(path.join(packageDir, 'package.json'));
const peerDependencies = Object.keys(packageJson.peerDependencies || {});

/**
 * Every module under lib/ is an entry point, so each one becomes its own output
 * module and a consumer's bundler can drop the generators it never reaches.
 * Code shared between them is hoisted into chunks.
 *
 * @param {string} dir - directory to scan
 * @param {string[]} found - accumulator
 * @return {string[]} absolute paths of the modules under dir
 */
function collectEntryPoints(dir, found = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectEntryPoints(entryPath, found);
        } else if (entry.name.endsWith('.js')) {
            found.push(entryPath);
        }
    }
    return found;
}

/**
 * Lists the names a CommonJS module reads from a peer dependency. lib/ uses two
 * forms, `require('peer').Name` and `const { A, B } = require('peer')`; any
 * other form fails the build rather than silently importing the whole package.
 *
 * @param {string} file - the requiring module
 * @param {string} peer - the peer dependency
 * @return {string[]} the names read from the peer
 */
function namesRequiredFrom(file, peer) {
    const source = fs.readFileSync(file, 'utf8');
    const call = `require\\(\\s*['"]${peer.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}['"]\\s*\\)`;
    const names = new Set();
    let recognised = 0;
    for (const match of source.matchAll(new RegExp(`${call}\\.(\\w+)`, 'g'))) {
        names.add(match[1]);
        recognised++;
    }
    for (const match of source.matchAll(new RegExp(`\\{([^{}]*)\\}\\s*=\\s*${call}`, 'g'))) {
        match[1].split(',').map(name => name.split(':')[0].trim()).filter(Boolean).forEach(name => names.add(name));
        recognised++;
    }
    const total = [...source.matchAll(new RegExp(call, 'g'))].length;
    if (total !== recognised) {
        throw new Error(`${path.relative(packageDir, file)}: require('${peer}') must be followed by .Name or destructured`);
    }
    return [...names].sort();
}

// The peer dependencies (concerto-core, -util, -vocabulary) stay external so the
// application keeps a single copy of Concerto. lib/ requires them, and esbuild
// turns a require() of an external package into a __require() call that throws
// in a browser. Instead, each require is routed through a small ES module that
// re-exports only the names that file reads, so the output carries a real
// `import { ModelUtil } from '@accordproject/concerto-core'` that the
// consumer's bundler resolves and can tree-shake.
const peerRequirePlugin = {
    name: 'peer-require',
    setup(build) {
        build.onResolve({ filter: /^@accordproject\// }, args => {
            if (!peerDependencies.some(peer => args.path === peer || args.path.startsWith(`${peer}/`))) {
                return undefined;
            }
            if (args.kind === 'require-call' && peerDependencies.includes(args.path)) {
                // One shim per requiring file, since each reads different names.
                // The path ends up in the output, so it is relative to the package.
                const importer = path.relative(packageDir, args.importer).split(path.sep).join('/');
                return { path: `${args.path}|${importer}`, namespace: 'peer-require' };
            }
            return { path: args.path, external: true };
        });
        build.onLoad({ filter: /.*/, namespace: 'peer-require' }, args => {
            const [peer, importer] = args.path.split('|');
            return {
                contents: `export { ${namesRequiredFrom(path.join(packageDir, importer), peer).join(', ')} } from '${peer}';`,
                loader: 'js',
                resolveDir: packageDir,
            };
        });
    },
};

// lib/ uses two Node builtins. They get small browser versions that cover what
// lib/ reads, instead of the util and buffer polyfills the UMD bundle carried.
// Any other builtin becomes an empty module, as in Concerto's browser build.
const builtinShims = {
    // Only used to describe a value in an "Unrecognised type" error message.
    util: 'module.exports = { inspect: value => { try { return JSON.stringify(value); } catch (err) { return String(value); } } };',
    // BenchmarkModelGenerator measures model sizes with Blob, which browsers provide.
    buffer: 'module.exports = { Blob: globalThis.Blob };',
};
const builtinSpecifiers = new Set([...builtinModules, ...builtinModules.map(name => `node:${name}`)]);
const builtinShimPlugin = {
    name: 'builtin-shim',
    setup(build) {
        build.onResolve({ filter: /^(node:)?[a-z_]+$/ }, args => (
            builtinSpecifiers.has(args.path) ? { path: args.path.replace(/^node:/, ''), namespace: 'builtin-shim' } : undefined
        ));
        build.onLoad({ filter: /.*/, namespace: 'builtin-shim' }, args => ({
            contents: builtinShims[args.path] || 'module.exports = {};',
            loader: 'js',
        }));
    },
};

/**
 * Writes the ES module entry points over the per-module outputs, mirroring the
 * shape of index.js: the CodeGen and Common namespaces, version, and the named
 * generator exports. The shape is read from index.js itself, so a generator
 * added to lib/codegen/codegen.js and index.js appears here without edits.
 *
 * These files are written rather than bundled. Bundling them would hoist every
 * generator's initialisation into one shared chunk, which a consumer's bundler
 * then has to keep in full.
 */
function writeEntryPoints() {
    const index = require(path.join(packageDir, 'index.js'));

    // Map each lib/ module's exports back to the module that defines it.
    const modules = new Map();
    for (const [file, cached] of Object.entries(require.cache)) {
        if (file.startsWith(libDir + path.sep)) {
            modules.set(cached.exports, file);
        }
    }
    const specifierOf = file => `./${path.relative(packageDir, file).split(path.sep).join('/').replace(/\.js$/, '.mjs')}`;

    const namespaces = Object.keys(index).filter(key => modules.has(index[key]) && index[key].constructor === Object);
    for (const namespace of namespaces) {
        const lines = [];
        const local = new Map();
        const members = Object.entries(index[namespace]);
        for (const [name, value] of members) {
            if (modules.has(value)) {
                lines.push(`import ${name} from '${specifierOf(modules.get(value))}';`);
                local.set(value, name);
            } else if (typeof value === 'function') {
                // The defining module, not an aggregator such as common.js.
                const owner = [...modules.entries()].find(([exports]) => exports && exports[name] === value &&
                    !namespaces.some(candidate => index[candidate] === exports));
                if (!owner) {
                    throw new Error(`${namespace}.${name} is not exported by a module under lib/`);
                }
                const ownerLocal = `${path.basename(owner[1], '.js')}$`;
                if (!lines.includes(`import ${ownerLocal} from '${specifierOf(owner[1])}';`)) {
                    lines.push(`import ${ownerLocal} from '${specifierOf(owner[1])}';`);
                }
                lines.push(`const ${name} = ${ownerLocal}.${name};`);
                local.set(value, name);
            }
        }
        const exported = members.filter(([, value]) => local.has(value)).map(([name]) => name);
        lines.push(`export { ${exported.join(', ')} };`);
        for (const [name, value] of members.filter(([, value]) => !local.has(value))) {
            const entries = Object.entries(value).map(([key, member]) => {
                if (!local.has(member)) {
                    throw new Error(`${namespace}.${name}.${key} is not one of the ${namespace} members`);
                }
                return `${key}: ${local.get(member)}`;
            });
            lines.push(`export const ${name} = { ${entries.join(', ')} };`);
        }
        fs.writeFileSync(path.join(outdir, `${namespace}.mjs`), `${lines.join('\n')}\n`);
    }

    const lines = namespaces.map(namespace => `export * as ${namespace} from './${namespace}.mjs';`);
    for (const [name, value] of Object.entries(index)) {
        if (namespaces.includes(name)) {
            continue;
        }
        if (value === packageJson) {
            lines.push(`export const ${name} = ${JSON.stringify(packageJson)};`);
            continue;
        }
        const namespace = namespaces.find(candidate => index[candidate][name] === value);
        if (!namespace) {
            throw new Error(`index.js export ${name} is not a member of ${namespaces.join(' or ')}`);
        }
        lines.push(`export { ${name} } from './${namespace}.mjs';`);
    }
    fs.writeFileSync(path.join(outdir, 'index.mjs'), `${lines.join('\n')}\n`);
}

/**
 * Builds dist/esm-browser.
 */
async function main() {
    // Chunk names are content hashes, so stale chunks from an earlier build
    // would otherwise accumulate and be published.
    fs.rmSync(outdir, { recursive: true, force: true });
    await esbuild.build({
        entryPoints: collectEntryPoints(libDir),
        outdir,
        outbase: packageDir,
        bundle: true,
        splitting: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        sourcemap: true,
        logLevel: 'warning',
        // Third-party dependencies are bundled, as in Concerto's browser build:
        // lib/ requires them, and their CommonJS exports (debug, camelcase,
        // pluralize export a function) cannot be re-exported as ES modules.
        plugins: [peerRequirePlugin, builtinShimPlugin],
        define: {
            // lib/ tests `global === undefined` at load time; browsers have no `global`.
            global: 'globalThis',
            // Bind `process` (read, guarded, by debug) so that downstream bundlers
            // do not inject a process polyfill into these modules.
            process: 'globalThis.process',
        },
        // The package has no "type": "module", so ES modules need the .mjs
        // extension. esbuild rewrites the relative specifiers it emits to match.
        outExtension: { '.js': '.mjs' },
    });
    writeEntryPoints();
}

main().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
