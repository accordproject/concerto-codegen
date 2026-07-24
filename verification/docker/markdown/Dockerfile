ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

# Lint generated Markdown (.md) with markdownlint-cli.
# Config relaxes stylistic rules that generated docs commonly trip.
RUN npm install -g markdownlint-cli@0.44.0

COPY verification/docker/markdown/markdownlint.json /etc/markdownlint.json
COPY verification/docker/markdown/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
