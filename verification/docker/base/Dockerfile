FROM node:20-alpine

RUN apk add --no-cache jq

WORKDIR /opt/concerto-codegen

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Install peer dependencies required at runtime by concerto-codegen visitors.
RUN npm install --no-save \
    @accordproject/concerto-core@^4.1.3 \
    @accordproject/concerto-util@^4.1.3 \
    @accordproject/concerto-vocabulary@^4.1.3

# Point the global Concerto CLI at this checkout so PRs test branch codegen.
RUN npm install -g @accordproject/concerto-cli \
    && GLOBAL_ROOT="$(npm root -g)" \
    && rm -rf "$GLOBAL_ROOT/@accordproject/concerto-codegen" \
    && ln -s /opt/concerto-codegen "$GLOBAL_ROOT/@accordproject/concerto-codegen"

ENV ENABLE_MAP_TYPE=true \
    IMPORT_ALIASING=true \
    CORPUS_DIR=/corpus \
    WORK_DIR=/work

COPY verification/docker/base/run-case.sh /usr/local/bin/run-case.sh
RUN chmod +x /usr/local/bin/run-case.sh
