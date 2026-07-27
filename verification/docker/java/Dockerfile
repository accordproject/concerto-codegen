# Pull the JDK from the official Alpine image and layer it onto the shared
# Node-based verify base, which provides the Concerto CLI + branch codegen
# used to generate the Java before `javac`.
# Toolchain / jar versions come from verification/docker/versions.json.
ARG BASE_IMAGE=concerto-verify-base:local
ARG JDK_IMAGE
FROM ${JDK_IMAGE} AS jdk
FROM ${BASE_IMAGE}

ARG JACKSON_ANNOTATIONS_VERSION

COPY --from=jdk /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk \
    PATH="/opt/java/openjdk/bin:${PATH}"

RUN apk add --no-cache wget \
    && wget -q -O /opt/jackson-annotations.jar \
    https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-annotations/${JACKSON_ANNOTATIONS_VERSION}/jackson-annotations-${JACKSON_ANNOTATIONS_VERSION}.jar

COPY verification/docker/java/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
