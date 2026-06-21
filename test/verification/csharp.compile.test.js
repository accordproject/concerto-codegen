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

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const CSharpVisitor = require('../../lib/codegen/fromcto/csharp/csharpvisitor.js');

const {
    CASES,
    getSkipReason,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

const CSPROJ_TEMPLATE = path.join(__dirname, '../../verification/templates/Verify.csproj');

/**
 * Return a skip reason when the local dotnet SDK cannot build net8.0 projects.
 * @returns {string|null} skip reason or null when dotnet 8 is available
 */
function getDotnetSkipReason() {
    const version = spawnSync('dotnet', ['--version'], { encoding: 'utf-8' });
    if (version.status !== 0) {
        return 'dotnet SDK not installed';
    }

    const sdks = spawnSync('dotnet', ['--list-sdks'], { encoding: 'utf-8' });
    if (!/\b8\./.test(sdks.stdout || '')) {
        return '.NET 8 SDK required for verification';
    }

    return null;
}

const DOTNET_SKIP_REASON = getDotnetSkipReason();

/**
 * Generate C# from a model and verify it compiles with dotnet build.
 * @param {ModelManager} modelManager populated model manager
 * @param {object} [visitorOptions] options passed to CSharpVisitor
 */
async function verifyCSharpCompiles(modelManager, visitorOptions = {}) {
    const { path: outputDir, cleanup } = await dir({ unsafeCleanup: true });

    try {
        modelManager.accept(new CSharpVisitor(), {
            fileWriter: new FileWriter(outputDir),
            useConcertoRuntime: false,
            ...visitorOptions,
        });

        fs.copyFileSync(CSPROJ_TEMPLATE, path.join(outputDir, 'Verify.csproj'));

        try {
            execFileSync('dotnet', ['build', 'Verify.csproj', '--nologo', '-v', 'q'], {
                cwd: outputDir,
                encoding: 'utf-8',
                stdio: ['ignore', 'pipe', 'pipe'],
            });
        } catch (err) {
            const details = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
            throw new Error(details || err.message);
        }
    } finally {
        await cleanup();
    }
}

describe('verification', function () {
    this.timeout(120000);

    before(function () {
        applyVerificationEnv();
        if (DOTNET_SKIP_REASON) {
            // eslint-disable-next-line no-console
            console.warn(`Skipping C# verification tests: ${DOTNET_SKIP_REASON}`);
        }
    });

    CASES.forEach(function (testCase) {
        const skipReason = getSkipReason(testCase, 'csharp') || DOTNET_SKIP_REASON;
        const title = skipReason
            ? `generated C# from ${testCase.name} compiles with dotnet build (pending: ${skipReason})`
            : `generated C# from ${testCase.name} compiles with dotnet build`;
        const run = skipReason ? it.skip : it;

        run(title, async function () {
            const modelManager = createModelManager(testCase);
            await verifyCSharpCompiles(modelManager, testCase.visitorOptions || {});
        });
    });
});
