ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

# OpenAPI validation: redocly lint against the generated openapi.json.
RUN npm install -g @redocly/cli@1.34.3

COPY verification/docker/openapi/redocly.yaml /etc/redocly.yaml
COPY verification/docker/openapi/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
