ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

ENV CSHARP_USE_CONCERTO_RUNTIME=false

RUN apk add --no-cache dotnet8-sdk

COPY verification/docker/csharp/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
