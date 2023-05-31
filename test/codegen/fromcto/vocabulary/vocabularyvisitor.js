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

const VocabularyVisitor = require('../../../../lib/codegen/fromcto/vocabulary/vocabularyvisitor.js');
const { RelationshipDeclaration } = require('@accordproject/concerto-core');

const ClassDeclaration = require('@accordproject/concerto-core').ClassDeclaration;
const EnumDeclaration = require('@accordproject/concerto-core').EnumDeclaration;
const ScalarDeclaration = require('@accordproject/concerto-core').ScalarDeclaration;
const EnumValueDeclaration = require('@accordproject/concerto-core').EnumValueDeclaration;
const Field = require('@accordproject/concerto-core').Field;
const ModelFile = require('@accordproject/concerto-core').ModelFile;
const ModelManager = require('@accordproject/concerto-core').ModelManager;
const FileWriter = require('@accordproject/concerto-util').FileWriter;

describe('VocabularyVisitor', function () {
    let vocabularyVisitor;
    let mockFileWriter;
    beforeEach(() => {
        vocabularyVisitor = new VocabularyVisitor();
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
            let mockSpecialVisit = sinon.stub(vocabularyVisitor, 'visitModelManager');
            mockSpecialVisit.returns('Duck');

            vocabularyVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitModelFile for a ModelFile', () => {
            let thing = sinon.createStubInstance(ModelFile);
            thing.isModelFile.returns(true);
            let mockSpecialVisit = sinon.stub(vocabularyVisitor, 'visitModelFile');
            mockSpecialVisit.returns('Duck');

            vocabularyVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitDeclaration for a EnumDeclaration', () => {
            let thing = sinon.createStubInstance(EnumDeclaration);
            thing.isEnum.returns(true);
            let mockSpecialVisit = sinon.stub(vocabularyVisitor, 'visitDeclaration');
            mockSpecialVisit.returns('Duck');

            vocabularyVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitDeclaration for a ClassDeclaration', () => {
            let thing = sinon.createStubInstance(ClassDeclaration);
            thing.isClassDeclaration.returns(true);
            let mockSpecialVisit = sinon.stub(vocabularyVisitor, 'visitDeclaration');
            mockSpecialVisit.returns('Duck');

            vocabularyVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitScalarDeclaration for a ScalarDeclaration', () => {
            let thing = sinon.createStubInstance(ScalarDeclaration);
            thing.isScalarDeclaration.returns(true);
            let mockSpecialVisit = sinon.stub(vocabularyVisitor, 'visitScalarDeclaration');
            mockSpecialVisit.returns('Duck');

            vocabularyVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitProperty for a Field', () => {
            let thing = sinon.createStubInstance(Field);
            thing.isField.returns(true);
            let mockSpecialVisit = sinon.stub(vocabularyVisitor, 'visitProperty');
            mockSpecialVisit.returns('Duck');

            vocabularyVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitProperty for a EnumValueDeclaration', () => {
            let thing = sinon.createStubInstance(EnumValueDeclaration);
            thing.isEnumValue.returns(true);
            let mockSpecialVisit = sinon.stub(vocabularyVisitor, 'visitProperty');
            mockSpecialVisit.returns('Goose');

            vocabularyVisitor.visit(thing, param).should.deep.equal('Goose');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitProperty for a Relationship', () => {
            let thing = sinon.createStubInstance(RelationshipDeclaration);
            thing.isRelationship.returns(true);
            let mockSpecialVisit = sinon.stub(vocabularyVisitor, 'visitProperty');
            mockSpecialVisit.returns('Goose');

            vocabularyVisitor.visit(thing, param).should.deep.equal('Goose');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should throw an error when an unrecognised type is supplied', () => {
            let thing = 'Something of unrecognised type';

            (() => {
                vocabularyVisitor.visit(thing, param);
            }).should.throw('Unrecognised type: string, value: \'Something of unrecognised type\'');
        });
    });

    describe('visitModelManager', () => {
        it('should call accept for each model file', () => {
            let acceptSpy = sinon.spy();

            let param = {};

            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);
            mockModelManager.getModelFiles.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }
            ]);

            vocabularyVisitor.visitModelManager(mockModelManager, param);

            acceptSpy.withArgs(vocabularyVisitor, param).calledTwice.should.be.ok;
        });
    });

    describe('visitModelFile', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });

        it('should create a vocabulary file and add locale, namespace and declaration', () => {
            let acceptSpy = sinon.spy();

            let mockSubclassDeclaration1 = sinon.createStubInstance(ClassDeclaration);
            mockSubclassDeclaration1.isClassDeclaration.returns(true);
            mockSubclassDeclaration1.getProperties.returns([]);
            mockSubclassDeclaration1.getNamespace.returns('org.acme.subclasses');
            mockSubclassDeclaration1.getName.returns('ImportedDirectSubclass');

            let mockSubclassDeclaration2 = sinon.createStubInstance(ClassDeclaration);
            mockSubclassDeclaration2.isClassDeclaration.returns(true);
            mockSubclassDeclaration2.getProperties.returns([]);
            mockSubclassDeclaration2.getNamespace.returns('org.acme.subclasses');
            mockSubclassDeclaration2.getName.returns('ImportedDirectSubclass2');

            let mockSubclassDeclaration3 = sinon.createStubInstance(ClassDeclaration);
            mockSubclassDeclaration3.isClassDeclaration.returns(true);
            mockSubclassDeclaration3.getProperties.returns([]);
            mockSubclassDeclaration3.getNamespace.returns('org.acme');
            mockSubclassDeclaration3.getName.returns('LocalDirectSubclass');

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getProperties.returns([]);
            mockClassDeclaration.getDirectSubclasses.returns([
                mockSubclassDeclaration1, mockSubclassDeclaration2, mockSubclassDeclaration3
            ]);
            mockClassDeclaration.accept = acceptSpy;

            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);

            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isModelFile.returns(true);
            mockModelFile.getNamespace.returns('org.acme');
            mockModelFile.getAllDeclarations.returns([
                mockClassDeclaration,
                mockSubclassDeclaration2
            ]);
            mockModelFile.getImports.returns([]);
            mockModelFile.getModelManager.returns(mockModelManager);

            vocabularyVisitor.visitModelFile(mockModelFile, param);

            param.fileWriter.openFile.withArgs('org.acme_en.voc').calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(4);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '#Generated vocabulary for namespace: org.acme']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'locale: en']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'namespace: org.acme']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, 'declarations:']);
            param.fileWriter.closeFile.calledOnce.should.be.ok;

            acceptSpy.withArgs(vocabularyVisitor, param).calledOnce.should.be.ok;
        });
    });

    describe('visitDeclaration for EnumDeclaration', () => {
        it('should write vocabulary for enum declarations', () => {
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

            vocabularyVisitor.visitDeclaration(mockEnumDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(2);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '  - Bob: Bob']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '    properties:']);

            acceptSpy.withArgs(vocabularyVisitor, param).calledTwice.should.be.ok;
        });
    });

    describe('visitDeclaration for ClassDeclaration', () => {
        it('should write vocabulary for class declarations', () => {
            let acceptSpy = sinon.spy();

            let param = {
                fileWriter: mockFileWriter
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getName.returns('Bob');
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);

            vocabularyVisitor.visitDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(2);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '  - Bob: Bob']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '    properties:']);

            acceptSpy.withArgs(vocabularyVisitor, param).calledTwice.should.be.ok;
        });
    });

    describe('visitScalarDeclaration for ScalarDeclaration', () => {
        it('should write vocabulary for scalar declarations', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockScalarDeclaration = sinon.createStubInstance(ScalarDeclaration);
            mockScalarDeclaration.isScalarDeclaration.returns(true);
            mockScalarDeclaration.getName.returns('Bob');

            vocabularyVisitor.visitScalarDeclaration(mockScalarDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(1);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '  - Bob: Bob']);
        });
    });

    describe('visitProperty for Field', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should write a line for field name and its vocabulary in english', () => {
            const mockField = sinon.createStubInstance(Field);
            const mockParent = {
                getName: sinon.stub().returns('Person')
            };
            mockField.getParent.returns(mockParent);
            mockField.isPrimitive.returns(false);
            mockField.getName.returns('name');
            mockField.getType.returns('String');
            mockField.isPrimitive.returns(true);
            vocabularyVisitor.visitProperty(mockField, param);
            param.fileWriter.writeLine.withArgs(0,'      - name: Name of the Person').calledOnce.should.be.ok;
        });
    });

    describe('visitProperty for EnumValueDeclaration', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should write a line for enum value and its vocabulary in english', () => {
            const mockEnumValueDeclaration = sinon.createStubInstance(EnumValueDeclaration);
            const mockParent = {
                getName: sinon.stub().returns('Colors')
            };
            mockEnumValueDeclaration.getParent.returns(mockParent);
            mockEnumValueDeclaration.getName.returns('red');
            vocabularyVisitor.visitProperty(mockEnumValueDeclaration, param);
            param.fileWriter.writeLine.withArgs(0,'      - red: Red of the Colors').calledOnce.should.be.ok;
        });
    });

    describe('visitProperty for Relationship', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should write a line for relationship and its vocabulary in english', () => {
            const mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            const mockParent = {
                getName: sinon.stub().returns('Order')
            };
            mockRelationship.isRelationship.returns(true);
            mockRelationship.getParent.returns(mockParent);
            mockRelationship.getName.returns('orderline');
            vocabularyVisitor.visitProperty(mockRelationship, param);
            param.fileWriter.writeLine.withArgs(0,'      - orderline: Orderline of the Order').calledOnce.should.be.ok;
        });
    });
});