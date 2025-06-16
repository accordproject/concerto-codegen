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

const RustVisitor = require('../../../../lib/codegen/fromcto/rust/rustvisitor.js');
const ModelUtil = require('@accordproject/concerto-core').ModelUtil;
const ClassDeclaration =
    require('@accordproject/concerto-core').ClassDeclaration;
const EnumDeclaration = require('@accordproject/concerto-core').EnumDeclaration;
const MapDeclaration = require('@accordproject/concerto-core').MapDeclaration;

const EnumValueDeclaration =
    require('@accordproject/concerto-core').EnumValueDeclaration;
const Field = require('@accordproject/concerto-core').Field;
const ModelFile = require('@accordproject/concerto-core').ModelFile;
const ModelManager = require('@accordproject/concerto-core').ModelManager;
const RelationshipDeclaration =
    require('@accordproject/concerto-core').RelationshipDeclaration;
const FileWriter = require('@accordproject/concerto-util').FileWriter;

let sandbox = sinon.createSandbox();

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
                property1: 'value1',
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
            let mockSpecialVisit = sinon.stub(
                rustVisitor,
                'visitEnumDeclaration'
            );
            mockSpecialVisit.returns('Duck');

            rustVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitClassDeclaration for a ClassDeclaration', () => {
            let thing = sinon.createStubInstance(ClassDeclaration);
            thing.isClassDeclaration.returns(true);
            let mockSpecialVisit = sinon.stub(
                rustVisitor,
                'visitClassDeclaration'
            );
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
            let mockSpecialVisit = sinon.stub(
                rustVisitor,
                'visitRelationshipDeclaration'
            );
            mockSpecialVisit.returns('Duck');

            rustVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitEnumValueDeclaration for a EnumValueDeclaration', () => {
            let thing = sinon.createStubInstance(EnumValueDeclaration);
            thing.isEnumValue.returns(true);
            let mockSpecialVisit = sinon.stub(
                rustVisitor,
                'visitEnumValueDeclaration'
            );
            mockSpecialVisit.returns('Goose');

            rustVisitor.visit(thing, param).should.deep.equal('Goose');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });
    });

    describe('visitModelManager', () => {
        it('should call accept for each model file', () => {
            let acceptSpy = sinon.spy();

            let param = {
                fileWriter: mockFileWriter,
            };

            sinon.stub(rustVisitor, 'addUtilsModelFile');

            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);
            mockModelManager.getModelFiles.returns([
                {
                    accept: acceptSpy,
                },
                {
                    accept: acceptSpy,
                },
            ]);

            mockModelManager.getNamespaces.returns(['Goose']);

            rustVisitor.visitModelManager(mockModelManager, param);
            acceptSpy.withArgs(rustVisitor, param).calledTwice.should.be.ok;
            param.fileWriter.openFile.withArgs('mod.rs').calledOnce.should.be
                .ok;
            param.fileWriter.writeLine.withArgs(0, 'pub mod goose;').calledOnce
                .should.be.ok;
            param.fileWriter.writeLine.withArgs(0, 'pub mod utils;').calledOnce
                .should.be.ok;
            param.fileWriter.closeFile.calledOnce.should.be.ok;
        });
    });

    describe('visitModelFile', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter,
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
                isRelationship: () => true,
            };

            let property2 = {
                isPrimitive: () => {
                    return false;
                },
                getFullyQualifiedTypeName: () => {
                    return 'org.acme.Property2';
                },
            };

            let property3 = {
                isPrimitive: () => {
                    return true;
                },
                getFullyQualifiedTypeName: () => {
                    return 'super.Property3';
                },
            };

            let mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockClassDeclaration.getProperties.returns([
                property1,
                property2,
                property3,
            ]);
            mockClassDeclaration.accept = acceptSpy;

            let mockClassDeclaration2 =
                sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration2.isEnum.returns(false);
            mockClassDeclaration2.getProperties.returns([]);
            mockClassDeclaration2.accept = acceptSpy;

            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.getNamespace.returns('org.acme');
            mockModelFile.getAllDeclarations.returns([
                mockEnum,
                mockClassDeclaration,
                mockClassDeclaration2,
            ]);
            mockModelFile.getImports.returns([
                'org.org2.Import1',
                'super.Property3',
                'super.Parent',
            ]);

            rustVisitor.visitModelFile(mockModelFile, param);

            param.fileWriter.openFile.withArgs('org_acme.rs').calledOnce.should
                .be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(8);
            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [0, 'use serde::{ Deserialize, Serialize };'],
                    [0, 'use chrono::{ DateTime, Utc };'],
                    [1, ''],
                    [0, 'use crate::org_org2::*;'],
                    [0, 'use crate::super_::*;'],
                    [0, 'use crate::org_org1::*;'],
                    [0, 'use crate::utils::*;'],
                    [1, ''],
                ]);
            param.fileWriter.closeFile.calledOnce.should.be.ok;

            acceptSpy.withArgs(rustVisitor, param).calledThrice.should.be.ok;
        });
    });

    describe('visitEnumDeclaration', () => {
        it('should write the export enum and call accept on each property', () => {
            let acceptSpy = sinon.spy();

            let param = {
                fileWriter: mockFileWriter,
            };

            let mockEnumDeclaration = sinon.createStubInstance(EnumDeclaration);
            mockEnumDeclaration.isEnum.returns(true);
            mockEnumDeclaration.getName.returns('Bob');
            mockEnumDeclaration.getOwnProperties.returns([
                {
                    accept: acceptSpy,
                },
                {
                    accept: acceptSpy,
                },
            ]);

            rustVisitor.visitEnumDeclaration(mockEnumDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.withArgs(0, 'pub enum Bob {').calledOnce
                .should.be.ok;
            param.fileWriter.writeLine.withArgs(0, '}\n').calledOnce.should.be
                .ok;

            acceptSpy.withArgs(rustVisitor, param).calledTwice.should.be.ok;
        });
    });

    describe('visitClassDeclaration', () => {
        let param;
        let mockModelFile;
        beforeEach(() => {
            mockModelFile = sinon.createStubInstance(ModelFile);
            param = {
                fileWriter: mockFileWriter,
            };
        });
        it('should write the struct opening and close', () => {
            let acceptSpy = sinon.spy();

            let mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getProperties.returns([
                {
                    accept: acceptSpy,
                },
                {
                    accept: acceptSpy,
                },
            ]);
            mockClassDeclaration.getName.returns('Bob');

            rustVisitor.visitClassDeclaration(mockClassDeclaration, param);
            param.fileWriter.writeLine.callCount.should.deep.equal(10);
            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [0, '#[derive(Debug, Serialize, Deserialize)]'],
                    [0, 'pub struct Bob {'],
                    [1, '#[serde('],
                    [2, 'rename = "$class",'],
                    [1, ')]'],
                    [1, 'pub _class: String,'],
                    [1, ''],
                    [1, ''],
                    [0, '}'],
                    [0, ''],
                ]);
        });

        it('should generate union type when class has direct subclasses', () => {
            let mockSubclass1 = sinon.createStubInstance(ClassDeclaration);
            mockSubclass1.getName.returns('Dog');
            mockSubclass1.getFullyQualifiedName.returns('org.example.Dog');
            mockSubclass1.isEnum.returns(false);
            mockSubclass1.getModelFile.returns(mockModelFile);

            let mockSubclass2 = sinon.createStubInstance(ClassDeclaration);
            mockSubclass2.getName.returns('Cat');
            mockSubclass2.getFullyQualifiedName.returns('org.example.Cat');
            mockSubclass2.isEnum.returns(false);
            mockSubclass2.getModelFile.returns(mockModelFile);

            let mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getProperties.returns([]);
            mockClassDeclaration.getName.returns('Animal');
            mockClassDeclaration.getFullyQualifiedName.returns(
                'org.example.Animal'
            );
            mockClassDeclaration.getDirectSubclasses.returns([
                mockSubclass1,
                mockSubclass2,
            ]);
            mockClassDeclaration.isAbstract.returns(true);
            mockClassDeclaration.getModelFile.returns(mockModelFile);

            // Enable flattenSubclassesToUnion
            param.flattenSubclassesToUnion = true;

            rustVisitor.visitClassDeclaration(mockClassDeclaration, param);

            // Verify union enum was generated
            param.fileWriter.writeLine.withArgs(
                0,
                '#[derive(Debug, Serialize, Deserialize)]'
            ).calledTwice.should.be.ok;
            param.fileWriter.writeLine.withArgs(0, '#[serde(tag = "$class")]')
                .calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(0, 'pub enum AnimalUnion {')
                .calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(
                1,
                '#[serde(rename = "org.example.Dog")]'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(1, 'Dog(Dog),').calledOnce
                .should.be.ok;
            param.fileWriter.writeLine.withArgs(
                1,
                '#[serde(rename = "org.example.Cat")]'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(1, 'Cat(Cat),').calledOnce
                .should.be.ok;
        });

        it('should include non-abstract base class in union type', () => {
            let mockSubclass = sinon.createStubInstance(ClassDeclaration);
            mockSubclass.getName.returns('SpecialPerson');
            mockSubclass.getFullyQualifiedName.returns(
                'org.example.SpecialPerson'
            );
            mockSubclass.isEnum.returns(false);
            mockSubclass.getModelFile.returns(mockModelFile);

            let mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getProperties.returns([]);
            mockClassDeclaration.getName.returns('Person');
            mockClassDeclaration.getFullyQualifiedName.returns(
                'org.example.Person'
            );
            mockClassDeclaration.getDirectSubclasses.returns([mockSubclass]);
            mockClassDeclaration.isAbstract.returns(false); // Non-abstract
            mockClassDeclaration.getModelFile.returns(mockModelFile);

            // Enable flattenSubclassesToUnion
            param.flattenSubclassesToUnion = true;

            rustVisitor.visitClassDeclaration(mockClassDeclaration, param);

            // Verify base class is included in union
            param.fileWriter.writeLine.withArgs(
                1,
                '#[serde(rename = "org.example.Person")]'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(1, 'Person(Person),').calledOnce
                .should.be.ok;
            param.fileWriter.writeLine.withArgs(
                1,
                '#[serde(rename = "org.example.SpecialPerson")]'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(
                1,
                'SpecialPerson(SpecialPerson),'
            ).calledOnce.should.be.ok;
        });

        it('should filter out enum subclasses from union type', () => {
            let mockEnumSubclass = sinon.createStubInstance(EnumDeclaration);
            mockEnumSubclass.getName.returns('Color');
            mockEnumSubclass.isEnum.returns(true);
            mockEnumSubclass.getModelFile.returns(mockModelFile);

            let mockClassSubclass = sinon.createStubInstance(ClassDeclaration);
            mockClassSubclass.getName.returns('Shape');
            mockClassSubclass.getFullyQualifiedName.returns(
                'org.example.Shape'
            );
            mockClassSubclass.isEnum.returns(false);
            mockClassSubclass.getModelFile.returns(mockModelFile);

            let mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getProperties.returns([]);
            mockClassDeclaration.getName.returns('Thing');
            mockClassDeclaration.getDirectSubclasses.returns([
                mockEnumSubclass,
                mockClassSubclass,
            ]);
            mockClassDeclaration.isAbstract.returns(true);
            mockClassDeclaration.getModelFile.returns(mockModelFile);

            // Enable flattenSubclassesToUnion
            param.flattenSubclassesToUnion = true;

            rustVisitor.visitClassDeclaration(mockClassDeclaration, param);

            // Verify only non-enum subclasses are included
            param.fileWriter.writeLine.withArgs(1, 'Color(Color),').called
                .should.be.false;
            param.fileWriter.writeLine.withArgs(
                1,
                '#[serde(rename = "org.example.Shape")]'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(1, 'Shape(Shape),').calledOnce
                .should.be.ok;
        });

        it('should not generate union type when class has no subclasses', () => {
            let mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getProperties.returns([]);
            mockClassDeclaration.getName.returns('SimpleClass');
            mockClassDeclaration.getDirectSubclasses.returns([]);

            rustVisitor.visitClassDeclaration(mockClassDeclaration, param);

            // Verify no union was generated
            param.fileWriter.writeLine.withArgs(0, '#[serde(tag = "$class")]')
                .called.should.be.false;
            param.fileWriter.writeLine.withArgs(
                0,
                'pub enum SimpleClassUnion {'
            ).called.should.be.false;
        });
    });

    describe('visitField', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter,
            };
        });
        it('should write a line for primitive field name and type', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.name = 'name';
            mockField.type = 'String';
            mockField.isPrimitive.returns(true);
            rustVisitor.visitField(mockField, param);
            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [1, '#[serde('],
                    [2, 'rename = "name",'],
                    [1, ')]'],
                    [1, 'pub name: String,'],
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
            const mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);

            mockModelManager.getType.returns(mockClassDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);
            rustVisitor.visitField(mockField, param);

            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [1, '#[serde('],
                    [2, 'rename = "Bob",'],
                    [1, ')]'],
                    [1, 'pub bob: Vec<Person>,'],
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
            const mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);

            mockModelManager.getType.returns(mockClassDeclaration);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);
            rustVisitor.visitField(mockField, param);

            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [1, '#[serde('],
                    [2, 'rename = "Bob",'],
                    [2, 'skip_serializing_if = "Option::is_none",'],
                    [1, ')]'],
                    [1, 'pub bob: Option<String>,'],
                ]);
        });

        it('should write a line with serializer for date field', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.name = 'timestamp';
            mockField.type = 'DateTime';

            const mockModelManager = sinon.createStubInstance(ModelManager);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            const mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);

            mockModelManager.getType.returns(mockClassDeclaration);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);
            rustVisitor.visitField(mockField, param);

            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [1, '#[serde('],
                    [2, 'rename = "timestamp",'],
                    [2, 'serialize_with = "serialize_datetime",'],
                    [2, 'deserialize_with = "deserialize_datetime",'],
                    [1, ')]'],
                    [1, 'pub timestamp: DateTime<Utc>,'],
                ]);
        });

        it('should write a line with DateTime serialization for HashMap <DateTime, String>', () => {
            let param = {
                fileWriter: mockFileWriter,
            };

            let mockField = sinon.createStubInstance(Field);
            let mockModelFile = sinon.createStubInstance(ModelFile);
            let mockMapDeclaration = sinon.createStubInstance(MapDeclaration);

            const getKeyType = sinon.stub();
            const getValueType = sinon.stub();

            getKeyType.returns('DateTime');
            getValueType.returns('String');

            mockField.getModelFile.returns(mockModelFile);
            mockField.getType.returns('MockMap');
            mockField.type = 'MockMap';
            mockField.getName.returns('mockMapDeclaration');
            mockModelFile.getType.returns(mockMapDeclaration);
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            const isPrimitiveTypeStub = sandbox.stub(
                ModelUtil,
                'isPrimitiveType'
            );
            const isMapStub = sandbox.stub(ModelUtil, 'isMap').returns(true);

            isPrimitiveTypeStub.onCall(0).returns(false);
            isPrimitiveTypeStub.onCall(1).returns(true);
            isPrimitiveTypeStub.onCall(2).returns(true);

            rustVisitor.visitField(mockField, param);

            // Should call DateTime key serialization
            param.fileWriter.writeLine.withArgs(
                2,
                'serialize_with = "serialize_hashmap_datetime_key",'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(
                2,
                'deserialize_with = "deserialize_hashmap_datetime_key",'
            ).calledOnce.should.be.ok;

            isPrimitiveTypeStub.restore();
            isMapStub.restore();
        });

        it('should write a line with DateTime serialization for HashMap <String, DateTime>', () => {
            let param = {
                fileWriter: mockFileWriter,
            };

            let mockField = sinon.createStubInstance(Field);
            let mockModelFile = sinon.createStubInstance(ModelFile);
            let mockMapDeclaration = sinon.createStubInstance(MapDeclaration);

            const getKeyType = sinon.stub();
            const getValueType = sinon.stub();

            getKeyType.returns('String');
            getValueType.returns('DateTime');

            mockField.getModelFile.returns(mockModelFile);
            mockField.getType.returns('MockMap');
            mockField.type = 'MockMap';
            mockField.getName.returns('mockMapDeclaration');
            mockModelFile.getType.returns(mockMapDeclaration);
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            const isPrimitiveTypeStub = sandbox.stub(
                ModelUtil,
                'isPrimitiveType'
            );
            const isMapStub = sandbox.stub(ModelUtil, 'isMap').returns(true);

            isPrimitiveTypeStub.onCall(0).returns(false);
            isPrimitiveTypeStub.onCall(1).returns(true);
            isPrimitiveTypeStub.onCall(2).returns(true);

            rustVisitor.visitField(mockField, param);

            // Should call DateTime value serialization
            param.fileWriter.writeLine.withArgs(
                2,
                'serialize_with = "serialize_hashmap_datetime_value",'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(
                2,
                'deserialize_with = "deserialize_hashmap_datetime_value",'
            ).calledOnce.should.be.ok;

            isPrimitiveTypeStub.restore();
            isMapStub.restore();
        });

        it('should write a line with DateTime serialization for HashMap <DateTime, DateTime>', () => {
            let param = {
                fileWriter: mockFileWriter,
            };

            let mockField = sinon.createStubInstance(Field);
            let mockModelFile = sinon.createStubInstance(ModelFile);
            let mockMapDeclaration = sinon.createStubInstance(MapDeclaration);

            const getKeyType = sinon.stub();
            const getValueType = sinon.stub();

            getKeyType.returns('DateTime');
            getValueType.returns('DateTime');

            mockField.getModelFile.returns(mockModelFile);
            mockField.getType.returns('MockMap');
            mockField.type = 'MockMap';
            mockField.getName.returns('mockMapDeclaration');
            mockModelFile.getType.returns(mockMapDeclaration);
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            const isPrimitiveTypeStub = sandbox.stub(
                ModelUtil,
                'isPrimitiveType'
            );
            const isMapStub = sandbox.stub(ModelUtil, 'isMap').returns(true);

            isPrimitiveTypeStub.onCall(0).returns(false);
            isPrimitiveTypeStub.onCall(1).returns(true);
            isPrimitiveTypeStub.onCall(2).returns(true);

            rustVisitor.visitField(mockField, param);

            // Should call DateTime both serialization
            param.fileWriter.writeLine.withArgs(
                2,
                'serialize_with = "serialize_hashmap_datetime_both",'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(
                2,
                'deserialize_with = "deserialize_hashmap_datetime_both",'
            ).calledOnce.should.be.ok;

            isPrimitiveTypeStub.restore();
            isMapStub.restore();
        });

        it('should write a line for optional HashMap with DateTime serialization', () => {
            let param = {
                fileWriter: mockFileWriter,
            };

            let mockField = sinon.createStubInstance(Field);
            let mockModelFile = sinon.createStubInstance(ModelFile);
            let mockMapDeclaration = sinon.createStubInstance(MapDeclaration);

            const getKeyType = sinon.stub();
            const getValueType = sinon.stub();

            getKeyType.returns('DateTime');
            getValueType.returns('String');

            mockField.getModelFile.returns(mockModelFile);
            mockField.getType.returns('MockMap');
            mockField.type = 'MockMap';
            mockField.getName.returns('mockMapDeclaration');
            mockField.isOptional.returns(true); // Make it optional
            mockModelFile.getType.returns(mockMapDeclaration);
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            const isPrimitiveTypeStub = sandbox.stub(
                ModelUtil,
                'isPrimitiveType'
            );
            const isMapStub = sandbox.stub(ModelUtil, 'isMap').returns(true);

            isPrimitiveTypeStub.onCall(0).returns(false);
            isPrimitiveTypeStub.onCall(1).returns(true);
            isPrimitiveTypeStub.onCall(2).returns(true);

            rustVisitor.visitField(mockField, param);

            // Should call optional DateTime key serialization
            param.fileWriter.writeLine.withArgs(
                2,
                'serialize_with = "serialize_hashmap_datetime_key_option",'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(
                2,
                'deserialize_with = "deserialize_hashmap_datetime_key_option",'
            ).calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(
                2,
                'skip_serializing_if = "Option::is_none",'
            ).calledOnce.should.be.ok;

            isPrimitiveTypeStub.restore();
            isMapStub.restore();
        });

        it('should handle HashMap with complex key and value types', () => {
            let param = {
                fileWriter: mockFileWriter,
            };

            let mockField = sinon.createStubInstance(Field);
            let mockModelFile = sinon.createStubInstance(ModelFile);
            let mockMapDeclaration = sinon.createStubInstance(MapDeclaration);

            const getKeyType = sinon.stub();
            const getValueType = sinon.stub();

            getKeyType.returns('Person'); // Complex type
            getValueType.returns('Order'); // Complex type

            mockField.getModelFile.returns(mockModelFile);
            mockField.getType.returns('MockMap');
            mockField.type = 'MockMap';
            mockField.getName.returns('mockMapDeclaration');
            mockModelFile.getType.returns(mockMapDeclaration);
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            const isPrimitiveTypeStub = sandbox.stub(
                ModelUtil,
                'isPrimitiveType'
            );
            const isScalarStub = sandbox.stub(ModelUtil, 'isScalar');
            const isMapStub = sandbox.stub(ModelUtil, 'isMap').returns(true);

            // Both key and value are complex (non-primitive, non-scalar)
            isPrimitiveTypeStub.returns(false);
            isScalarStub.returns(false);

            rustVisitor.visitField(mockField, param);

            // Should use raw type names for complex types
            param.fileWriter.writeLine.withArgs(
                1,
                'pub mock_map_declaration: HashMap<Person, Order>,'
            ).calledOnce.should.be.ok;

            isPrimitiveTypeStub.restore();
            isScalarStub.restore();
            isMapStub.restore();
        });

        it('should use union type when class has subclasses and flattenSubclassesToUnion is enabled', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.name = 'animal';
            mockField.type = 'Animal';
            mockField.getDecorators.returns([]);

            const mockModelManager = sinon.createStubInstance(ModelManager);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            const mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);
            const mockTypeDeclaration =
                sinon.createStubInstance(ClassDeclaration);

            // Mock the type being referenced to have subclasses
            mockTypeDeclaration.getDirectSubclasses.returns([
                {
                    getName: () => 'Dog',
                    isEnum: () => false,
                    getModelFile: () => mockModelFile,
                },
                {
                    getName: () => 'Cat',
                    isEnum: () => false,
                    getModelFile: () => mockModelFile,
                },
            ]);
            mockTypeDeclaration.isEnum.returns(false);
            mockTypeDeclaration.getModelFile.returns(mockModelFile);

            mockModelManager.getType.returns(mockTypeDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);

            // Enable flattenSubclassesToUnion parameter
            let paramWithUnion = {
                fileWriter: mockFileWriter,
                flattenSubclassesToUnion: true,
            };

            rustVisitor.visitField(mockField, paramWithUnion);

            paramWithUnion.fileWriter.writeLine.withArgs(
                1,
                'pub animal: AnimalUnion,'
            ).calledOnce.should.be.ok;
        });

        it('should not use union type when flattenSubclassesToUnion is disabled', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.name = 'animal';
            mockField.type = 'Animal';
            mockField.getDecorators.returns([]);

            const mockModelManager = sinon.createStubInstance(ModelManager);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            const mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);
            const mockTypeDeclaration =
                sinon.createStubInstance(ClassDeclaration);

            // Mock the type being referenced to have subclasses
            mockTypeDeclaration.getDirectSubclasses.returns([
                {
                    getName: () => 'Dog',
                    isEnum: () => false,
                    getModelFile: () => mockModelFile,
                },
                {
                    getName: () => 'Cat',
                    isEnum: () => false,
                    getModelFile: () => mockModelFile,
                },
            ]);
            mockTypeDeclaration.isEnum.returns(false);
            mockTypeDeclaration.getModelFile.returns(mockModelFile);

            mockModelManager.getType.returns(mockTypeDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);

            // Default behavior - no flattenSubclassesToUnion
            let param = {
                fileWriter: mockFileWriter,
            };

            rustVisitor.visitField(mockField, param);

            param.fileWriter.writeLine.withArgs(1, 'pub animal: Animal,')
                .calledOnce.should.be.ok;
        });

        it('should use union type for array fields when appropriate', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.name = 'animals';
            mockField.type = 'Animal';
            mockField.isArray.returns(true);
            mockField.getDecorators.returns([]);

            const mockModelManager = sinon.createStubInstance(ModelManager);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            const mockClassDeclaration =
                sinon.createStubInstance(ClassDeclaration);
            const mockTypeDeclaration =
                sinon.createStubInstance(ClassDeclaration);

            // Mock the type being referenced to have subclasses
            mockTypeDeclaration.getDirectSubclasses.returns([
                {
                    getName: () => 'Dog',
                    isEnum: () => false,
                    getModelFile: () => mockModelFile,
                },
            ]);
            mockTypeDeclaration.isEnum.returns(false);
            mockTypeDeclaration.getModelFile.returns(mockModelFile);

            mockModelManager.getType.returns(mockTypeDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);

            // Enable flattenSubclassesToUnion parameter
            let paramWithUnion = {
                fileWriter: mockFileWriter,
                flattenSubclassesToUnion: true,
            };

            rustVisitor.visitField(mockField, paramWithUnion);

            paramWithUnion.fileWriter.writeLine.withArgs(
                1,
                'pub animals: Vec<AnimalUnion>,'
            ).calledOnce.should.be.ok;
        });
    });

    describe('visitEnumValueDeclaration', () => {
        it('should write a line with the name and value of the enum value', () => {
            let param = {
                fileWriter: mockFileWriter,
            };

            let mockEnumValueDeclaration =
                sinon.createStubInstance(EnumValueDeclaration);
            mockEnumValueDeclaration.isEnumValue.returns(true);
            mockEnumValueDeclaration.getName.returns('Bob');

            rustVisitor.visitEnumValueDeclaration(
                mockEnumValueDeclaration,
                param
            );

            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [1, '#[allow(non_camel_case_types)]'],
                    [1, 'Bob,'],
                ]);
        });
    });

    describe('visitRelationship', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter,
            };
        });
        it('should write a line for field name and type', () => {
            let mockRelationship = sinon.createStubInstance(
                RelationshipDeclaration
            );
            mockRelationship.isRelationship.returns(true);
            mockRelationship.name = 'Bob';
            mockRelationship.type = 'Person';
            rustVisitor.visitRelationshipDeclaration(mockRelationship, param);

            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [1, '#[serde('],
                    [2, 'rename = "Bob",'],
                    [1, ')]'],
                    [1, 'pub bob: Person,'],
                ]);
        });

        it('should write a line for field name and type thats an array', () => {
            let mockRelationship = sinon.createStubInstance(
                RelationshipDeclaration
            );

            mockRelationship.isRelationship.returns(true);
            mockRelationship.name = 'Bob';
            mockRelationship.type = 'Person';
            mockRelationship.isArray.returns(true);
            rustVisitor.visitRelationshipDeclaration(mockRelationship, param);

            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [1, '#[serde('],
                    [2, 'rename = "Bob",'],
                    [1, ')]'],
                    [1, 'pub bob: Vec<Person>,'],
                ]);
        });

        it('should write a line for optional field name', () => {
            let mockRelationship = sinon.createStubInstance(
                RelationshipDeclaration
            );

            mockRelationship.isRelationship.returns(true);
            mockRelationship.name = 'Bob';
            mockRelationship.type = 'Person';
            mockRelationship.isOptional.returns(true);
            rustVisitor.visitRelationshipDeclaration(mockRelationship, param);

            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [1, '#[serde('],
                    [2, 'rename = "Bob",'],
                    [2, 'skip_serializing_if = "Option::is_none",'],
                    [1, ')]'],
                    [1, 'pub bob: Option<Person>,'],
                ]);
        });

        it('should write a line for array + optional field name', () => {
            let mockRelationship = sinon.createStubInstance(
                RelationshipDeclaration
            );

            mockRelationship.isRelationship.returns(true);
            mockRelationship.name = 'advisors';
            mockRelationship.type = 'Person';
            mockRelationship.isArray.returns(true);
            mockRelationship.isOptional.returns(true);
            rustVisitor.visitRelationshipDeclaration(mockRelationship, param);

            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [1, '#[serde('],
                    [2, 'rename = "advisors",'],
                    [2, 'skip_serializing_if = "Option::is_none",'],
                    [1, ')]'],
                    [1, 'pub advisors: Option<Vec<Person>>,'],
                ]);
        });
    });

    describe('toRustType', () => {
        it('should return Date for DateTime', () => {
            rustVisitor
                .toRustType('DateTime')
                .should.deep.equal('DateTime<Utc>');
        });
        it('should return boolean for Boolean', () => {
            rustVisitor.toRustType('Boolean').should.deep.equal('bool');
        });
        it('should return string for String', () => {
            rustVisitor.toRustType('String').should.deep.equal('String');
        });
        it('should return f64 for Double', () => {
            rustVisitor.toRustType('Double').should.deep.equal('f64');
        });
        it('should return i64 for Long', () => {
            rustVisitor.toRustType('Long').should.deep.equal('i64');
        });
        it('should return i32 for Integer', () => {
            rustVisitor.toRustType('Integer').should.deep.equal('i32');
        });

        it('should return union type when useUnion is true', () => {
            rustVisitor
                .toRustType('Animal', true)
                .should.deep.equal('AnimalUnion');
        });

        it('should return regular type when useUnion is false', () => {
            rustVisitor.toRustType('Animal', false).should.deep.equal('Animal');
        });

        it('should return regular type when useUnion is not specified', () => {
            rustVisitor.toRustType('Animal').should.deep.equal('Animal');
        });

        it('should not append Union to primitive types even when useUnion is true', () => {
            rustVisitor.toRustType('String', true).should.deep.equal('String');
            rustVisitor
                .toRustType('DateTime', true)
                .should.deep.equal('DateTime<Utc>');
        });
    });

    describe('Add Utils file', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter,
            };
        });
        it('should add utils file', () => {
            rustVisitor.addUtilsModelFile(param);
            param.fileWriter.writeLine
                .getCalls()
                .map((call) => call.args)
                .should.deep.equal([
                    [0, 'use chrono::{ DateTime, Utc };'],
                    [
                        0,
                        'use serde::{ Deserialize, Serialize, Deserializer, Serializer };',
                    ],
                    [1, ''],
                    [
                        0,
                        'pub fn serialize_datetime_option<S>(datetime: &Option<chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [1, 'match datetime {'],
                    [2, 'Some(dt) => {'],
                    [3, 'serialize_datetime(&dt, serializer)'],
                    [2, '},'],
                    [2, '_ => unreachable!(),'],
                    [1, '}'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_datetime_option<\'de, D>(deserializer: D) -> Result<Option<chrono::DateTime<Utc>>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [1, 'match deserialize_datetime(deserializer) {'],
                    [2, 'Ok(result)=>Ok(Some(result)),'],
                    [2, 'Err(error) => Err(error),'],
                    [1, '}'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_datetime<\'de, D>(deserializer: D) -> Result<chrono::DateTime<Utc>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [
                        1,
                        'let datetime_str = String::deserialize(deserializer)?;',
                    ],
                    [
                        1,
                        'DateTime::parse_from_str(&datetime_str, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom)',
                    ],
                    [0, '}'],
                    [1, ''],
                    [
                        0,
                        'pub fn serialize_datetime<S>(datetime: &chrono::DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [
                        1,
                        'let datetime_str = datetime.format("%+").to_string();',
                    ],
                    [1, 'serializer.serialize_str(&datetime_str)'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn serialize_datetime_array<S>(datetime_array: &Vec<chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [1, 'let datetime_strings: Vec<String> = datetime_array'],
                    [2, '.iter()'],
                    [2, '.map(|dt| dt.format("%+").to_string())'],
                    [2, '.collect();'],
                    [1, 'datetime_strings.serialize(serializer)'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_datetime_array<\'de, D>(deserializer: D) -> Result<Vec<chrono::DateTime<Utc>>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [
                        1,
                        'let datetime_strings = Vec::<String>::deserialize(deserializer)?;',
                    ],
                    [1, 'datetime_strings'],
                    [2, '.iter()'],
                    [
                        2,
                        '.map(|s| DateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom))',
                    ],
                    [2, '.collect()'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn serialize_datetime_array_option<S>(datetime_array: &Option<Vec<chrono::DateTime<Utc>>>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [1, 'match datetime_array {'],
                    [2, 'Some(arr) => {'],
                    [3, 'serialize_datetime_array(&arr, serializer)'],
                    [2, '},'],
                    [2, 'None => serializer.serialize_none(),'],
                    [1, '}'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_datetime_array_option<\'de, D>(deserializer: D) -> Result<Option<Vec<chrono::DateTime<Utc>>>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [
                        1,
                        'match Option::<Vec<String>>::deserialize(deserializer)? {',
                    ],
                    [2, 'Some(datetime_strings) => {'],
                    [3, 'let result: Result<Vec<_>, _> = datetime_strings'],
                    [4, '.iter()'],
                    [
                        4,
                        '.map(|s| DateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom))',
                    ],
                    [4, '.collect();'],
                    [3, 'result.map(Some)'],
                    [2, '},'],
                    [2, 'None => Ok(None),'],
                    [1, '}'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn serialize_hashmap_datetime_key<S>(hashmap: &std::collections::HashMap<chrono::DateTime<Utc>, String>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [
                        1,
                        'let string_map: std::collections::HashMap<String, String> = hashmap',
                    ],
                    [2, '.iter()'],
                    [
                        2,
                        '.map(|(k, v)| (k.format("%+").to_string(), v.clone()))',
                    ],
                    [2, '.collect();'],
                    [1, 'string_map.serialize(serializer)'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_hashmap_datetime_key<\'de, D>(deserializer: D) -> Result<std::collections::HashMap<chrono::DateTime<Utc>, String>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [
                        1,
                        'let string_map = std::collections::HashMap::<String, String>::deserialize(deserializer)?;',
                    ],
                    [1, 'let mut result = std::collections::HashMap::new();'],
                    [1, 'for (k, v) in string_map {'],
                    [
                        2,
                        'let datetime_key = DateTime::parse_from_str(&k, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom)?;',
                    ],
                    [2, 'result.insert(datetime_key, v);'],
                    [1, '}'],
                    [1, 'Ok(result)'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn serialize_hashmap_datetime_value<S>(hashmap: &std::collections::HashMap<String, chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [
                        1,
                        'let string_map: std::collections::HashMap<String, String> = hashmap',
                    ],
                    [2, '.iter()'],
                    [
                        2,
                        '.map(|(k, v)| (k.clone(), v.format("%+").to_string()))',
                    ],
                    [2, '.collect();'],
                    [1, 'string_map.serialize(serializer)'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_hashmap_datetime_value<\'de, D>(deserializer: D) -> Result<std::collections::HashMap<String, chrono::DateTime<Utc>>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [
                        1,
                        'let string_map = std::collections::HashMap::<String, String>::deserialize(deserializer)?;',
                    ],
                    [1, 'let mut result = std::collections::HashMap::new();'],
                    [1, 'for (k, v) in string_map {'],
                    [
                        2,
                        'let datetime_value = DateTime::parse_from_str(&v, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom)?;',
                    ],
                    [2, 'result.insert(k, datetime_value);'],
                    [1, '}'],
                    [1, 'Ok(result)'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn serialize_hashmap_datetime_both<S>(hashmap: &std::collections::HashMap<chrono::DateTime<Utc>, chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [
                        1,
                        'let string_map: std::collections::HashMap<String, String> = hashmap',
                    ],
                    [2, '.iter()'],
                    [
                        2,
                        '.map(|(k, v)| (k.format("%+").to_string(), v.format("%+").to_string()))',
                    ],
                    [2, '.collect();'],
                    [1, 'string_map.serialize(serializer)'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_hashmap_datetime_both<\'de, D>(deserializer: D) -> Result<std::collections::HashMap<chrono::DateTime<Utc>, chrono::DateTime<Utc>>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [
                        1,
                        'let string_map = std::collections::HashMap::<String, String>::deserialize(deserializer)?;',
                    ],
                    [1, 'let mut result = std::collections::HashMap::new();'],
                    [1, 'for (k, v) in string_map {'],
                    [
                        2,
                        'let datetime_key = DateTime::parse_from_str(&k, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom)?;',
                    ],
                    [
                        2,
                        'let datetime_value = DateTime::parse_from_str(&v, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom)?;',
                    ],
                    [2, 'result.insert(datetime_key, datetime_value);'],
                    [1, '}'],
                    [1, 'Ok(result)'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn serialize_hashmap_datetime_key_option<S>(hashmap: &Option<std::collections::HashMap<chrono::DateTime<Utc>, String>>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [1, 'match hashmap {'],
                    [
                        2,
                        'Some(map) => serialize_hashmap_datetime_key(map, serializer),',
                    ],
                    [2, 'None => serializer.serialize_none(),'],
                    [1, '}'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_hashmap_datetime_key_option<\'de, D>(deserializer: D) -> Result<Option<std::collections::HashMap<chrono::DateTime<Utc>, String>>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [
                        1,
                        'match Option::<std::collections::HashMap<String, String>>::deserialize(deserializer)? {',
                    ],
                    [2, 'Some(string_map) => {'],
                    [3, 'let mut result = std::collections::HashMap::new();'],
                    [3, 'for (k, v) in string_map {'],
                    [
                        4,
                        'let datetime_key = DateTime::parse_from_str(&k, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom)?;',
                    ],
                    [4, 'result.insert(datetime_key, v);'],
                    [3, '}'],
                    [3, 'Ok(Some(result))'],
                    [2, '},'],
                    [2, 'None => Ok(None),'],
                    [1, '}'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn serialize_hashmap_datetime_value_option<S>(hashmap: &Option<std::collections::HashMap<String, chrono::DateTime<Utc>>>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [1, 'match hashmap {'],
                    [
                        2,
                        'Some(map) => serialize_hashmap_datetime_value(map, serializer),',
                    ],
                    [2, 'None => serializer.serialize_none(),'],
                    [1, '}'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_hashmap_datetime_value_option<\'de, D>(deserializer: D) -> Result<Option<std::collections::HashMap<String, chrono::DateTime<Utc>>>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [
                        1,
                        'match Option::<std::collections::HashMap<String, String>>::deserialize(deserializer)? {',
                    ],
                    [2, 'Some(string_map) => {'],
                    [3, 'let mut result = std::collections::HashMap::new();'],
                    [3, 'for (k, v) in string_map {'],
                    [
                        4,
                        'let datetime_value = DateTime::parse_from_str(&v, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom)?;',
                    ],
                    [4, 'result.insert(k, datetime_value);'],
                    [3, '}'],
                    [3, 'Ok(Some(result))'],
                    [2, '},'],
                    [2, 'None => Ok(None),'],
                    [1, '}'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn serialize_hashmap_datetime_both_option<S>(hashmap: &Option<std::collections::HashMap<chrono::DateTime<Utc>, chrono::DateTime<Utc>>>, serializer: S) -> Result<S::Ok, S::Error>',
                    ],
                    [0, 'where'],
                    [1, 'S: Serializer,'],
                    [0, '{'],
                    [1, 'match hashmap {'],
                    [
                        2,
                        'Some(map) => serialize_hashmap_datetime_both(map, serializer),',
                    ],
                    [2, 'None => serializer.serialize_none(),'],
                    [1, '}'],
                    [0, '}'],
                    [0, ''],
                    [
                        0,
                        'pub fn deserialize_hashmap_datetime_both_option<\'de, D>(deserializer: D) -> Result<Option<std::collections::HashMap<chrono::DateTime<Utc>, chrono::DateTime<Utc>>>, D::Error>',
                    ],
                    [0, 'where'],
                    [1, 'D: Deserializer<\'de>,'],
                    [0, '{'],
                    [
                        1,
                        'match Option::<std::collections::HashMap<String, String>>::deserialize(deserializer)? {',
                    ],
                    [2, 'Some(string_map) => {'],
                    [3, 'let mut result = std::collections::HashMap::new();'],
                    [3, 'for (k, v) in string_map {'],
                    [
                        4,
                        'let datetime_key = DateTime::parse_from_str(&k, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom)?;',
                    ],
                    [
                        4,
                        'let datetime_value = DateTime::parse_from_str(&v, "%Y-%m-%dT%H:%M:%S%.3f%Z").map(|dt| dt.with_timezone(&Utc)).map_err(serde::de::Error::custom)?;',
                    ],
                    [4, 'result.insert(datetime_key, datetime_value);'],
                    [3, '}'],
                    [3, 'Ok(Some(result))'],
                    [2, '},'],
                    [2, 'None => Ok(None),'],
                    [1, '}'],
                    [0, '}'],
                ]);
        });
    });

    describe('visitMapDeclaration', () => {
        let param;
        let mockMapDeclaration;
        let mockMapKey;
        let mockMapValue;
        let mockModelFile;

        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter,
            };
            mockMapDeclaration = sinon.createStubInstance(MapDeclaration);
            mockMapKey = { getType: sinon.stub() };
            mockMapValue = { getType: sinon.stub() };
            mockModelFile = sinon.createStubInstance(ModelFile);
        });

        it('should generate HashMap type alias for string to string map', () => {
            mockMapDeclaration.getName.returns('PersonMap');
            mockMapDeclaration.getKey.returns(mockMapKey);
            mockMapDeclaration.getValue.returns(mockMapValue);
            mockMapKey.getType.returns('String');
            mockMapValue.getType.returns('String');
            mockMapDeclaration.getModelFile.returns(mockModelFile);
            mockModelFile.getNamespace.returns('org.example');

            rustVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.withArgs(
                0,
                'pub type PersonMap = HashMap<String, String>;'
            ).calledOnce.should.be.ok;
        });

        it('should generate HashMap type alias for string to custom type map', () => {
            mockMapDeclaration.getName.returns('AddressMap');
            mockMapDeclaration.getKey.returns(mockMapKey);
            mockMapDeclaration.getValue.returns(mockMapValue);
            mockMapKey.getType.returns('String');
            mockMapValue.getType.returns('Address');
            mockMapDeclaration.getModelFile.returns(mockModelFile);
            mockModelFile.getNamespace.returns('org.example');

            rustVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.withArgs(
                0,
                'pub type AddressMap = HashMap<String, Address>;'
            ).calledOnce.should.be.ok;
        });

        it('should handle DateTime key types', () => {
            mockMapDeclaration.getName.returns('EventMap');
            mockMapDeclaration.getKey.returns(mockMapKey);
            mockMapDeclaration.getValue.returns(mockMapValue);
            mockMapKey.getType.returns('DateTime');
            mockMapValue.getType.returns('String');
            mockMapDeclaration.getModelFile.returns(mockModelFile);
            mockModelFile.getNamespace.returns('org.example');

            rustVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.withArgs(
                0,
                'pub type EventMap = HashMap<DateTime<Utc>, String>;'
            ).calledOnce.should.be.ok;
        });

        it('should handle primitive type conversions', () => {
            mockMapDeclaration.getName.returns('ScoreMap');
            mockMapDeclaration.getKey.returns(mockMapKey);
            mockMapDeclaration.getValue.returns(mockMapValue);
            mockMapKey.getType.returns('String');
            mockMapValue.getType.returns('Integer');
            mockMapDeclaration.getModelFile.returns(mockModelFile);
            mockModelFile.getNamespace.returns('org.example');

            rustVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.withArgs(
                0,
                'pub type ScoreMap = HashMap<String, i32>;'
            ).calledOnce.should.be.ok;
        });
    });
});
