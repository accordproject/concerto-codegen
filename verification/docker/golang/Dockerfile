# Pull the Go toolchain from the official Alpine image (golang:1.25-alpine)
# and layer it onto the shared Node-based verify base, which provides the Concerto
# CLI + branch codegen used to generate the Go before `go build`.
ARG BASE_IMAGE=concerto-verify-base:local
FROM golang:1.25-alpine AS golang
FROM ${BASE_IMAGE}

# Copy the Go toolchain from the official image.
COPY --from=golang /usr/local/go /usr/local/go
ENV GOROOT=/usr/local/go \
    GOPATH=/go \
    PATH="/usr/local/go/bin:/go/bin:${PATH}"

COPY verification/docker/golang/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
