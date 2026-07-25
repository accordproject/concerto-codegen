ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

ARG GRAPHQL_VERSION

# Package version comes from verification/docker/versions.json.
RUN npm install -g graphql@${GRAPHQL_VERSION}

COPY verification/docker/graphql/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
