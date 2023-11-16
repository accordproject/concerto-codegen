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

const chai = require('chai');
chai.should();
const sinon = require('sinon');

const XmlSchemaVisitor = require('../../../../lib/codegen/fromcto/xmlschema/xmlschemavisitor.js');

const ClassDeclaration = require('@accordproject/concerto-core').ClassDeclaration;
const EnumDeclaration = require('@accordproject/concerto-core').EnumDeclaration;
const MapDeclaration = require('@accordproject/concerto-core').MapDeclaration;
const EnumValueDeclaration = require('@accordproject/concerto-core').EnumValueDeclaration;
const Field = require('@accordproject/concerto-core').Field;
const ModelFile = require('@accordproject/concerto-core').ModelFile;
const ModelManager = require('@accordproject/concerto-core').ModelManager;
const RelationshipDeclaration = require('@accordproject/concerto-core').RelationshipDeclaration;
const FileWriter = require('@accordproject/concerto-util').FileWriter;
const ModelUtil = require('@accordproject/concerto-core').ModelUtil;
let sandbox = sinon.createSandbox();

describe('XmlSchemaVisitor', function () {
    let xmlSchemaVisitor;
    let mockFileWriter;
    beforeEach(() => {
        xmlSchemaVisitor = new XmlSchemaVisitor();
        mockFileWriter = sinon.createStubInstance(FileWriter);
    });

    describe('visit', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });

        it('should return visitEnumDeclaration for a EnumDeclaration', () => {
            let thing = sinon.createStubInstance(EnumDeclaration);
            thing.isEnum.returns(true);
            let mockSpecialVisit = sinon.stub(xmlSchemaVisitor, 'visitEnumDeclaration');
            mockSpecialVisit.returns('Duck');

            xmlSchemaVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitClassDeclaration for a ClassDeclaration', () => {
            let thing = sinon.createStubInstance(ClassDeclaration);
            thing.isClassDeclaration.returns(true);
            let mockSpecialVisit = sinon.stub(xmlSchemaVisitor, 'visitClassDeclaration');
            mockSpecialVisit.returns('Duck');

            xmlSchemaVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitField for a Field', () => {
            let thing = sinon.createStubInstance(Field);
            thing.isField.returns(true);
            let mockSpecialVisit = sinon.stub(xmlSchemaVisitor, 'visitField');
            mockSpecialVisit.returns('Duck');

            xmlSchemaVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitRelationship for a RelationshipDeclaration', () => {
            let thing = sinon.createStubInstance(RelationshipDeclaration);
            thing.isRelationship.returns(true);
            let mockSpecialVisit = sinon.stub(xmlSchemaVisitor, 'visitRelationship');
            mockSpecialVisit.returns('Duck');

            xmlSchemaVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitEnumValueDeclaration for a EnumValueDeclaration', () => {
            let thing = sinon.createStubInstance(EnumValueDeclaration);
            thing.isEnumValue.returns(true);
            let mockSpecialVisit = sinon.stub(xmlSchemaVisitor, 'visitEnumValueDeclaration');
            mockSpecialVisit.returns('Duck');

            xmlSchemaVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should throw an error when an unrecognised type is supplied', () => {
            let thing = 'Something of unrecognised type';

            (() => {
                xmlSchemaVisitor.visit(thing, param);
            }).should.throw('Unrecognised "Something of unrecognised type"');
        });
    });

    describe('visitModelManager', () => {
        it('should visit each of the model files in a ModelManager', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);

            mockModelManager.accept = function(visitor, parameters) {
                return visitor.visit(this, parameters);
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getNamespace.returns('org.imported');
            mockModelManager.getType.returns(mockClassDeclaration);

            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isModelFile.returns(true);
            mockModelFile.getImports.returns([]);
            mockModelFile.getModelManager.returns(mockModelManager);

            mockModelFile.accept = function(visitor, parameters) {
                return visitor.visit(this, parameters);
            };
            mockModelFile.getNamespace.returns('org.hyperledger.composer.system');
            mockModelFile.getAllDeclarations.returns([mockClassDeclaration]);
            mockModelFile.getImports.returns(['org.imported.ImportedType']);
            mockModelManager.getModelFiles.returns([mockModelFile]);

            xmlSchemaVisitor.visit(mockModelManager, param);

            param.fileWriter.openFile.withArgs('org.hyperledger.composer.system.xsd').calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<?xml version="1.0"?>']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<xs:schema xmlns:org.hyperledger.composer.system="org.hyperledger.composer.system" targetNamespace="org.hyperledger.composer.system" elementFormDefault="qualified" xmlns:xs="http://www.w3.org/2001/XMLSchema" ']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'xmlns:org.imported="org.imported"']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, '<xs:import namespace="org.imported" schemaLocation="org.imported.xsd"/>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '</xs:schema>']);

            param.fileWriter.closeFile.calledOnce.should.be.ok;
        });
    });

    describe('visitModelFile', () => {
        it('should handle system namespace', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);

            mockModelManager.accept = function(visitor, parameters) {
                return visitor.visit(this, parameters);
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getNamespace.returns('org.imported');
            mockModelManager.getType.returns(mockClassDeclaration);

            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.getImports.returns([]);
            mockModelFile.isModelFile.returns(true);
            mockModelFile.getModelManager.returns(mockModelManager);

            mockModelFile.accept = function(visitor, parameters) {
                return visitor.visit(this, parameters);
            };
            mockModelFile.getNamespace.returns('org.hyperledger.composer.system');
            mockModelFile.getAllDeclarations.returns([mockClassDeclaration]);
            mockModelFile.getImports.returns(['org.imported.ImportedType']);

            mockModelManager.getModelFiles.returns([mockModelFile]);

            xmlSchemaVisitor.visitModelManager(mockModelManager, param);

            param.fileWriter.openFile.withArgs('org.hyperledger.composer.system.xsd').calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<?xml version="1.0"?>']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<xs:schema xmlns:org.hyperledger.composer.system="org.hyperledger.composer.system" targetNamespace="org.hyperledger.composer.system" elementFormDefault="qualified" xmlns:xs="http://www.w3.org/2001/XMLSchema" ']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'xmlns:org.imported="org.imported"']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, '<xs:import namespace="org.imported" schemaLocation="org.imported.xsd"/>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '</xs:schema>']);

            param.fileWriter.closeFile.calledOnce.should.be.ok;
        });

        it('should not import the same namespace more than once', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);

            mockModelManager.accept = function(visitor, parameters) {
                return visitor.visit(this, parameters);
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getNamespace.returns('org.imported');
            mockClassDeclaration.getName.returns('ImportedType');
            mockModelManager.getType.withArgs('org.imported.ImportedType').returns(mockClassDeclaration);

            let mockClassDeclaration2 = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration2.isClassDeclaration.returns(true);
            mockClassDeclaration2.getNamespace.returns('org.imported');
            mockClassDeclaration.getName.returns('AnotherImportedType');
            mockModelManager.getType.withArgs('org.imported.AnotherImportedType').returns(mockClassDeclaration2);

            let mockClassDeclaration3 = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration3.isClassDeclaration.returns(true);
            mockClassDeclaration3.getNamespace.returns('org.different');
            mockClassDeclaration3.getName.returns('Type');
            mockModelManager.getType.withArgs('org.different.Type').returns(mockClassDeclaration3);

            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isModelFile.returns(true);
            mockModelFile.getModelManager.returns(mockModelManager);

            mockModelFile.getImports.returns(['org.imported.ImportedType','org.imported.AnotherImportedType', 'org.different.Type']);

            mockModelFile.accept = function(visitor, parameters) {
                return visitor.visit(this, parameters);
            };
            mockModelFile.getNamespace.returns('org.foo');
            mockModelFile.getAllDeclarations.returns([mockClassDeclaration]);
            mockModelManager.getModelFiles.returns([mockModelFile]);

            xmlSchemaVisitor.visitModelManager(mockModelManager, param);

            param.fileWriter.openFile.withArgs('org.foo.xsd').calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(8);
            let index=0;
            param.fileWriter.writeLine.getCall(index++).args.should.deep.equal([0, '<?xml version="1.0"?>']);
            param.fileWriter.writeLine.getCall(index++).args.should.deep.equal([0, '<xs:schema xmlns:org.foo="org.foo" targetNamespace="org.foo" elementFormDefault="qualified" xmlns:xs="http://www.w3.org/2001/XMLSchema" ']);
            param.fileWriter.writeLine.getCall(index++).args.should.deep.equal([0, 'xmlns:org.imported="org.imported"']);
            param.fileWriter.writeLine.getCall(index++).args.should.deep.equal([0, 'xmlns:org.different="org.different"']);
            param.fileWriter.writeLine.getCall(index++).args.should.deep.equal([0, '>']);
            param.fileWriter.writeLine.getCall(index++).args.should.deep.equal([0, '<xs:import namespace="org.imported" schemaLocation="org.imported.xsd"/>']);
            param.fileWriter.writeLine.getCall(index++).args.should.deep.equal([0, '<xs:import namespace="org.different" schemaLocation="org.different.xsd"/>']);
            param.fileWriter.writeLine.getCall(index++).args.should.deep.equal([0, '</xs:schema>']);

            param.fileWriter.closeFile.calledOnce.should.be.ok;
        });
    });

    describe('visitEnumDeclaration', () => {
        it('should write the class declaration for an enum', () => {
            let acceptSpy = sinon.spy();

            let param = {
                fileWriter: mockFileWriter
            };

            let mockEnumDeclaration = sinon.createStubInstance(EnumDeclaration);
            mockEnumDeclaration.isEnum.returns(true);
            mockEnumDeclaration.getName.returns('Person');
            mockEnumDeclaration.getNamespace.returns('org.acme');
            mockEnumDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);

            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);
            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isModelFile.returns(true);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockEnumDeclaration.getModelFile.returns(mockModelFile);

            xmlSchemaVisitor.visitEnumDeclaration(mockEnumDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(5);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:simpleType name="Person">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([1, '<xs:restriction base="xs:string">']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '</xs:restriction>']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '</xs:simpleType>']);

            acceptSpy.withArgs(xmlSchemaVisitor, param).calledTwice.should.be.ok;
        });
    });

    describe('visitClassDeclaration', () => {
        it('should write the class declaration for a class', () => {
            let acceptSpy = sinon.spy();

            let param = {
                fileWriter: mockFileWriter
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getName.returns('Person');
            mockClassDeclaration.getNamespace.returns('org.acme');
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);

            xmlSchemaVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(5);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:complexType name="Person">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '</xs:complexType>']);

            acceptSpy.withArgs(xmlSchemaVisitor, param).calledTwice.should.be.ok;
        });

        it('should write the class declaration for a class with a super type', () => {
            let acceptSpy = sinon.spy();

            let param = {
                fileWriter: mockFileWriter
            };

            let mockSuperType = sinon.createStubInstance(ClassDeclaration);
            mockSuperType.isClassDeclaration.returns(true);
            mockSuperType.getNamespace.returns('org.acme');
            mockSuperType.getName.returns('Human');
            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);
            mockModelManager.getType.returns(mockSuperType);
            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isModelFile.returns(true);
            mockModelFile.getModelManager.returns(mockModelManager);

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockClassDeclaration.getName.returns('Person');
            mockClassDeclaration.getNamespace.returns('org.acme');
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.getSuperType.returns('org.acme.Human');

            xmlSchemaVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(9);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:complexType name="Person">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([1, '<xs:complexContent>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '<xs:extension base="org.acme:Human">']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([1, '</xs:extension>']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([1, '</xs:complexContent>']);
            param.fileWriter.writeLine.getCall(7).args.should.deep.equal([0, '</xs:complexType>']);

            acceptSpy.withArgs(xmlSchemaVisitor, param).calledTwice.should.be.ok;
        });
    });


    describe('visitMapDeclaration', () => {

        before(() => {
            sandbox.stub(ModelUtil, 'parseNamespace').callsFake(() => {
                return {name:'org.acme'};
            });
        });

        after(() => {
            sandbox.restore();
        });

        it('should write the map declaration for a map <String, String>', () => {

            let param = {
                fileWriter: mockFileWriter
            };

            const mockMapDeclaration    = sinon.createStubInstance(MapDeclaration);
            const findStub              = sinon.stub();
            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();

            findStub.returns(mockMapDeclaration);
            getKeyType.returns('String');
            getValueType.returns('String');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            xmlSchemaVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(13);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:element name="Map1">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<xs:complexType>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([2, '<xs:element name="entry" type="Map1EntryType" minOccurs="0" maxOccurs="unbounded"/>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '</xs:complexType>']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([0, '</xs:element>']);

            param.fileWriter.writeLine.getCall(7).args.should.deep.equal([0, '<xs:complexType name="Map1EntryType">']);
            param.fileWriter.writeLine.getCall(8).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(9).args.should.deep.equal([2, '<xs:element name="key" type="xs:string"/>']);
            param.fileWriter.writeLine.getCall(10).args.should.deep.equal([2, '<xs:element name="value" type="xs:string"/>']);
            param.fileWriter.writeLine.getCall(11).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(12).args.should.deep.equal([0, '</xs:complexType>']);
        });


        it('should write the map declaration for a map <String, SSN>', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            const mockMapDeclaration    = sinon.createStubInstance(MapDeclaration);
            const mockDeclaration       = sinon.createStubInstance(ClassDeclaration);
            const isScalarDeclaration   = sinon.stub();
            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();
            const getType               = sinon.stub();
            const getScalarType         = sinon.stub();

            mockMapDeclaration.getModelFile.returns({ getType: getType});
            getType.returns(mockDeclaration);
            mockDeclaration.isClassDeclaration.returns(false);
            mockDeclaration.isScalarDeclaration.returns(true);
            mockDeclaration.getType.returns('String');
            getKeyType.returns('String');
            getValueType.returns('SSN');
            getScalarType.returns('String');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });
            isScalarDeclaration.returns(true);

            xmlSchemaVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(13);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:element name="Map1">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<xs:complexType>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([2, '<xs:element name="entry" type="Map1EntryType" minOccurs="0" maxOccurs="unbounded"/>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '</xs:complexType>']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([0, '</xs:element>']);

            param.fileWriter.writeLine.getCall(7).args.should.deep.equal([0, '<xs:complexType name="Map1EntryType">']);
            param.fileWriter.writeLine.getCall(8).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(9).args.should.deep.equal([2, '<xs:element name="key" type="xs:string"/>']);
            param.fileWriter.writeLine.getCall(10).args.should.deep.equal([2, '<xs:element name="value" type="xs:string"/>']);
            param.fileWriter.writeLine.getCall(11).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(12).args.should.deep.equal([0, '</xs:complexType>']);
        });

        it('should write the map declaration for a map <String, Person>', () => {

            let param = {
                fileWriter: mockFileWriter
            };

            sandbox.stub(ModelUtil, 'getNamespace').callsFake(() => {
                return {name:'org.acme'};
            });

            const mockMapDeclaration    = sinon.createStubInstance(MapDeclaration);
            const mockDeclaration       = sinon.createStubInstance(ClassDeclaration);
            const mockModelFile         = sinon.createStubInstance(ModelFile);
            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();

            mockMapDeclaration.getModelFile.returns(mockModelFile);
            mockModelFile.getNamespace.returns('org.acme');
            mockModelFile.getType.returns(mockDeclaration);
            mockDeclaration.isClassDeclaration.returns(true);
            mockDeclaration.getType.returns('Person');
            mockMapDeclaration.isClassDeclaration.returns(true);
            getKeyType.returns('String');
            getValueType.returns('Person');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            xmlSchemaVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(13);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:element name="Map1">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<xs:complexType>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([2, '<xs:element name="entry" type="Map1EntryType" minOccurs="0" maxOccurs="unbounded"/>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '</xs:complexType>']);
        });

        it('should write the map declaration for a map <String, Long>', () => {

            let param = {
                fileWriter: mockFileWriter
            };

            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();
            const mockMapDeclaration    = sinon.createStubInstance(MapDeclaration);

            getKeyType.returns('String');
            getValueType.returns('Long');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            xmlSchemaVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(13);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:element name="Map1">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<xs:complexType>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([2, '<xs:element name="entry" type="Map1EntryType" minOccurs="0" maxOccurs="unbounded"/>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '</xs:complexType>']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([0, '</xs:element>']);

            param.fileWriter.writeLine.getCall(7).args.should.deep.equal([0, '<xs:complexType name="Map1EntryType">']);
            param.fileWriter.writeLine.getCall(8).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(9).args.should.deep.equal([2, '<xs:element name="key" type="xs:string"/>']);
            param.fileWriter.writeLine.getCall(10).args.should.deep.equal([2, '<xs:element name="value" type="xs:long"/>']);
            param.fileWriter.writeLine.getCall(11).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(12).args.should.deep.equal([0, '</xs:complexType>']);
        });

        it('should write the map declaration for a map <String, Double>', () => {

            let param = {
                fileWriter: mockFileWriter
            };

            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();
            const mockMapDeclaration    = sinon.createStubInstance(MapDeclaration);

            getKeyType.returns('String');
            getValueType.returns('Double');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            xmlSchemaVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(13);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:element name="Map1">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<xs:complexType>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([2, '<xs:element name="entry" type="Map1EntryType" minOccurs="0" maxOccurs="unbounded"/>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '</xs:complexType>']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([0, '</xs:element>']);

            param.fileWriter.writeLine.getCall(7).args.should.deep.equal([0, '<xs:complexType name="Map1EntryType">']);
            param.fileWriter.writeLine.getCall(8).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(9).args.should.deep.equal([2, '<xs:element name="key" type="xs:string"/>']);
            param.fileWriter.writeLine.getCall(10).args.should.deep.equal([2, '<xs:element name="value" type="xs:double"/>']);
            param.fileWriter.writeLine.getCall(11).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(12).args.should.deep.equal([0, '</xs:complexType>']);
        });

        it('should write the map declaration for a map <String, Integer>', () => {

            let param = {
                fileWriter: mockFileWriter
            };

            const isClassDeclaration    = sinon.stub();
            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();
            const mockMapDeclaration    = sinon.createStubInstance(MapDeclaration);

            getKeyType.returns('String');
            getValueType.returns('Integer');
            isClassDeclaration.returns(true);
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            xmlSchemaVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(13);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:element name="Map1">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<xs:complexType>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([2, '<xs:element name="entry" type="Map1EntryType" minOccurs="0" maxOccurs="unbounded"/>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '</xs:complexType>']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([0, '</xs:element>']);

            param.fileWriter.writeLine.getCall(7).args.should.deep.equal([0, '<xs:complexType name="Map1EntryType">']);
            param.fileWriter.writeLine.getCall(8).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(9).args.should.deep.equal([2, '<xs:element name="key" type="xs:string"/>']);
            param.fileWriter.writeLine.getCall(10).args.should.deep.equal([2, '<xs:element name="value" type="xs:integer"/>']);
            param.fileWriter.writeLine.getCall(11).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(12).args.should.deep.equal([0, '</xs:complexType>']);
        });

        it('should write the map declaration for a map <String, Concept>', () => {

            let param = {
                fileWriter: mockFileWriter
            };
            const mockMapDeclaration    = sinon.createStubInstance(MapDeclaration);
            const mockDeclaration       = sinon.createStubInstance(ClassDeclaration);
            const mockModelFile         = sinon.createStubInstance(ModelFile);
            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();

            sandbox.reset();

            mockMapDeclaration.getModelFile.returns(mockModelFile);
            mockModelFile.getNamespace.returns('org.acme');
            mockModelFile.getType.returns(mockDeclaration);
            mockDeclaration.isClassDeclaration.returns(true);
            mockDeclaration.getType.returns('Concept');
            mockMapDeclaration.isClassDeclaration.returns(true);
            getKeyType.returns('String');
            getValueType.returns('Concept');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            xmlSchemaVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(13);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '<xs:element name="Map1">']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<xs:complexType>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([2, '<xs:element name="entry" type="Map1EntryType" minOccurs="0" maxOccurs="unbounded"/>']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '</xs:complexType>']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([0, '</xs:element>']);

            param.fileWriter.writeLine.getCall(7).args.should.deep.equal([0, '<xs:complexType name="Map1EntryType">']);
            param.fileWriter.writeLine.getCall(8).args.should.deep.equal([1, '<xs:sequence>']);
            param.fileWriter.writeLine.getCall(9).args.should.deep.equal([2, '<xs:element name="key" type="xs:string"/>']);
            param.fileWriter.writeLine.getCall(10).args.should.deep.equal([2, '<xs:element name="value" type="concerto:Concept"/>']);
            param.fileWriter.writeLine.getCall(11).args.should.deep.equal([1, '</xs:sequence>']);
            param.fileWriter.writeLine.getCall(12).args.should.deep.equal([0, '</xs:complexType>']);

        });


    });

    describe('visitField', () => {
        it('should write a line for a String field', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.getFullyQualifiedTypeName.returns('String');
            mockField.getName.returns('Bob');

            xmlSchemaVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(2, '<xs:element name="Bob" type="xs:string"/>').calledOnce.should.be.ok;
        });

        it('should write a line for a Long field', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.getFullyQualifiedTypeName.returns('Long');
            mockField.getName.returns('Bob');

            xmlSchemaVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(2, '<xs:element name="Bob" type="xs:long"/>').calledOnce.should.be.ok;
        });

        it('should write a line for a Double field', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.getFullyQualifiedTypeName.returns('Double');
            mockField.getName.returns('Bob');

            xmlSchemaVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(2, '<xs:element name="Bob" type="xs:double"/>').calledOnce.should.be.ok;
        });

        it('should write a line for a DateTime field', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.getFullyQualifiedTypeName.returns('DateTime');
            mockField.getName.returns('Bob');

            xmlSchemaVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(2, '<xs:element name="Bob" type="xs:dateTime"/>').calledOnce.should.be.ok;
        });

        it('should write a line for a Boolean field', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.getFullyQualifiedTypeName.returns('Boolean');
            mockField.getName.returns('Bob');

            xmlSchemaVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(2, '<xs:element name="Bob" type="xs:boolean"/>').calledOnce.should.be.ok;
        });

        it('should write a line for a Integer field', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.getFullyQualifiedTypeName.returns('Integer');
            mockField.getName.returns('Bob');

            xmlSchemaVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(2, '<xs:element name="Bob" type="xs:integer"/>').calledOnce.should.be.ok;
        });

        it('should write a line for an object field', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.getFullyQualifiedTypeName.returns('org.acme.Foo');
            mockField.getName.returns('Bob');

            xmlSchemaVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(2, '<xs:element name="Bob" type="org.acme:Foo"/>').calledOnce.should.be.ok;
        });

        it('should write a line for a field thats an array', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.getFullyQualifiedTypeName.returns('String');
            mockField.getName.returns('Bob');
            mockField.isArray.returns(true);

            xmlSchemaVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(2, '<xs:element name="Bob" type="xs:string" minOccurs="0" maxOccurs="unbounded"/>').calledOnce.should.be.ok;
        });
    });

    describe('visitEnumValueDeclaration', () => {
        it('should write a line for a enum value', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockEnumValueDecl = sinon.createStubInstance(EnumValueDeclaration);
            mockEnumValueDecl.isEnumValue.returns(true);
            mockEnumValueDecl.getName.returns('Bob');

            xmlSchemaVisitor.visitEnumValueDeclaration(mockEnumValueDecl, param);

            param.fileWriter.writeLine.withArgs(2, '<xs:enumeration value="Bob"/>').calledOnce.should.be.ok;
        });
    });

    describe('visitRelationship', () => {
        it('should write a line for a relationship', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.getFullyQualifiedTypeName.returns('String');
            mockRelationship.getName.returns('Bob');

            xmlSchemaVisitor.visitRelationship(mockRelationship, param);

            param.fileWriter.writeLine.withArgs(1, '+ string Bob');
        });

        it('should write a line for a relationship thats an array', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.getFullyQualifiedTypeName.returns('String');
            mockRelationship.getName.returns('Bob');
            mockRelationship.isArray.returns(true);

            xmlSchemaVisitor.visitRelationship(mockRelationship, param);

            param.fileWriter.writeLine.withArgs(1, '+ string Bob');
        });
    });
});
