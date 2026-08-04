#!/bin/sh
# Generate GraphQL from the corpus and verify SDL with graphql buildSchema.
set -eu

CLI_TARGET=GraphQL
TARGET_KEY=graphql

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    schema="${out}/model.gql"
    if [ ! -f "$schema" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with graphql"
    NODE_PATH="$(npm root -g)" node -e '
        const fs = require("fs");
        const { buildSchema } = require("graphql");
        buildSchema(fs.readFileSync(process.argv[1], "utf8"));
    ' "$schema"
done
