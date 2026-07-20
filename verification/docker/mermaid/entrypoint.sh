#!/bin/sh
# Generate Mermaid from the corpus and verify each .mmd parses.
set -eu

CLI_TARGET=Mermaid
TARGET_KEY=mermaid

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    mmd_files=$(find "$out" -name '*.mmd' | sort)
    if [ -z "$mmd_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with mermaid.parse"
    # shellcheck disable=SC2086
    for mmd in $mmd_files; do
        echo "    $mmd"
        node /opt/mermaid-verify/validate.js "$mmd"
    done
done
