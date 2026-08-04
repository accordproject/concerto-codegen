#!/bin/sh
# Generate Protobuf from the corpus and verify with protoc.
set -eu

CLI_TARGET=Protobuf
TARGET_KEY=protobuf

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    proto_files=$(find "$out" -name '*.proto' | sort)
    if [ -z "$proto_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with protoc"
    # shellcheck disable=SC2086
    protoc -I"$out" -I/usr/include --descriptor_set_out=/dev/null $proto_files
done
