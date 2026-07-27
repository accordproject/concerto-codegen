# Pull the Go toolchain from the official Alpine image and layer it onto the
# shared Node-based verify base, which provides the Concerto CLI + branch codegen
# used to generate the Go before `go build`.
# Toolchain versions come from verification/docker/versions.json.
ARG BASE_IMAGE=concerto-verify-base:local
ARG GOLANG_IMAGE
FROM ${GOLANG_IMAGE} AS golang
FROM ${BASE_IMAGE}

# Copy the Go toolchain from the official image.
COPY --from=golang /usr/local/go /usr/local/go
ENV GOROOT=/usr/local/go \
    GOPATH=/go \
    PATH="/usr/local/go/bin:/go/bin:${PATH}"

COPY verification/docker/golang/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
