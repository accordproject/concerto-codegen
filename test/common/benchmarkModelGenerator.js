/* eslint-disable no-unreachable */
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

const BenchmarkModelGenerator = require('../../lib/common/benchmarkModelGenerator.js');
const { expect } = require('expect');

describe('benchmarkModelGenerator', function () {
    describe('generateConcertoModels', function () {
        it('should generate a benchmark Concerto model up to a specified number of declarations and properties', function () {
            const benchmarkModelGenerator = new BenchmarkModelGenerator();
            benchmarkModelGenerator.should.not.be.null;

            const generated = benchmarkModelGenerator.generateConcertoModels({
                nDeclarations: 5,
                nProperties: 5,
            });

            expect(generated.models[0].declarations.length).toEqual(5);
            expect(generated.models[0].declarations[0].properties.length).toEqual(5);
            expect(generated.models[0].declarations[0]).toEqual({
                '$class': 'concerto.metamodel@1.0.0.ConceptDeclaration',
                name: 'Model0Declaration0',
                isAbstract: false,
                properties: [
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property0',
                        isArray: false,
                        isOptional: false
                    },
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property1',
                        isArray: false,
                        isOptional: false
                    },
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property2',
                        isArray: false,
                        isOptional: false
                    },
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property3',
                        isArray: false,
                        isOptional: false
                    },
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property4',
                        isArray: false,
                        isOptional: false
                    }
                ]
            });
            delete generated.models[0].declarations;
            expect(generated.models[0]).toEqual({
                '$class': 'concerto.metamodel@1.0.0.Model',
                decorators: [],
                namespace: 'generated.model@1.0.0',
                imports: []
            });
            expect(generated.metadata).toEqual({
                generatedModelSizeInBytes: 3845,
                humanReadableGeneratedModelSize: '3.75 KiB',
                declarationsN: 5,
                propertiesNInSmallestDeclaration: 5,
                propertiesNInLargestDeclaration: 5
            });
        });

        it('should generate a benchmark Concerto model up to a specified size in bytes growing it by the number of declarations', function () {
            const benchmarkModelGenerator = new BenchmarkModelGenerator();
            benchmarkModelGenerator.should.not.be.null;

            const generated = benchmarkModelGenerator.generateConcertoModels({
                generateUpToSize: 10000,
                growBy: 'declarations',
                nProperties: 5,
            });

            expect(generated.models[0].declarations.length).toEqual(13);
            expect(generated.models[0].declarations[0].properties.length).toEqual(5);
            expect(generated.models[0].declarations[0]).toEqual({
                '$class': 'concerto.metamodel@1.0.0.ConceptDeclaration',
                name: 'Model0Declaration0',
                isAbstract: false,
                properties: [
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property0',
                        isArray: false,
                        isOptional: false
                    },
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property1',
                        isArray: false,
                        isOptional: false
                    },
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property2',
                        isArray: false,
                        isOptional: false
                    },
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property3',
                        isArray: false,
                        isOptional: false
                    },
                    {
                        '$class': 'concerto.metamodel@1.0.0.StringProperty',
                        name: 'Model0Declaration0Property4',
                        isArray: false,
                        isOptional: false
                    }
                ]
            });
            delete generated.models[0].declarations;
            expect(generated.models[0]).toEqual({
                '$class': 'concerto.metamodel@1.0.0.Model',
                decorators: [],
                namespace: 'generated.model@1.0.0',
                imports: []
            });
            expect(generated.metadata).toEqual({
                requestedModelSizeInBytes: 10000,
                humanReadableRequestedModelSize: '9.77 KiB',
                generatedModelSizeInBytes: 9815,
                humanReadableGeneratedModelSize: '9.58 KiB',
                declarationsN: 13,
                propertiesNInSmallestDeclaration: 5,
                propertiesNInLargestDeclaration: 5
            });
        });

        it('should generate a benchmark Concerto model up to a specified size in bytes growing it by the number of properties', function () {
            const benchmarkModelGenerator = new BenchmarkModelGenerator();
            benchmarkModelGenerator.should.not.be.null;

            const generated = benchmarkModelGenerator.generateConcertoModels({
                generateUpToSize: 10000,
                growBy: 'properties',
                nDeclarations: 5,
            });

            expect(generated.models[0].declarations.length).toEqual(5);
            expect(generated.models[0].declarations[0].properties.length).toEqual(14);
            expect(generated.models[0].declarations[0].properties.slice(0, 5)).toEqual([
                {
                    '$class': 'concerto.metamodel@1.0.0.StringProperty',
                    name: 'Model0Declaration0Property0',
                    isArray: false,
                    isOptional: false
                },
                {
                    '$class': 'concerto.metamodel@1.0.0.StringProperty',
                    name: 'Model0Declaration0Property1',
                    isArray: false,
                    isOptional: false
                },
                {
                    '$class': 'concerto.metamodel@1.0.0.StringProperty',
                    name: 'Model0Declaration0Property2',
                    isArray: false,
                    isOptional: false
                },
                {
                    '$class': 'concerto.metamodel@1.0.0.StringProperty',
                    name: 'Model0Declaration0Property3',
                    isArray: false,
                    isOptional: false
                },
                {
                    '$class': 'concerto.metamodel@1.0.0.StringProperty',
                    name: 'Model0Declaration0Property4',
                    isArray: false,
                    isOptional: false
                }
            ]);
            delete generated.models[0].declarations[0].properties;
            expect(generated.models[0].declarations[0]).toEqual({
                '$class': 'concerto.metamodel@1.0.0.ConceptDeclaration',
                name: 'Model0Declaration0',
                isAbstract: false,
            });
            delete generated.models[0].declarations;
            expect(generated.models[0]).toEqual({
                '$class': 'concerto.metamodel@1.0.0.Model',
                decorators: [],
                namespace: 'generated.model@1.0.0',
                imports: []
            });
            expect(generated.metadata).toEqual({
                requestedModelSizeInBytes: 10000,
                humanReadableRequestedModelSize: '9.77 KiB',
                generatedModelSizeInBytes: 9994,
                humanReadableGeneratedModelSize: '9.76 KiB',
                declarationsN: 5,
                propertiesNInSmallestDeclaration: 14,
                propertiesNInLargestDeclaration: 15
            });
        });

        it('should throw an error if an unsupported growBy option is used', function () {
            const benchmarkModelGenerator = new BenchmarkModelGenerator();
            benchmarkModelGenerator.should.not.be.null;

            (() => {
                benchmarkModelGenerator.generateConcertoModels({
                    generateUpToSize: 10000,
                    growBy: 'foo',
                    nDeclarations: 5,
                });
            }).should.throw('growBy can be either set to "declarations" or "properties".');
        });

        it('should throw an error if the requested model size exceeds the available heap size and cannot be created', function () {
            const benchmarkModelGenerator = new BenchmarkModelGenerator();
            benchmarkModelGenerator.should.not.be.null;

            (() => {
                benchmarkModelGenerator.generateConcertoModels({
                    generateUpToSize: 100000000000,
                    growBy: 'properties',
                    nDeclarations: 5,
                });
            }).should.throw('The requested model size exceeds the 100 MiB limit and cannot be created.');
        });
    });
});
