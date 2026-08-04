#!/bin/sh
# Generate PlantUML from the corpus and verify each .puml has valid syntax
# using `java -jar plantuml.jar -syntax`.
set -eu

CLI_TARGET=PlantUML
TARGET_KEY=plantuml
PLANTUML_JAR=/usr/local/share/plantuml.jar

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    puml_files=$(find "$out" -name '*.puml' | sort)
    if [ -z "$puml_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with plantuml -syntax"
    # shellcheck disable=SC2086
    for puml in $puml_files; do
        echo "    $puml"
        result=$(java -jar "$PLANTUML_JAR" -syntax < "$puml")
        if echo "$result" | grep -q '^ERROR'; then
            echo "$result" >&2
            exit 1
        fi
    done
done
