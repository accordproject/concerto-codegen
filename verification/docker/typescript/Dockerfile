ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

RUN npm install -g typescript@5.7.2

COPY verification/docker/typescript/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
