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

function run(cmd, args, options = {}) {
    console.log(`> ${cmd} ${args.join(' ')}`);
    execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...options });
}

function ensureWorkDirs() {
    for (const target of TARGETS) {
        const workDir = path.join(ROOT, 'verification', `work-${target}`);
        fs.mkdirSync(workDir, { recursive: true });
    }
}

function buildBase() {
    run('docker', [
        'build',
        '-f', 'verification/docker/base/Dockerfile',
        '-t', BASE_IMAGE,
        '.',
    ]);
}

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

function main() {
    const requested = process.argv.slice(2);
    const targets = requested.length > 0
        ? requested.filter((t) => TARGETS.includes(t))
        : TARGETS;

    if (requested.length > 0 && targets.length === 0) {
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
            console.error(`Verification failed for ${target}`);
        }
    }

    if (failed) {
        process.exit(1);
    }
}

main();
