ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

# XML Schema validation: xmllint --schema against the W3C XML Schema for Schemas.
RUN apk add --no-cache libxml2-utils curl \
    && curl -fsSL -o /usr/local/share/XMLSchema.xsd http://www.w3.org/2001/XMLSchema.xsd

COPY verification/docker/xmlschema/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
