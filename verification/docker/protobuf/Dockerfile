ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

RUN apk add --no-cache protobuf protobuf-dev

COPY verification/docker/protobuf/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
