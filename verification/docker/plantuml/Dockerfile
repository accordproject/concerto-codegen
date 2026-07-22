ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

# Syntax-check generated PlantUML (.puml) via the official PlantUML jar.
# Use the full JRE (not headless): PlantUML loads fontmanager even for -syntax.
# fontconfig + DejaVu satisfy the native font path on Alpine.
RUN apk add --no-cache openjdk17-jre fontconfig ttf-dejavu curl \
    && curl -fsSL -o /usr/local/share/plantuml.jar \
        https://github.com/plantuml/plantuml/releases/download/v1.2024.7/plantuml-1.2024.7.jar

COPY verification/docker/plantuml/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
