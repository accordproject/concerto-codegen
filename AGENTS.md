# Agent Guidelines for Concerto CodeGen

Guidelines for AI coding agents, and the people using them, contributing to
`@accordproject/concerto-codegen`. They come from reviewers' feedback on recent pull
requests. Read [README.md](README.md) and
[verification/VERIFICATION.md](verification/VERIFICATION.md) as well.

## What this repo is

The repo turns Concerto models (`.cto`) into code and schemas for other languages and
formats, and turns JSON Schema and OpenAPI into Concerto models.

| Path | What it holds |
| --- | --- |
| `lib/codegen/fromcto/<target>/` | One visitor per output format (TypeScript, Java, C#, Rust, GraphQL, ...) |
| `lib/codegen/fromJsonSchema/`, `lib/codegen/fromOpenApi/`, `lib/codegen/fromjson/` | Generators that produce Concerto models |
| `lib/codegen/codegen.js` | Registers every visitor and the `formats` map |
| `index.js`, `types/index.d.ts` | The public API, and its type declarations |
| `test/codegen/` | Unit tests per visitor, and the snapshots in `__snapshots__/codegen.js.snap` |
| `test/verification/` | Checks the generated output with each target's real tool (`tsc`, `protoc`, `cargo check`, ...) |
| `verification/` | Docker verification: the corpus, the per-target images, pinned tool versions |
| `types/` | Generated `.d.ts` files, built from the JSDoc in `lib/` |

## Before you open a pull request

1. **Run `npm test`, not only `npm run test:verify`.** `npm test` runs lint
   (eslint, lockfile-lint, syncpack), the licence-header check, JSDoc, and the whole
   unit and verification suite. Fix every lint error, including unused variables and
   trailing spaces.
2. **Check the output with the target's real tool** whenever you change a visitor. The
   verification tests do this for you if the tool is installed; otherwise run
   `npm run verify:docker:<target>`, which needs Docker.
3. **Update snapshots on purpose.** Run `npm run test:updateSnapshots`, then read every
   change in `codegen.js.snap`. Each changed line should follow from your fix.
4. **Say what you ran** in the PR description: the commands, the number of passing
   tests, and which verification targets you checked.

## Changing a visitor

- **Fix the cause in the visitor, not the symptom in one output.** If the same mistake
  appears in several targets, say so in the PR, and fix it in each visitor or list the
  ones you left for follow-ups.
- **Keep declarations as named types.** Concepts, enums and other declarations become
  named types in the target language. Helpers that map scalar and primitive types are
  for those types only; don't route declarations through them.
- **Explain any change whose reason isn't obvious** with a comment in the code or a
  note in the PR. Reviewers will ask otherwise.
- **Add a unit test** in `test/codegen/fromcto/<target>/` for the case you fixed, as
  well as updating snapshots.
- **Update verification skips** when your change alters which cases pass. Skip reasons
  live in `test/verification/cases.js` (Mocha) and `verification/corpus/manifest.json`
  (Docker). Remove a skip your fix makes unnecessary. If a case still fails for
  another reason, change the reason to the failure it hits now.

## Public API

- **Export from the package root.** Add new public functions and classes to `index.js`,
  with a matching declaration in `types/index.d.ts`. Don't add deep paths into `lib/`
  to the `exports` map in `package.json`: that makes an internal file location public
  API that every later release must keep.
- **Keep the export test current.** `test/index.js` checks that the package exports
  nothing other than an expected list; add your export to that list.
- **Breaking changes** need a `!` in the commit type (`feat!:`, `fix!:`) and a section
  in [MIGRATION.md](MIGRATION.md) that tells users how to tell whether they are
  affected and what to change.
- **When a PR involves design choices** that a maintainer should decide (a new public
  export, a changed default, dropping a build output), list them as numbered questions
  in the PR description, with what you chose and why.

## Generated files and scope

- **Keep each PR to one change.** Don't include unrelated formatting, refactoring or
  generated files.
- **`types/` is generated** by `npm run build:types`. Regenerate it and commit the
  result only when you change the JSDoc or the signature of something public. Don't
  commit other changes to `types/`: release PRs regenerate it.
- **Don't hand-edit `package-lock.json`.** Change dependencies with `npm install`, and
  commit only the lockfile changes your dependency change causes.

## Dependencies

- **Pin exact versions** for `dependencies` and `devDependencies` (no `^` or `~`).
  Peer dependencies use a caret range. `npm run lint:deps` (syncpack) enforces both.
- **Concerto is a peer dependency.** When you change the supported Concerto range,
  also update the pins in `verification/docker/versions.json` and the install commands
  in `verification/VERIFICATION.md`, or Docker verification fails to install.
- **Test fixtures can depend on the Concerto version.** Some expected outputs (for
  example `test/codegen/fromOpenApi/cto/data/fullStripeConcertoModel.cto`) come from
  Concerto's printer, and change between Concerto releases. If you support more than
  one Concerto major version, test against each.
- **Match versions across Accord Project repos.** When the same build tool appears in
  a sibling repo for the same purpose (for example `esbuild` in `markdown-transform`),
  use the same version.

## Commits and pull requests

- Commit messages and PR titles use the
  [Accord Project format](https://github.com/accordproject/techdocs/blob/master/DEVELOPERS.md#commit-message-format):
  `type(scope): description`, where the scope is the target (`fix(avro): ...`,
  `feat(csharp): ...`). Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
  `test`, `chore`.
- Every commit needs a DCO sign-off (`git commit --signoff`) whose name and email match
  the commit author.
- Fill in the [pull request template](.github/pull_request_template.md), and link
  the issue the PR closes.
- If this is your first contribution, the CI workflows wait for a maintainer to
  approve them. That's expected; ask once in the PR.
- New source files start with the Apache 2.0 header in [HEADER](HEADER), as the
  existing ones do. `npm run licchk` checks the files in `lib/`.
