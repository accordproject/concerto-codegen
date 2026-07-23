#!/bin/sh
# Generate Vocabulary YAML from the corpus and verify each .voc file has a
# valid vocabulary structure (locale, namespace, declarations) using
# @accordproject/concerto-vocabulary's VocabularyManager.
set -eu

CLI_TARGET=Vocabulary
TARGET_KEY=vocabulary
VALIDATE_JS=/opt/concerto-codegen/verification/docker/vocabulary/validate.js

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    voc_files=$(find "$out" -name '*.voc' | sort)
    if [ -z "$voc_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with concerto-vocabulary"
    # shellcheck disable=SC2086
    for voc in $voc_files; do
        echo "    $voc"
        node "$VALIDATE_JS" "$voc"
    done
done
