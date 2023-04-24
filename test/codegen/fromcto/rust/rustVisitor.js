/*
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const chai = require('chai');
chai.should();
const sinon = require('sinon');

const RustVisitor = require('../../../../lib/codegen/fromcto/rust/rustvisitor');

const ClassDeclaration = require('@accordproject/concerto-core').ClassDeclaration;
const EnumDeclaration = require('@accordproject/concerto-core').EnumDeclaration;
const EnumValueDeclaration = require('@accordproject/concerto-core').EnumValueDeclaration;
const Field = require('@accordproject/concerto-core').Field;
const ModelFile = require('@accordproject/concerto-core').ModelFile;
const ModelManager = require('@accordproject/concerto-core').ModelManager;
const RelationshipDeclaration = require('@accordproject/concerto-core').RelationshipDeclaration;
const FileWriter = require('@accordproject/concerto-util').FileWriter;


describe('RustVisitor', function () {
    let rustVisitor;
    let mockFileWriter;
    beforeEach(() => {
        rustVisitor = new RustVisitor();
        mockFileWriter = sinon.createStubInstance(FileWriter);
    });

    describe('visit', () => {
        let param;
        beforeEach(() => {
            param = {
                property1: 'value1'
            };
        });

        it('should return visitModelManager for a ModelManager', () => {
            let thing = sinon.createStubInstance(ModelManager);
            thing.isModelManager.returns(true);
            let mockSpecialVisit = sinon.stub(rustVisitor, 'visitModelManager');
            mockSpecialVisit.returns('Duck');

            rustVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });


        it('should return visitModelFile for a ModelFile', () => {
            let thing = sinon.createStubInstance(ModelFile);
            thing.isModelFile.returns(true);
            let mockSpecialVisit = sinon.stub(rustVisitor, 'visitModelFile');
            mockSpecialVisit.returns('Duck');

            rustVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitEnumDeclaration for a EnumDeclaration', () => {
            let thing = sinon.createStubInstance(EnumDeclaration);
            thing.isEnum.returns(true);
            let mockSpecialVisit = sinon.stub(rustVisitor, 'visitEnumDeclaration');
            mockSpecialVisit.returns('Duck');

            rustVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitClassDeclaration for a ClassDeclaration', () => {
            let thing = sinon.createStubInstance(ClassDeclaration);
            thing.isClassDeclaration.returns(true);
            let mockSpecialVisit = sinon.stub(rustVisitor, 'visitClassDeclaration');
            mockSpecialVisit.returns('Duck');

            rustVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitField for a Field', () => {
            let thing = sinon.createStubInstance(Field);
            thing.isField.returns(true);
            let mockSpecialVisit = sinon.stub(rustVisitor, 'visitField');
            mockSpecialVisit.returns('Duck');

            rustVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitRelationship for a RelationshipDeclaration', () => {
            let thing = sinon.createStubInstance(RelationshipDeclaration);
            thing.isRelationship.returns(true);
            let mockSpecialVisit = sinon.stub(rustVisitor, 'visitRelationshipDeclaration');
            mockSpecialVisit.returns('Duck');

            rustVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });


        it('should return visitEnumValueDeclaration for a EnumValueDeclaration', () => {
            let thing = sinon.createStubInstance(EnumValueDeclaration);
            thing.isEnumValue.returns(true);
            let mockSpecialVisit = sinon.stub(rustVisitor, 'visitEnumValueDeclaration');
            mockSpecialVisit.returns('Goose');

            rustVisitor.visit(thing, param).should.deep.equal('Goose');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });
    });

    describe('visitModelManager', () => {
        it('should call accept for each model file', () => {
            let acceptSpy = sinon.spy();

            let param = {
                fileWriter: mockFileWriter
            };

            sinon.stub(rustVisitor, 'addUtilsModelFile');


            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);
            mockModelManager.getModelFiles.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }
            ]);

            mockModelManager.getNamespaces.returns([
                'Goose'
            ]);

            rustVisitor.visitModelManager(mockModelManager, param);
            acceptSpy.withArgs(rustVisitor, param).calledTwice.should.be.ok;
            param.fileWriter.openFile.withArgs('mod.rs').calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(0, 'pub mod goose;').calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(0, 'pub mod utils;').calledOnce.should.be.ok;
            param.fileWriter.closeFile.calledOnce.should.be.ok;
        });
    });

    describe('visitModelFile', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should write lines for the imports that are not in own namespace (including super types)', () => {
            let acceptSpy = sinon.spy();
            let mockEnum = sinon.createStubInstance(EnumDeclaration);
            mockEnum.isEnum.returns(true);
            mockEnum.accept = acceptSpy;

            let property1 = {
                isPrimitive: () => {
                    return false;
                },
                getFullyQualifiedTypeName: () => {
                    return 'org.org1.Property1';
                },
                isRelationship: () => true
            };

            let property2 = {
                isPrimitive: () => {
                    return false;
                },
                getFullyQualifiedTypeName: () => {
                    return 'org.acme.Property2';
                }
            };

            let property3 = {
                isPrimitive: () => {
                    return true;
                },
                getFullyQualifiedTypeName: () => {
                    return 'super.Property3';
                }
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockClassDeclaration.getProperties.returns([property1, property2, property3]);
            mockClassDeclaration.accept = acceptSpy;

            let mockClassDeclaration2 = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration2.isEnum.returns(false);
            mockClassDeclaration2.getProperties.returns([]);
            mockClassDeclaration2.accept = acceptSpy;

            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.getNamespace.returns('org.acme');
            mockModelFile.getAllDeclarations.returns([
                mockEnum,
                mockClassDeclaration,
                mockClassDeclaration2
            ]);
            mockModelFile.getImports.returns([
                'org.org2.Import1',
                'super.Property3',
                'super.Parent'
            ]);

            rustVisitor.visitModelFile(mockModelFile, param);

            param.fileWriter.openFile.withArgs('org_acme.rs').calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(8);
            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    0, 'use serde::{ Deserialize, Serialize };'
                ],
                [
                    0, 'use chrono::{ DateTime, TimeZone, Utc };'
                ],
                [
                    1, ''
                ],
                [
                    0, 'use crate::org_org2::*;'
                ],
                [
                    0, 'use crate::super_::*;'
                ],
                [
                    0, 'use crate::org_org1::*;'
                ],
                [
                    0, 'use crate::utils::*;'
                ],
                [
                    1, ''
                ]
            ]);
            param.fileWriter.closeFile.calledOnce.should.be.ok;

            acceptSpy.withArgs(rustVisitor, param).calledThrice.should.be.ok;
        });
    });


    describe('visitEnumDeclaration', () => {
        it('should write the export enum and call accept on each property', () => {
            let acceptSpy = sinon.spy();

            let param = {
                fileWriter: mockFileWriter
            };

            let mockEnumDeclaration = sinon.createStubInstance(EnumDeclaration);
            mockEnumDeclaration.isEnum.returns(true);
            mockEnumDeclaration.getName.returns('Bob');
            mockEnumDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);

            rustVisitor.visitEnumDeclaration(mockEnumDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.withArgs(0, 'pub enum Bob {').calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(0, '}\n').calledOnce.should.be.ok;

            acceptSpy.withArgs(rustVisitor, param).calledTwice.should.be.ok;
        });
    });

    describe('visitClassDeclaration', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should write the struct opening and close', () => {
            let acceptSpy = sinon.spy();

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.getName.returns('Bob');

            rustVisitor.visitClassDeclaration(mockClassDeclaration, param);
            param.fileWriter.writeLine.callCount.should.deep.equal(10);
            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    0, '#[derive(Debug, Serialize, Deserialize)]'
                ],
                [
                    0, 'pub struct Bob {'
                ],
                [
                    1, '#[serde('
                ],
                [
                    2, 'rename = \'$class\','
                ],
                [
                    1, ')]'
                ],
                [
                    1, 'pub _class: String,'
                ],
                [
                    1, ''
                ],
                [
                    1, ''
                ],
                [
                    0, '}'
                ],
                [
                    0, ''
                ]
            ]);
        });
    });


    describe('visitField', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should write a line for primitive field name and type', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.name = 'name';
            mockField.type = 'String';
            mockField.isPrimitive.returns(true);
            rustVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    1, '#[serde('
                ],
                [
                    2, 'rename = \'name\','
                ],
                [
                    1, ')]'
                ],
                [
                    1, 'pub name: String,'
                ]
            ]);
        });

        it('should write a line for field name and type thats an array', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.name = 'Bob';
            mockField.type = 'Person';
            mockField.isArray.returns(true);

            const mockModelManager = sinon.createStubInstance(ModelManager);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            const mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);

            mockModelManager.getType.returns(mockClassDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);
            rustVisitor.visitField(mockField, param);

            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    1, '#[serde('
                ],
                [
                    2, 'rename = \'Bob\','
                ],
                [
                    1, ')]'
                ],
                [
                    1, 'pub bob: Vec<Person>,'
                ]

            ]);
        });

        it('should write a line for optional field', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.name = 'Bob';
            mockField.type = 'String';
            mockField.isOptional.returns(true);

            const mockModelManager = sinon.createStubInstance(ModelManager);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            const mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);

            mockModelManager.getType.returns(mockClassDeclaration);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);
            rustVisitor.visitField(mockField, param);

            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    1, '#[serde('
                ],
                [
                    2, 'rename = \'Bob\','
                ],
                [
                    2, 'skip_serializing_if = "Option::is_none",'
                ],
                [
                    1, ')]'
                ],
                [
                    1, 'pub bob: Option<String>,'
                ]

            ]);
        });


        it('should write a line with serializer for date field', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.name = 'timestamp';
            mockField.type = 'DateTime';

            const mockModelManager = sinon.createStubInstance(ModelManager);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            const mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);

            mockModelManager.getType.returns(mockClassDeclaration);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);
            rustVisitor.visitField(mockField, param);

            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    1, '#[serde('
                ],
                [
                    2, 'rename = \'timestamp\','
                ],
                [
                    2, 'serialize_with = "serialize_datetime",'
                ],
                [
                    2, 'deserialize_with = "deserialize_datetime",'
                ],
                [
                    1, ')]'
                ],
                [
                    1, 'pub timestamp: DateTime<Utc>,'
                ]

            ]);
        });
    });

    describe('visitEnumValueDeclaration', () => {
        it('should write a line with the name and value of the enum value', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockEnumValueDeclaration = sinon.createStubInstance(EnumValueDeclaration);
            mockEnumValueDeclaration.isEnumValue.returns(true);
            mockEnumValueDeclaration.getName.returns('Bob');

            rustVisitor.visitEnumValueDeclaration(mockEnumValueDeclaration, param);

            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    1,
                    '#[allow(non_camel_case_types)]'
                ],
                [
                    1,
                    'Bob,'
                ]
            ]);
        });
    });

    describe('visitRelationship', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should write a line for field name and type', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.name = 'Bob';
            mockRelationship.type = 'Person';
            rustVisitor.visitRelationshipDeclaration(mockRelationship, param);

            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    1, '#[serde(rename = \'Bob\')]'
                ],
                [
                    1, 'pub bob: Person,'
                ]
            ]);
        });

        it('should write a line for field name and type thats an array', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);

            mockRelationship.isRelationship.returns(true);
            mockRelationship.name = 'Bob';
            mockRelationship.type = 'Person';
            mockRelationship.isArray.returns(true);
            rustVisitor.visitRelationshipDeclaration(mockRelationship, param);

            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    1, '#[serde(rename = \'Bob\')]'
                ],
                [
                    1, 'pub bob: Vec<Person>,'
                ]
            ]);
        });

        it('should write a line for optional field name', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);

            mockRelationship.isRelationship.returns(true);
            mockRelationship.name = 'Bob';
            mockRelationship.type = 'Person';
            mockRelationship.isOptional.returns(true);
            rustVisitor.visitRelationshipDeclaration(mockRelationship, param);

            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    1, '#[serde(rename = \'Bob\')]'
                ],
                [
                    1, 'pub bob: Option<Person>,'
                ]
            ]);
        });
    });


    describe('toRustType', () => {
        it('should return Date for DateTime', () => {
            rustVisitor.toRustType('DateTime').should.deep.equal('DateTime<Utc>');
        });
        it('should return boolean for Boolean', () => {
            rustVisitor.toRustType('Boolean').should.deep.equal('bool');
        });
        it('should return string for String', () => {
            rustVisitor.toRustType('String').should.deep.equal('String');
        });
        it('should return number for Double', () => {
            rustVisitor.toRustType('Double').should.deep.equal('f64');
        });
        it('should return number for Long', () => {
            rustVisitor.toRustType('Long').should.deep.equal('u64');
        });
    });

    describe('Add Utils file', () => {

        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should add utils file', () => {
            rustVisitor.addUtilsModelFile(param);
            param.fileWriter.writeLine.getCalls().map(call => call.args).should.deep.equal([
                [
                    0,
                    'use chrono::{ DateTime, TimeZone, Utc };'
                ],
                [
                    0,
                    'use serde::{ Deserialize, Serialize, Deserializer, Serializer };'
                ],
                [
                    1,
                    ''
                ],
                [
                    0,
                    'pub fn serialize_datetime_option<S>(datetime: &Option<chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>'
                ],
                [
                    0,
                    'where'
                ],
                [
                    1,
                    'S: Serializer,'
                ],
                [
                    0,
                    '{'
                ],
                [
                    1,
                    'match datetime {'
                ],
                [
                    2,
                    'Some(dt) => {'
                ],
                [
                    3,
                    'serialize_datetime(&dt, serializer)'
                ],
                [
                    2,
                    '},'
                ],
                [
                    2,
                    '_ => unreachable!(),'
                ],
                [
                    1,
                    '}'
                ],
                [
                    0,
                    '}'
                ],
                [
                    0,
                    ''
                ],
                [
                    0,
                    'pub fn deserialize_datetime_option<\'de, D>(deserializer: D) -> Result<Option<chrono::DateTime<Utc>>, D::Error>'
                ],
                [
                    0,
                    'where'
                ],
                [
                    1,
                    'D: Deserializer<\'de>,'
                ],
                [
                    0,
                    '{'
                ],
                [
                    1,
                    'match deserialize_datetime(deserializer) {'
                ],
                [
                    2,
                    'Ok(result)=>Ok(Some(result)),'
                ],
                [
                    2,
                    'Err(error) => Err(error),'
                ],
                [
                    1,
                    '}'
                ],
                [
                    0,
                    '}'
                ],
                [
                    0,
                    ''
                ],
                [
                    0,
                    'pub fn deserialize_datetime<\'de, D>(deserializer: D) -> Result<chrono::DateTime<Utc>, D::Error>'
                ],
                [
                    0,
                    'where'
                ],
                [
                    1,
                    'D: Deserializer<\'de>,'
                ],
                [
                    0,
                    '{'
                ],
                [
                    1,
                    'let datetime_str = String::deserialize(deserializer)?;'
                ],
                [
                    1,
                    'Utc.datetime_from_str(&datetime_str, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)'
                ],
                [
                    0,
                    '}'
                ],
                [
                    1,
                    ''
                ],
                [
                    0,
                    'pub fn serialize_datetime<S>(datetime: &chrono::DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>'
                ],
                [
                    0,
                    'where'
                ],
                [
                    1,
                    'S: Serializer,'
                ],
                [
                    0,
                    '{'
                ],
                [
                    1,
                    'let datetime_str = datetime.format("%+").to_string();'
                ],
                [
                    1,
                    'serializer.serialize_str(&datetime_str)'
                ],
                [
                    0,
                    '}'
                ]
            ]);
        });
    });
});