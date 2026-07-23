ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

# Syntax check generated Mermaid (.mmd) via mermaid.parse (+ jsdom for Node).
# Install next to validate.js so ESM import resolution works (NODE_PATH is CJS-only).
WORKDIR /opt/mermaid-verify
RUN npm init -y \
    && npm install mermaid@11.12.0 jsdom@25.0.1

COPY verification/docker/mermaid/validate.js /opt/mermaid-verify/validate.js
COPY verification/docker/mermaid/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
