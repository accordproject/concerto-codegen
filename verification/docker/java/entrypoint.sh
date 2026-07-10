#!/bin/sh
# Generate Java from the corpus and verify it compiles with javac.
set -eu

CLI_TARGET=Java
TARGET_KEY=java
JACKSON="${JACKSON_JAR:-/opt/jackson-annotations.jar}"

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    java_files=$(find "$out" -name '*.java' | sort)
    if [ -z "$java_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with javac"
    # shellcheck disable=SC2086
    javac -cp "$JACKSON" $java_files
done
