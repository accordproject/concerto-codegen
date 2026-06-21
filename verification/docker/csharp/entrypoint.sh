#!/bin/sh
# Generate C# from the corpus and verify with dotnet build.
set -eu

CLI_TARGET=CSharp
TARGET_KEY=csharp
CSPROJ_TEMPLATE=/opt/concerto-codegen/verification/templates/Verify.csproj

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    if [ ! -d "$out" ] || [ -z "$(find "$out" -name '*.cs' -print -quit 2>/dev/null)" ]; then
        continue
    fi

    cp "$CSPROJ_TEMPLATE" "$out/Verify.csproj"

    echo "==> VERIFY $case_name with dotnet build"
    dotnet build "$out/Verify.csproj" --nologo -v q
done
