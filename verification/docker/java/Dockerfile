# Pull the JDK from the official Alpine image (eclipse-temurin:17-jdk-alpine)
# and layer it onto the shared Node-based verify base, which provides the Concerto
# CLI + branch codegen used to generate the Java before `javac`.
ARG BASE_IMAGE=concerto-verify-base:local
FROM eclipse-temurin:17-jdk-alpine AS jdk
FROM ${BASE_IMAGE}

COPY --from=jdk /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk \
    PATH="/opt/java/openjdk/bin:${PATH}"

RUN apk add --no-cache wget \
    && wget -q -O /opt/jackson-annotations.jar \
    https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-annotations/2.17.2/jackson-annotations-2.17.2.jar

COPY verification/docker/java/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
