ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

ARG REDOCLY_CLI_VERSION

# OpenAPI validation: redocly lint against the generated openapi.json.
# Package version comes from verification/docker/versions.json.
RUN npm install -g @redocly/cli@${REDOCLY_CLI_VERSION}

COPY verification/docker/openapi/redocly.yaml /etc/redocly.yaml
COPY verification/docker/openapi/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
