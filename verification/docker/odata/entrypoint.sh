#!/bin/sh
# Generate OData CSDL from the corpus and verify each .csdl is well-formed XML.
set -eu

CLI_TARGET=OData
TARGET_KEY=odata

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    csdl_files=$(find "$out" -name '*.csdl' | sort)
    if [ -z "$csdl_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with xmllint"
    # shellcheck disable=SC2086
    for csdl in $csdl_files; do
        echo "    $csdl"
        xmllint --noout "$csdl"
    done
done
