#!/bin/sh
# Generate Go from the corpus and verify it compiles with go build.
set -eu

CLI_TARGET=GoLang
TARGET_KEY=golang

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    go_files=$(find "$out" -maxdepth 1 -name '*.go' | sort)
    if [ -z "$go_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with go build"

    # The Go visitor emits one file per Concerto namespace, each declaring its
    # own package, flat into the output directory. Go requires one package per
    # directory, so fan each file out into a subdirectory named after its package.
    for f in $go_files; do
        pkg="$(awk '/^package /{print $2; exit}' "$f")"
        mkdir -p "$out/$pkg"
        mv "$f" "$out/$pkg/"
    done

    (cd "$out" && go mod init verify >/dev/null 2>&1 && go build ./...)
done
