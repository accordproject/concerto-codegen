#!/bin/sh
# Generate XML Schema from the corpus and verify each .xsd with xmllint --schema.
set -eu

CLI_TARGET=XMLSchema
TARGET_KEY=xmlschema
XSD_META_SCHEMA=/usr/local/share/XMLSchema.xsd

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    xsd_files=$(find "$out" -name '*.xsd' | sort)
    if [ -z "$xsd_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with xmllint --schema"
    # shellcheck disable=SC2086
    for xsd in $xsd_files; do
        echo "    $xsd"
        xmllint --noout --schema "$XSD_META_SCHEMA" "$xsd"
    done
done
