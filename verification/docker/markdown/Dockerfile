ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

ARG MARKDOWNLINT_CLI_VERSION

# Lint generated Markdown (.md) with markdownlint-cli.
# Config relaxes stylistic rules that generated docs commonly trip.
# Package version comes from verification/docker/versions.json.
RUN npm install -g markdownlint-cli@${MARKDOWNLINT_CLI_VERSION}

COPY verification/docker/markdown/markdownlint.json /etc/markdownlint.json
COPY verification/docker/markdown/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
