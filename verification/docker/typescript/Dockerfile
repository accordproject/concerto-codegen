ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

ARG TYPESCRIPT_VERSION

# Package version comes from verification/docker/versions.json.
RUN npm install -g typescript@${TYPESCRIPT_VERSION}

COPY verification/docker/typescript/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
