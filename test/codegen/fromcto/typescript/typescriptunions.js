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

const Ajv = require('ajv');
const path = require('path');
const chai = require('chai');
const { createGenerator } = require('ts-json-schema-generator');

const { ModelManager, Concerto } = require('@accordproject/concerto-core');
const { FileWriter } = require('@accordproject/concerto-util');
const TypescriptVisitor = require('../../../../lib/codegen/fromcto/typescript/typescriptvisitor.js');

chai.should();

describe('TypescriptVisitor', function () {
    beforeEach(() => {
    });

    describe('visit', () => {
        beforeEach(() => {
        });

        it('Chained TypeScript and JSONSchema conversion respects inheritance when flattening subclasses to a union type', () => {

            const modelManager = new ModelManager({ addMetamodel: true, strict: true });
            const visitor = new TypescriptVisitor();

            const outputPath = path.resolve(__dirname, 'out', 'generated');
            const fileWriter = new FileWriter(outputPath);
            modelManager.accept(visitor, { fileWriter, flattenSubclassesToUnion: true });

            // TS to JSON Schema conversion
            const config = {
                path: path.resolve(outputPath, 'concerto-metamodel@1.0.0.ts'),
                tsconfig: path.resolve('./test/codegen/fromcto/typescript/tsconfig.json'),
                type: 'IDecorator',
            };
            const jsonSchema = createGenerator(config).createSchema(config.type);

            // Test instance
            const data = {
                $class: 'concerto.metamodel@1.0.0.Decorator',
                name: 'displayName',
                arguments: [
                    {
                        value: 'Account ID',
                        $class: 'concerto.metamodel@1.0.0.DecoratorString',
                    }
                ],
            };

            // Validate the instance with Ajv, a JSON Schema validator
            const ajv = new Ajv();
            const validate = ajv.compile(jsonSchema);
            validate(data);
            (validate.errors === null).should.be.true;

            // Validate the instance with Concerto
            const concerto = new Concerto(modelManager);
            concerto.validate(data);
        });
    });
});
