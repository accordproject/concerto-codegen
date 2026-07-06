#!/bin/sh
# Generate Rust from the corpus and verify it compiles with cargo check.
set -eu

CLI_TARGET=Rust
TARGET_KEY=rust

for case_name in $(jq -r '.cases[].name' "${CORPUS_DIR}/manifest.json"); do
    out="${WORK_DIR}/${case_name}"
    mkdir -p "$out"

    # The Rust visitor emits mod.rs (crate root), utils.rs and per-namespace files;
    # generate them straight into the crate's src/ directory.
    run-case.sh "$case_name" "$CLI_TARGET" "$TARGET_KEY" "$out/src"

    if [ ! -f "$out/src/mod.rs" ]; then
        continue
    fi

    echo "==> VERIFY $case_name with cargo check"
    # mod.rs is the crate root; cargo expects it to be named lib.rs.
    mv "$out/src/mod.rs" "$out/src/lib.rs"
    cat > "$out/Cargo.toml" <<'EOF'
[package]
name = "verify"
version = "0.1.0"
edition = "2021"

[lib]
path = "src/lib.rs"

[dependencies]
serde = { version = "1", features = ["derive"] }
chrono = { version = "0.4", features = ["serde"] }
EOF
    (cd "$out" && cargo check --quiet)
done
