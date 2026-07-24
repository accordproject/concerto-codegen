# Codegen Verification Guide

This guide explains how Concerto CodeGen verifies that generated output is valid for every supported target. It covers local Mocha verification tests, the Docker-based generate-and-verify harness, how to run one target or all sixteen, and how to extend the corpus.

## What this verifies

Codegen unit tests check that visitors emit expected text (often via snapshots). Verification goes further: it runs an external compiler, schema checker, or linter against the generated artifacts.

There are two complementary layers:

1. **Local Mocha verification** (`test/verification/`)  
   Runs on your machine with Node and whatever tools are already installed (or shipped as npm deps). Good for day-to-day development.

2. **Docker verification** (`verification/docker/` + `scripts/verification/docker-run.js`)  
   Builds a shared base image that pins this checkout of `concerto-codegen` into the Concerto CLI, then builds a per-target image with the right toolchain and runs generate + verify inside the container. This is what CI runs in `.github/workflows/verify-codegen.yml`.

Both layers use the same idea: generate from a known model, then ask a real tool whether the output is acceptable.

## Prerequisites

### Local Mocha verification

- Node.js 18 or newer (see `engines` in `package.json`)
- Repository dependencies installed with `npm install`
- Peer packages available (install them if your environment does not already provide them):

```bash
npm install --no-save \
  @accordproject/concerto-core@^4.1.3 \
  @accordproject/concerto-util@^4.1.3 \
  @accordproject/concerto-vocabulary@^4.1.3 \
  @accordproject/concerto-metamodel
```

Some targets need host tools (for example `java` for PlantUML and Avro). If a tool is missing, that target's Mocha tests skip with a clear reason instead of failing.

### Docker verification

- Docker Engine available on your PATH (`docker version` should succeed)
- Enough disk for base + target images (several GB if you build every target)
- Network access on first build so images and JARs can be downloaded

On Windows, use Docker Desktop or an equivalent engine. Volume mounts in `docker-run.js` use absolute host paths, so they work from PowerShell as well as bash.

## The sixteen targets

Concerto CodeGen registers sixteen `fromcto` formats in `lib/codegen/codegen.js`. Each one has Docker verification and a matching Mocha verification suite.

| Key | CLI `--target` | Kind | Verification tool | Primary image tooling |
| --- | --- | --- | --- | --- |
| `typescript` | `Typescript` | compiled | `tsc --noEmit` | TypeScript on Node 20 Alpine |
| `jsonschema` | `JSONSchema` | schema | `ajv compile` | AJV on Node 20 Alpine |
| `graphql` | `GraphQL` | schema | `graphql` `buildSchema` | GraphQL.js on Node 20 Alpine |
| `protobuf` | `Protobuf` | schema | `protoc` | Protocol Buffers compiler |
| `csharp` | `CSharp` | compiled | `dotnet build` | .NET SDK 8 on Alpine |
| `rust` | `Rust` | compiled | `cargo check` | Rust toolchain on Alpine |
| `java` | `Java` | compiled | `javac` | Temurin JDK 17 + Jackson annotations |
| `golang` | `GoLang` | compiled | `go build` | Go 1.22 Alpine |
| `odata` | `OData` | schema | `xmllint --noout` | libxml2 |
| `mermaid` | `Mermaid` | schema | `mermaid.parse` | Mermaid + jsdom |
| `xmlschema` | `XMLSchema` | schema | `xmllint --schema` | libxml2 + W3C XML Schema |
| `openapi` | `OpenApi` | schema | `redocly lint` | `@redocly/cli` |
| `avro` | `Avro` | schema | `avro-tools idl` | Java + Apache Avro tools JAR |
| `plantuml` | `PlantUML` | schema | `plantuml -syntax` | JRE + PlantUML JAR |
| `vocabulary` | `Vocabulary` | schema | VocabularyManager | `@accordproject/concerto-vocabulary` |
| `markdown` | `Markdown` | lint | `markdownlint` | `markdownlint-cli` on Node 20 Alpine |

Metadata for Docker targets also lives in `verification/docker/targets.json` (CLI name, base tooling note, tool command, and type).

## Repository layout

```text
verification/
  corpus/
    manifest.json          # Docker corpus cases, env flags, per-target skips
    models/                # CTO files referenced by non-metamodel cases
  docker/
    base/
      Dockerfile           # Shared Node 20 image: deps, CLI, branch codegen
      run-case.sh          # Generate one corpus case via `concerto compile`
    targets.json           # Registry of all verification targets
    <target>/
      Dockerfile           # Toolchain layered on the base image
      entrypoint.sh        # Loop corpus cases: generate, then verify
  templates/               # Shared templates (for example TypeScript tsconfig)
  work-<target>/           # Generated output from Docker runs (gitignored)

scripts/verification/
  docker-run.js            # Local helper: build base, build target(s), run containers

test/verification/
  cases.js                 # Shared Mocha cases (fixture CTO files + skips)
  *.compile.test.js        # Compiled-language verification
  *.validate.test.js       # Schema / lint verification
```

## How Docker verification works

### Shared base image

`verification/docker/base/Dockerfile` starts from `node:20-alpine` and:

1. Installs `jq`
2. Runs `npm ci` for this repository
3. Installs Concerto peer dependencies needed at runtime
4. Installs `@accordproject/concerto-cli` globally
5. Replaces the CLI's nested `concerto-codegen` with a symlink to `/opt/concerto-codegen` so PR branch visitors are what the CLI actually runs
6. Sets `ENABLE_MAP_TYPE=true` and `IMPORT_ALIASING=true`
7. Installs `/usr/local/bin/run-case.sh`

Local builds tag this image as `concerto-verify-base:local`. CI tags it with the commit SHA.

### Per-target image

Each `verification/docker/<target>/Dockerfile` takes:

```dockerfile
ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}
```

It then installs only the tools that target needs and sets `ENTRYPOINT` to that target's `entrypoint.sh`.

### Entrypoint flow

Every entrypoint follows the same pattern:

1. Read case names from `${CORPUS_DIR}/manifest.json` (mounted at `/corpus`)
2. For each case, call `run-case.sh <case> <CLI_TARGET> <target-key> <output-dir>`
3. If generation was skipped or produced no artifacts, continue
4. Otherwise run the target's verifier (compiler, schema tool, or linter)
5. Fail the container if any case fails verification

`run-case.sh` honors per-target `skip` entries in the corpus manifest. Skipped cases print `SKIP ...` and exit successfully so the rest of the target can still pass.

### Volumes

When a container runs:

| Mount | Container path | Mode | Purpose |
| --- | --- | --- | --- |
| `verification/corpus` | `/corpus` | read-only | Manifest and model inputs |
| `verification/work-<target>` | `/work` | read-write | Generated files for inspection |

Failed CI runs upload `verification/work-<target>/` as an artifact so you can inspect what was generated.

## How to run Docker verification

From the repository root:

### All sixteen targets

```bash
npm run verify:docker
```

This is equivalent to:

```bash
node scripts/verification/docker-run.js
```

The script will:

1. Create `verification/work-<target>/` directories
2. Build `concerto-verify-base:local`
3. For each target, build `concerto-verify-<target>:local` and run it
4. Exit non-zero if any target failed (it continues after a failure so you still get later results)

First run is slow because it builds the base image and downloads toolchains. Later runs reuse Docker layer cache.

### One target

```bash
npm run verify:docker:markdown
```

Or any of:

```bash
npm run verify:docker:typescript
npm run verify:docker:jsonschema
npm run verify:docker:graphql
npm run verify:docker:protobuf
npm run verify:docker:csharp
npm run verify:docker:rust
npm run verify:docker:java
npm run verify:docker:golang
npm run verify:docker:odata
npm run verify:docker:mermaid
npm run verify:docker:xmlschema
npm run verify:docker:openapi
npm run verify:docker:avro
npm run verify:docker:plantuml
npm run verify:docker:vocabulary
npm run verify:docker:markdown
```

You can also pass names directly:

```bash
node scripts/verification/docker-run.js markdown plantuml vocabulary
```

Unknown names exit with a list of valid targets.

### Manual Docker commands (same as the helper)

Useful when debugging a single Dockerfile change:

```bash
# 1. Base image
docker build \
  -f verification/docker/base/Dockerfile \
  -t concerto-verify-base:local \
  .

# 2. Target image (example: markdown)
docker build \
  -f verification/docker/markdown/Dockerfile \
  --build-arg BASE_IMAGE=concerto-verify-base:local \
  -t concerto-verify-markdown:local \
  .

# 3. Run generate + verify
mkdir -p verification/work-markdown
docker run --rm \
  -v "$PWD/verification/corpus:/corpus:ro" \
  -v "$PWD/verification/work-markdown:/work" \
  concerto-verify-markdown:local
```

On PowerShell, prefer absolute paths for `-v` if relative mounts misbehave:

```powershell
docker run --rm `
  -v "${PWD}/verification/corpus:/corpus:ro" `
  -v "${PWD}/verification/work-markdown:/work" `
  concerto-verify-markdown:local
```

### Inspecting output

After a run, generated files are under:

```text
verification/work-<target>/<case-name>/
```

For Markdown that is typically `verification/work-markdown/<case>/models.md`.

## How to run local Mocha verification

### All verification tests

```bash
npm run test:verify
```

This runs Mocha against `test/verification` with a 60 second timeout.

### One file

```bash
npx mocha test/verification/markdown.validate.test.js --timeout 60000
```

Examples for other targets:

```bash
npx mocha test/verification/typescript.compile.test.js --timeout 60000
npx mocha test/verification/openapi.validate.test.js --timeout 60000
npx mocha test/verification/plantuml.validate.test.js --timeout 60000
```

### Full unit test suite

```bash
npm test
```

That includes lint, license checks, docs, coverage, and the whole Mocha tree (verification included when those files are under `test/`).

## Corpus and cases

### Docker corpus (`verification/corpus/manifest.json`)

Docker entrypoints only know about cases listed here. Each case can:

- Use `"compile": { "metamodel": true, "offline": true }` to compile the Concerto metamodel
- Or list model files under `models/` (paths relative to `verification/corpus/models/`)
- Declare per-target skips with a human-readable reason

Environment flags at the top of the manifest (for example `ENABLE_MAP_TYPE`) mirror what the base image sets.

Today the checked-in Docker corpus focuses on the `metamodel` case. Expand `cases` and add CTO files under `verification/corpus/models/` when you want broader Docker coverage.

### Mocha cases (`test/verification/cases.js`)

Local tests use a richer case list loaded from `test/codegen/fromcto/data/model/` (for example `hr_base`, `hr_integration`, `stringlength`, `model-base`, `agreement`, `circular`) plus the metamodel setup helper.

Skips are per target:

```js
skip: {
  markdown: 'reason this case is not expected to pass yet',
}
```

Use `getSkipReason(testCase, 'markdown')` so skipped cases become `it.skip` with the reason in the title.

## Target notes (what success looks like)

### Compiled targets

- **typescript**: emit `.ts`, copy `verification/templates/tsconfig.json`, run `tsc --noEmit`
- **csharp**: emit `.cs`, write a temporary `Verify.csproj`, run `dotnet build`
- **rust**: emit into `src/`, rename `mod.rs` to `lib.rs`, write `Cargo.toml`, run `cargo check`
- **java**: emit `.java`, compile with `javac` against Jackson annotations
- **golang**: emit `.go`, fan files into package directories, `go mod init` + `go build ./...`

### Schema / diagram / vocabulary targets

- **jsonschema**: `ajv compile -s schema.json --strict=false`
- **graphql**: `buildSchema` on `model.gql`
- **protobuf**: `protoc` descriptor set build
- **odata**: well-formed XML check on `.csdl`
- **xmlschema**: validate `.xsd` against the W3C XML Schema meta-schema
- **openapi**: `redocly lint` with `verification/docker/openapi/redocly.yaml`
- **avro**: `java -jar avro-tools.jar idl` on each `.avdl`
- **mermaid**: `mermaid.parse` via `verification/docker/mermaid/validate.js`
- **plantuml**: `java -jar plantuml.jar -syntax` on each `.puml`
- **vocabulary**: `VocabularyManager` validation on each `.voc`

### Lint target

- **markdown**: generate `models.md`, then run `markdownlint` with `verification/docker/markdown/markdownlint.json`

The Markdown config keeps useful structural rules enabled, and turns off stylistic rules that generated docs commonly hit today (blank-line spacing, line length, multiple H1s for multi-namespace models, inline `<code>` HTML, table pipe formatting, and similar). Tighten that config over time as the Markdown visitor improves.

## CI

`.github/workflows/verify-codegen.yml` runs on pushes and pull requests to `main`.

- One matrix job per target (`verify-<target>`)
- `fail-fast: false` so one broken target does not hide others
- Builds the base image with Buildx cache, then classic `docker build` for the target so `FROM` resolves against the local daemon image
- On failure, uploads `verification/work-<target>/`

Locally, `npm run verify:docker` is the closest match to that workflow.

## Adding or changing a target

Checklist used for Markdown (and earlier targets):

1. Confirm the visitor is registered in `lib/codegen/codegen.js` `formats`
2. Add `verification/docker/<target>/Dockerfile` and `entrypoint.sh`
3. Register the target in `verification/docker/targets.json`
4. Append the key to `TARGETS` in `scripts/verification/docker-run.js`
5. Add `verify:docker:<target>` in `package.json`
6. Add the target to the matrix in `.github/workflows/verify-codegen.yml`
7. Add `test/verification/<target>.(compile|validate).test.js` sharing `cases.js`
8. Document any host-tool skip behavior for local Mocha runs
9. Update this guide's target table

## Troubleshooting

**`Unknown target(s)` from `docker-run.js`**  
Use a key from the table above. Names are lowercase (`markdown`, not `Markdown`).

**Base image build fails on `npm ci`**  
Make sure you are at the repository root and that `package-lock.json` is present and in sync with `package.json`.

**Target build cannot find `concerto-verify-base:local`**  
Build the base image first, or use `npm run verify:docker:<target>` which always builds base before the target.

**Container passes but Mocha fails (or the reverse)**  
Docker uses the corpus manifest. Mocha uses `test/verification/cases.js`. They are related but not identical. Align skips and fixtures when investigating a mismatch.

**Permission errors writing `verification/work-*`**  
Create the directory first, or re-run via `docker-run.js`, which calls `ensureWorkDirs()`.

**Markdown lint failures after tightening `markdownlint.json`**  
Inspect `verification/work-markdown/<case>/models.md`, compare against the rule id in the markdownlint output, then either fix `MarkdownVisitor` or adjust the config deliberately.

## Quick reference

```bash
# Local verification suite
npm run test:verify

# One local Markdown file
npx mocha test/verification/markdown.validate.test.js --timeout 60000

# All Docker targets
npm run verify:docker

# One Docker target
npm run verify:docker:markdown
```

## License

Accord Project source code files are made available under the Apache License, Version 2.0 (Apache-2.0), located in the LICENSE file. Accord Project documentation files are made available under the Creative Commons Attribution 4.0 International License (CC-BY-4.0), available at http://creativecommons.org/licenses/by/4.0/.
