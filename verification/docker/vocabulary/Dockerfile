ARG BASE_IMAGE=concerto-verify-base:local
FROM ${BASE_IMAGE}

# Validate generated Vocabulary YAML (.voc) files with the official
# @accordproject/concerto-vocabulary package, already installed in the base
# image, which parses and validates the locale/namespace/declarations shape.
# validate.js is baked into /opt/concerto-codegen by the base image's
# `COPY . .`, so it resolves node_modules there - no extra COPY needed.
COPY verification/docker/vocabulary/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
