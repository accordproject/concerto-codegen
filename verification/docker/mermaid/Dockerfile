ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

ARG MERMAID_VERSION
ARG JSDOM_VERSION

# Syntax check generated Mermaid (.mmd) via mermaid.parse (+ jsdom for Node).
# Install next to validate.js so ESM import resolution works (NODE_PATH is CJS-only).
# Package versions come from verification/docker/versions.json.
WORKDIR /opt/mermaid-verify
RUN npm init -y \
    && npm install mermaid@${MERMAID_VERSION} jsdom@${JSDOM_VERSION}

COPY verification/docker/mermaid/validate.js /opt/mermaid-verify/validate.js
COPY verification/docker/mermaid/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
