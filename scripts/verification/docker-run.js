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

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const BASE_IMAGE = 'concerto-verify-base:local';
const TARGETS = ['typescript', 'jsonschema'];

/**
 * Run a command synchronously with inherited stdio.
 * @param {string} cmd the executable
 * @param {string[]} args command arguments
 * @param {object} [options] options passed to execFileSync
 */
function run(cmd, args, options = {}) {
    // eslint-disable-next-line no-console
    console.log(`> ${cmd} ${args.join(' ')}`);
    execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...options });
}

/**
 * Create per-target work directories under verification/.
 */
function ensureWorkDirs() {
    for (const target of TARGETS) {
        const workDir = path.join(ROOT, 'verification', `work-${target}`);
        fs.mkdirSync(workDir, { recursive: true });
    }
}

/**
 * Build the shared verification base Docker image.
 */
function buildBase() {
    run('docker', [
        'build',
        '-f', 'verification/docker/base/Dockerfile',
        '-t', BASE_IMAGE,
        '.',
    ]);
}

/**
 * Build the Docker image for a verification target.
 * @param {string} target target name (e.g. typescript, jsonschema)
 * @returns {string} the local image tag
 */
function buildTarget(target) {
    const image = `concerto-verify-${target}:local`;
    run('docker', [
        'build',
        '-f', `verification/docker/${target}/Dockerfile`,
        '--build-arg', `BASE_IMAGE=${BASE_IMAGE}`,
        '-t', image,
        '.',
    ]);
    return image;
}

/**
 * Run a verification target container with corpus and work volumes mounted.
 * @param {string} target target name
 * @param {string} image local Docker image tag
 */
function runTarget(target, image) {
    const corpus = path.join(ROOT, 'verification', 'corpus');
    const work = path.join(ROOT, 'verification', `work-${target}`);

    run('docker', [
        'run', '--rm',
        '-v', `${corpus}:/corpus:ro`,
        '-v', `${work}:/work`,
        image,
    ]);
}

/**
 * Build and run verification Docker images for one or all targets.
 */
function main() {
    const requested = process.argv.slice(2);
    const targets = requested.length > 0
        ? requested.filter((t) => TARGETS.includes(t))
        : TARGETS;

    if (requested.length > 0 && targets.length === 0) {
        // eslint-disable-next-line no-console
        console.error(`Unknown target(s). Choose from: ${TARGETS.join(', ')}`);
        process.exit(1);
    }

    ensureWorkDirs();
    buildBase();

    let failed = false;
    for (const target of targets) {
        try {
            const image = buildTarget(target);
            runTarget(target, image);
        } catch (err) {
            failed = true;
            // eslint-disable-next-line no-console
            console.error(`Verification failed for ${target}`);
        }
    }

    if (failed) {
        process.exit(1);
    }
}

main();
