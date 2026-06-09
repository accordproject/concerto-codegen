#!/bin/sh
# Generate JSON Schema from the corpus and verify with ajv compile.
set -eu

CLI_TARGET=JSONSchema
TARGET_KEY=jsonschema

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    schema="${out}/schema.json"
    if [ ! -f "$schema" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with ajv"
    ajv compile -s "$schema" --strict=false
done
