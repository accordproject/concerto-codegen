# Concerto CodeGen Development Guide

## ❗ Accord Project Development Guide ❗
We'd love for you to help develop improvements to Concerto technology! Please refer to the [Accord Project Development guidelines][apdev] we'd like you to follow.

## Concerto CodeGen Specific Information

### Development Setup

#### Building Concerto CodeGen

To build Concerto CodeGen, clone the source code repository and install its
dependencies with npm:

```shell
# Clone your Github fork of the repository:
git clone https://github.com/<GITHUB_USERNAME>/concerto-codegen.git

# Go to the Concerto CodeGen directory:
cd concerto-codegen

# Add the main Concerto CodeGen repository as an upstream remote:
git remote add upstream "https://github.com/accordproject/concerto-codegen.git"

# Install node.js dependencies:
npm install
```

See [AGENTS.md](AGENTS.md) for the scripts the repository exposes
(`npm test`, `npm run build`, `npm run test:verify`, ...).

[apdev]: https://github.com/accordproject/techdocs/blob/master/DEVELOPERS.md