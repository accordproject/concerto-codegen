#!/bin/sh
# Generate C# from the corpus and verify it compiles with dotnet build.
set -eu

CLI_TARGET=CSharp
TARGET_KEY=csharp

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out"

    cs_files=$(find "$out" -name '*.cs' | sort)
    if [ -z "$cs_files" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with dotnet build"
    cat > "$out/Verify.csproj" <<'EOF'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
EOF
    dotnet build "$out/Verify.csproj" --nologo
done
