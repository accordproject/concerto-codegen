ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

ARG AJV_CLI_VERSION

# Package version comes from verification/docker/versions.json.
RUN npm install -g ajv-cli@${AJV_CLI_VERSION}

COPY verification/docker/jsonschema/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
