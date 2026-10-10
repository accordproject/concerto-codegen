# Migrating to concerto-codegen 7.0.0

7.0.0 publishes an ES module build for browsers, selects it through an `exports` map
in `package.json`, and removes the webpack UMD bundle. This was done under
[template-engine#185](https://github.com/accordproject/template-engine/issues/185)
so that browser applications ship only the generators they use, and share one copy
of Concerto with the rest of the application. The layout follows Concerto 5.0.0
([concerto#1306](https://github.com/accordproject/concerto/pull/1306)).

**Who is affected:** almost nobody. If your code imports the package by its name,
`require('@accordproject/concerto-codegen')` or
`import { CodeGen } from '@accordproject/concerto-codegen'`, nothing changes. You are
only affected if you import a file inside the package, or load the UMD bundle with a
`<script>` tag.

## Am I affected?

Run these against your own codebase. Anything they print is worth checking against the
sections below.

```bash
# Imports of files inside the package
grep -rnE "@accordproject/concerto-codegen/(lib|umd|types)/" .

# The UMD bundle loaded from a CDN or a copied file
grep -rn "concerto-codegen.js" .
```

## What changed

| | 6.x | 7.0.0 |
| --- | --- | --- |
| Node, `require()` | `index.js` | `index.js` (unchanged) |
| Node, `import` | `index.js` | `index.js` (unchanged) |
| Bundlers targeting the web (webpack 5, Vite, Rollup, esbuild) | `umd/concerto-codegen.js`, through the `browser` field | `dist/esm-browser/index.mjs`, through the `browser` condition of `exports` |
| Files inside the package | importable | not importable, except `lib/codegen/fromjson/cto/inferModel` |
| `<script>` tag | `umd/concerto-codegen.js` | removed |

The package API is unchanged: `CodeGen`, `Common` and `version` export the same
members as before. Each generator is now also exported by name, for example
`import { TypescriptVisitor } from '@accordproject/concerto-codegen'`. These are the
same classes as `CodeGen.TypescriptVisitor`.

The browser build imports `@accordproject/concerto-core`, `@accordproject/concerto-util`
and `@accordproject/concerto-vocabulary` from your application, instead of carrying its
own copies as the UMD bundle did. They are already peer dependencies, so your
application provides them.

## Breaking changes

### Files inside the package no longer resolve

**Before (6.x):**

```js
const TypescriptVisitor = require('@accordproject/concerto-codegen/lib/codegen/fromcto/typescript/typescriptvisitor');
```

**After (7.0.0)** this fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`, because the
`exports` map only lists the package root, `./package.json` and
`./lib/codegen/fromjson/cto/inferModel`. Import from the package root instead:

```js
const { TypescriptVisitor } = require('@accordproject/concerto-codegen');
// or
import { TypescriptVisitor } from '@accordproject/concerto-codegen';
```

`@accordproject/concerto-codegen/lib/codegen/fromjson/cto/inferModel` keeps working,
in Node and in bundlers.

### The UMD bundle is removed

**Before (6.x):** the package published a webpack UMD bundle at
`umd/concerto-codegen.js` and pointed the `browser` field of `package.json` at it.

**After (7.0.0):** the bundle, the `browser` field, and webpack are removed.

- **Bundler users** (webpack 5+, Vite, Rollup, esbuild): nothing to do. These read the
  `exports` map and take `dist/esm-browser`. If your bundler config added Node
  polyfills (`buffer`, `util`, `process`, `global`) only for concerto-codegen, you can
  remove them.
- **`<script>` tag users:** there is no drop-in replacement. Bundle the package into
  your application with one of the bundlers above. `dist/esm-browser` imports Concerto
  by package name, so it cannot be loaded from a `<script type="module">` tag on its
  own.

## Recommended migration path

1. Import from the package root, `@accordproject/concerto-codegen`, rather than from
   files inside it.
2. In browser applications, import the generators you use by name
   (`import { TypescriptVisitor } from '@accordproject/concerto-codegen'`). webpack
   and Vite also drop unused generators when you use `CodeGen.TypescriptVisitor`, but
   esbuild only does with named imports.
