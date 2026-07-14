ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

# Well-formed XML check for generated OData CSDL (.csdl).
RUN apk add --no-cache libxml2-utils

COPY verification/docker/odata/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
