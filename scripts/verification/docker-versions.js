/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const VERSIONS_PATH = path.join(__dirname, '../../verification/docker/versions.json');

/**
 * Load the pinned Docker verification versions.
 * @returns {object} versions.json contents
 */
function loadVersions() {
    return JSON.parse(fs.readFileSync(VERSIONS_PATH, 'utf8'));
}

/**
 * Flatten versions.json into Docker ARG name/value pairs.
 * @param {object} [versions] optional pre-loaded versions object
 * @returns {Array<[string, string]>} ARG entries for docker build
 */
function versionArgPairs(versions = loadVersions()) {
    return [
        ['NODE_IMAGE', versions.images.node],
        ['GOLANG_IMAGE', versions.images.golang],
        ['DOTNET_IMAGE', versions.images.dotnet],
        ['RUST_IMAGE', versions.images.rust],
        ['JDK_IMAGE', versions.images.jdk],
        ['CONCERTO_CORE_VERSION', versions.npm.concertoCore],
        ['CONCERTO_UTIL_VERSION', versions.npm.concertoUtil],
        ['CONCERTO_VOCABULARY_VERSION', versions.npm.concertoVocabulary],
        ['TYPESCRIPT_VERSION', versions.npm.typescript],
        ['MARKDOWNLINT_CLI_VERSION', versions.npm.markdownlintCli],
        ['REDOCLY_CLI_VERSION', versions.npm.redoclyCli],
        ['GRAPHQL_VERSION', versions.npm.graphql],
        ['AJV_CLI_VERSION', versions.npm.ajvCli],
        ['MERMAID_VERSION', versions.npm.mermaid],
        ['JSDOM_VERSION', versions.npm.jsdom],
        ['JACKSON_ANNOTATIONS_VERSION', versions.jars.jacksonAnnotations],
        ['AVRO_TOOLS_VERSION', versions.jars.avroTools],
        ['PLANTUML_VERSION', versions.jars.plantuml],
        ['SERDE_VERSION', versions.cargo.serde],
        ['CHRONO_VERSION', versions.cargo.chrono],
    ];
}

/**
 * Docker CLI --build-arg flags derived from versions.json.
 * @param {object} [versions] optional pre-loaded versions object
 * @returns {string[]} interleaved --build-arg KEY=VALUE flags
 */
function versionBuildArgs(versions = loadVersions()) {
    return versionArgPairs(versions).flatMap(([name, value]) => [
        '--build-arg',
        `${name}=${value}`,
    ]);
}

/**
 * KEY=VALUE lines for docker/build-push-action build-args input.
 * @param {object} [versions] optional pre-loaded versions object
 * @returns {string} newline-separated build-arg assignments
 */
function versionBuildArgsFile(versions = loadVersions()) {
    return versionArgPairs(versions)
        .map(([name, value]) => `${name}=${value}`)
        .join('\n');
}

module.exports = {
    VERSIONS_PATH,
    loadVersions,
    versionArgPairs,
    versionBuildArgs,
    versionBuildArgsFile,
};

if (require.main === module) {
    const mode = process.argv[2] || 'flags';
    if (mode === 'file') {
        process.stdout.write(`${versionBuildArgsFile()}\n`);
    } else if (mode === 'flags') {
        process.stdout.write(`${versionBuildArgs().join(' ')}\n`);
    } else {
        // eslint-disable-next-line no-console
        console.error(`Usage: node docker-versions.js [flags|file]`);
        process.exit(1);
    }
}
