ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

RUN npm install -g graphql@16

COPY verification/docker/graphql/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
