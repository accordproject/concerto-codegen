#!/bin/sh
# Generate code for one corpus case using the Concerto CLI.
# Usage: run-case.sh <case-name> <cli-target> <target-key> <output-dir>
set -eu

CASE_NAME="$1"
CLI_TARGET="$2"
TARGET_KEY="$3"
OUTPUT="$4"

MANIFEST="${CORPUS_DIR}/manifest.json"
CASE_JSON="$(jq -c --arg n "$CASE_NAME" '.cases[] | select(.name == $n)' "$MANIFEST")"

if [ -z "$CASE_JSON" ]; then
    echo "ERROR: unknown case '$CASE_NAME'" >&2
    exit 1
fi

SKIP="$(echo "$CASE_JSON" | jq -r --arg t "$TARGET_KEY" '.skip[$t] // empty')"
if [ -n "$SKIP" ]; then
    echo "SKIP $CASE_NAME ($TARGET_KEY): $SKIP"
    exit 0
fi

mkdir -p "$OUTPUT"

CMD="concerto compile --target $CLI_TARGET --output $OUTPUT"

if [ "$(echo "$CASE_JSON" | jq -r '.compile.offline // false')" = "true" ]; then
    CMD="$CMD --offline"
fi

if [ "$(echo "$CASE_JSON" | jq -r '.compile.metamodel // false')" = "true" ]; then
    CMD="$CMD --metamodel"
else
    for model in $(echo "$CASE_JSON" | jq -r '.models[]'); do
        CMD="$CMD --model ${CORPUS_DIR}/models/${model}"
    done
fi

echo "==> GENERATE $CASE_NAME -> $CLI_TARGET"
eval "$CMD"
