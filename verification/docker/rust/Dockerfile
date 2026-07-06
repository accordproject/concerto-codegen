# Pull the Rust toolchain from the official Alpine image (proposal: rust:alpine)
# and layer it onto the shared Node-based verify base, which provides the Concerto
# CLI + branch codegen used to generate the Rust before `cargo check`.
ARG BASE_IMAGE=concerto-verify-base:local
FROM rust:alpine AS rust
FROM ${BASE_IMAGE}

# Build tools required to compile crates (serde derive proc-macros, etc.) on Alpine (musl).
RUN apk add --no-cache gcc musl-dev

# Copy the Rust toolchain from the official image.
COPY --from=rust /usr/local/rustup /usr/local/rustup
COPY --from=rust /usr/local/cargo /usr/local/cargo
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH="/usr/local/cargo/bin:${PATH}"

COPY verification/docker/rust/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
