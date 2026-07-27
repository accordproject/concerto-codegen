ARG NODE_IMAGE
FROM ${NODE_IMAGE}

ARG CONCERTO_CORE_VERSION
ARG CONCERTO_UTIL_VERSION
ARG CONCERTO_VOCABULARY_VERSION

RUN apk add --no-cache jq

WORKDIR /opt/concerto-codegen

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Install peer dependencies required at runtime by concerto-codegen visitors.
RUN npm install --no-save \
    @accordproject/concerto-core@${CONCERTO_CORE_VERSION} \
    @accordproject/concerto-util@${CONCERTO_UTIL_VERSION} \
    @accordproject/concerto-vocabulary@${CONCERTO_VOCABULARY_VERSION}

# Point the global Concerto CLI at this checkout so PRs test branch codegen.
# Also replace the copy nested under concerto-cli (Node resolves that first).
RUN npm install -g @accordproject/concerto-cli \
    && GLOBAL_ROOT="$(npm root -g)" \
    && find "$GLOBAL_ROOT" -type d -path '*/@accordproject/concerto-codegen' -print0 \
        | xargs -0 -r rm -rf \
    && ln -s /opt/concerto-codegen "$GLOBAL_ROOT/@accordproject/concerto-codegen" \
    && mkdir -p "$GLOBAL_ROOT/@accordproject/concerto-cli/node_modules/@accordproject" \
    && ln -s /opt/concerto-codegen "$GLOBAL_ROOT/@accordproject/concerto-cli/node_modules/@accordproject/concerto-codegen"

ENV ENABLE_MAP_TYPE=true \
    IMPORT_ALIASING=true \
    CORPUS_DIR=/corpus \
    WORK_DIR=/work

COPY verification/docker/base/run-case.sh /usr/local/bin/run-case.sh
RUN chmod +x /usr/local/bin/run-case.sh
