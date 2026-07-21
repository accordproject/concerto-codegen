ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

# Avro IDL validation via the official Apache avro-tools jar (idl -> Avro Protocol).
RUN apk add --no-cache openjdk17-jre-headless curl \
    && curl -fsSL -o /usr/local/share/avro-tools.jar \
        https://archive.apache.org/dist/avro/avro-1.12.0/java/avro-tools-1.12.0.jar

COPY verification/docker/avro/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
