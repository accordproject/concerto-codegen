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
const { dir } = require('tmp-promise');

const { FileWriter } = require('@accordproject/concerto-util');
const CSharpVisitor = require('../../lib/codegen/fromcto/csharp/csharpvisitor.js');

const {
    CASES,
    createModelManager,
    applyVerificationEnv,
} = require('./cases.js');

// C# verification is skipped for every case: the generated C# references the
// AccordProject.Concerto runtime package (attributes such as
// [AccordProject.Concerto.Type] and the ConcertoConverterFactorySystem converter),
// so a standalone `dotnet build` cannot resolve those types. Remove this skip
// once the C# codegen can emit runtime-independent output.
const CSHARP_SKIP_REASON = 'C# codegen emits AccordProject.Concerto runtime references; standalone dotnet build not yet supported';

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
            ...visitorOptions,
        });

        fs.writeFileSync(
            path.join(outputDir, 'Verify.csproj'),
            [
                '<Project Sdk="Microsoft.NET.Sdk">',
                '  <PropertyGroup>',
                '    <TargetFramework>net8.0</TargetFramework>',
                '    <Nullable>enable</Nullable>',
                '    <ImplicitUsings>enable</ImplicitUsings>',
                '  </PropertyGroup>',
                '</Project>',
                '',
            ].join('\n')
        );

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
    });

    CASES.forEach(function (testCase) {
        // All C# cases are skipped for now; see CSHARP_SKIP_REASON above.
        it.skip(
            `generated C# from ${testCase.name} compiles with dotnet build (pending: ${CSHARP_SKIP_REASON})`,
            async function () {
                const modelManager = createModelManager(testCase);
                await verifyCSharpCompiles(modelManager, testCase.visitorOptions || {});
            }
        );
    });
});
