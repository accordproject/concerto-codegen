#!/bin/sh
# Generate OpenAPI from the corpus and verify each openapi.json lints clean with redocly.
set -eu

CLI_TARGET=OpenApi
TARGET_KEY=openapi
REDOCLY_CONFIG=/etc/redocly.yaml

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    json_files=$(find "$out" -name '*.json' | sort)
    if [ -z "$json_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with redocly lint"
    # shellcheck disable=SC2086
    for json in $json_files; do
        echo "    $json"
        redocly lint "$json" --config "$REDOCLY_CONFIG" --format stylish
    done
done
