#!/bin/sh
# Generate TypeScript from the corpus and verify with tsc --noEmit.
set -eu

CLI_TARGET=Typescript
TARGET_KEY=typescript
TSCONFIG_TEMPLATE=/opt/concerto-codegen/verification/templates/tsconfig.json

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    if [ ! -d "$out" ] || [ -z "$(find "$out" -name '*.ts' -print -quit 2>/dev/null)" ]; then
        continue
    fi

    cp "$TSCONFIG_TEMPLATE" "$out/tsconfig.json"

    echo "==> VERIFY $case_name with tsc"
    tsc -p "$out/tsconfig.json" --noEmit
done
