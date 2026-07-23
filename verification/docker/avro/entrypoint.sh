#!/bin/sh
# Generate Avro IDL from the corpus and verify each .avdl compiles with avro-tools idl.
set -eu

CLI_TARGET=Avro
TARGET_KEY=avro
AVRO_TOOLS_JAR=/usr/local/share/avro-tools.jar

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    avdl_files=$(find "$out" -name '*.avdl' | sort)
    if [ -z "$avdl_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with avro-tools idl"
    # shellcheck disable=SC2086
    for avdl in $avdl_files; do
        echo "    $avdl"
        java -jar "$AVRO_TOOLS_JAR" idl "$avdl" > /dev/null
    done
done
