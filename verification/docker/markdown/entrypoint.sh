#!/bin/sh
# Generate Markdown from the corpus and verify each .md lints clean with markdownlint.
set -eu

CLI_TARGET=Markdown
TARGET_KEY=markdown
MARKDOWNLINT_CONFIG=/etc/markdownlint.json

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    md_files=$(find "$out" -name '*.md' | sort)
    if [ -z "$md_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with markdownlint"
    # shellcheck disable=SC2086
    for md in $md_files; do
        echo "    $md"
        markdownlint -c "$MARKDOWNLINT_CONFIG" "$md"
    done
done
