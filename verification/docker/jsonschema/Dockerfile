ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

RUN npm install -g ajv-cli@5

COPY verification/docker/jsonschema/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
