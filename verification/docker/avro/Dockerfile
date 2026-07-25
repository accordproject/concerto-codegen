ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

ARG AVRO_TOOLS_VERSION

# Avro IDL validation via the official Apache avro-tools jar (idl -> Avro Protocol).
# Jar version comes from verification/docker/versions.json.
RUN apk add --no-cache openjdk17-jre-headless curl \
    && curl -fsSL -o /usr/local/share/avro-tools.jar \
        https://archive.apache.org/dist/avro/avro-${AVRO_TOOLS_VERSION}/java/avro-tools-${AVRO_TOOLS_VERSION}.jar

COPY verification/docker/avro/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
