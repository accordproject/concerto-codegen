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

const MarkdownVisitor = require('../../../../lib/codegen/fromcto/markdown/markdownvisitor.js');

const {
    ModelFile,
    ModelManager,
    AssetDeclaration,
    ParticipantDeclaration,
    TransactionDeclaration,
    EventDeclaration,
    ClassDeclaration,
    EnumDeclaration,
    EnumValueDeclaration,
    Field,
    MapDeclaration,
    ScalarDeclaration,
    Decorator,
} = require('@accordproject/concerto-core');
const FileWriter = require('@accordproject/concerto-util').FileWriter;

describe('MarkdownVisitor', function () {
    let markdownVisitor;
    let mockFileWriter;

    beforeEach(() => {
        markdownVisitor = new MarkdownVisitor();
        mockFileWriter = sinon.createStubInstance(FileWriter);
    });

    describe('visitModelManager', () => {
        it('should open models.md and visit all model files', () => {
            const mockModelManager = sinon.createStubInstance(ModelManager);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelManager.getModelFiles.returns([mockModelFile]);

            const param = { fileWriter: mockFileWriter };
            markdownVisitor.visitModelManager(mockModelManager, param);

            mockFileWriter.openFile.calledWith('models.md').should.be.ok;
            mockModelFile.accept.calledOnce.should.be.ok;
            mockFileWriter.closeFile.calledOnce.should.be.ok;
        });
    });

    describe('visitModelFile', () => {
        it('should render overview counts, imports, and diagram', () => {
            const mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.getNamespace.returns('org.acme.test');
            mockModelFile.getConceptDeclarations.returns([{}]);
            mockModelFile.getEnumDeclarations.returns([{}]);
            mockModelFile.getMapDeclarations.returns([{}]);
            mockModelFile.getScalarDeclarations.returns([{}]);
            mockModelFile.getAssetDeclarations.returns([{}]);
            mockModelFile.getParticipantDeclarations.returns([{}]);
            mockModelFile.getTransactionDeclarations.returns([{}]);
            mockModelFile.getEventDeclarations.returns([{}]);
            mockModelFile.getAllDeclarations.returns([]);
            mockModelFile.getDecorators.returns([]);
            mockModelFile.getImports.returns(['org.acme.base.BaseConcept']);

            const param = { fileWriter: mockFileWriter };
            markdownVisitor.visitModelFile(mockModelFile, param);

            mockFileWriter.writeLine.calledWith(0, '# Namespace org.acme.test').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '- 1 concepts').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '- 1 maps').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '- 1 scalars').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '- org.acme.base.BaseConcept').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '## Classes').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '## Diagram').should.be.ok;
        });
    });

    describe('visit declarations with correct stereotypes', () => {
        let param;
        beforeEach(() => {
            param = { fileWriter: mockFileWriter, stack: [] };
        });

        it('should visit ClassDeclaration as Concept by default', () => {
            const mockClass = sinon.createStubInstance(ClassDeclaration);
            mockClass.getName.returns('MyConcept');
            mockClass.getFullyQualifiedName.returns('org.acme.MyConcept');
            mockClass.getDecorator.withArgs('description').returns(null);
            mockClass.isAbstract.returns(false);
            mockClass.getSuperType.returns(null);
            mockClass.getProperties.returns([]);
            mockClass.getDecorators.returns([]);

            markdownVisitor.visitClassDeclaration(mockClass, param);
            mockFileWriter.writeLine.calledWith(0, '### MyConcept (Concept)').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, 'No fields.').should.be.ok;
        });

        it('should visit AssetDeclaration as Asset', () => {
            const mockAsset = sinon.createStubInstance(AssetDeclaration);
            mockAsset.getName.returns('Vehicle');
            mockAsset.getFullyQualifiedName.returns('org.acme.Vehicle');
            mockAsset.getDecorator.withArgs('description').returns(null);
            mockAsset.isAbstract.returns(false);
            mockAsset.getSuperType.returns(null);
            mockAsset.getProperties.returns([]);
            mockAsset.getDecorators.returns([]);

            markdownVisitor.visitAssetDeclaration(mockAsset, param);
            mockFileWriter.writeLine.calledWith(0, '### Vehicle (Asset)').should.be.ok;
        });

        it('should visit ParticipantDeclaration as Participant', () => {
            const mockParticipant = sinon.createStubInstance(ParticipantDeclaration);
            mockParticipant.getName.returns('Customer');
            mockParticipant.getFullyQualifiedName.returns('org.acme.Customer');
            mockParticipant.getDecorator.withArgs('description').returns(null);
            mockParticipant.isAbstract.returns(false);
            mockParticipant.getSuperType.returns(null);
            mockParticipant.getProperties.returns([]);
            mockParticipant.getDecorators.returns([]);

            markdownVisitor.visitParticipantDeclaration(mockParticipant, param);
            mockFileWriter.writeLine.calledWith(0, '### Customer (Participant)').should.be.ok;
        });

        it('should visit TransactionDeclaration as Transaction', () => {
            const mockTx = sinon.createStubInstance(TransactionDeclaration);
            mockTx.getName.returns('Pay');
            mockTx.getFullyQualifiedName.returns('org.acme.Pay');
            mockTx.getDecorator.withArgs('description').returns(null);
            mockTx.isAbstract.returns(false);
            mockTx.getSuperType.returns(null);
            mockTx.getProperties.returns([]);
            mockTx.getDecorators.returns([]);

            markdownVisitor.visitTransactionDeclaration(mockTx, param);
            mockFileWriter.writeLine.calledWith(0, '### Pay (Transaction)').should.be.ok;
        });

        it('should visit EventDeclaration as Event', () => {
            const mockEvent = sinon.createStubInstance(EventDeclaration);
            mockEvent.getName.returns('PaymentSent');
            mockEvent.getFullyQualifiedName.returns('org.acme.PaymentSent');
            mockEvent.getDecorator.withArgs('description').returns(null);
            mockEvent.isAbstract.returns(false);
            mockEvent.getSuperType.returns(null);
            mockEvent.getProperties.returns([]);
            mockEvent.getDecorators.returns([]);

            markdownVisitor.visitEventDeclaration(mockEvent, param);
            mockFileWriter.writeLine.calledWith(0, '### PaymentSent (Event)').should.be.ok;
        });

        it('should render description, abstract status, supertype, and fields with Constraints table header', () => {
            const mockClass = sinon.createStubInstance(ClassDeclaration);
            mockClass.getName.returns('BaseVehicle');
            mockClass.getFullyQualifiedName.returns('org.acme.BaseVehicle');

            const mockDesc = sinon.createStubInstance(Decorator);
            mockDesc.getArguments.returns(['Vehicle base concept']);
            mockClass.getDecorator.withArgs('description').returns(mockDesc);
            mockClass.isAbstract.returns(true);
            mockClass.getSuperType.returns('org.acme.Entity');

            const mockSuperClass = sinon.createStubInstance(ClassDeclaration);
            const mockSuperModelFile = sinon.createStubInstance(ModelFile);
            mockSuperModelFile.isSystemModelFile.returns(false);
            mockSuperClass.getModelFile.returns(mockSuperModelFile);

            const mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.getType.withArgs('org.acme.Entity').returns(mockSuperClass);

            const mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClass.getModelFile.returns(mockModelFile);

            const mockProp = sinon.createStubInstance(Field);
            mockClass.getProperties.returns([mockProp]);
            mockClass.getDecorators.returns([]);

            markdownVisitor.visitClassDeclaration(mockClass, param);

            mockFileWriter.writeLine.calledWith(0, 'Vehicle base concept').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, ' - Is abstract and cannot be instantiated').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, ' - Inherits fields from <code>org.acme.Entity</code>').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '| Field | Type | Required | Identifier | Reference | Inherited | Description | Constraints | ').should.be.ok;
            mockProp.accept.calledOnce.should.be.ok;
        });
    });

    describe('visitEnumDeclaration and visitEnumValueDeclaration', () => {
        let param;
        beforeEach(() => {
            param = { fileWriter: mockFileWriter, stack: [] };
        });

        it('should render enum with description and values', () => {
            const mockEnum = sinon.createStubInstance(EnumDeclaration);
            mockEnum.getName.returns('Status');
            mockEnum.getFullyQualifiedName.returns('org.acme.Status');

            const mockDesc = sinon.createStubInstance(Decorator);
            mockDesc.getArguments.returns(['Order status']);
            mockEnum.getDecorator.withArgs('description').returns(mockDesc);

            const mockVal = sinon.createStubInstance(EnumValueDeclaration);
            mockEnum.getProperties.returns([mockVal]);
            mockEnum.getOwnProperties.returns([mockVal]);
            mockEnum.getDecorators.returns([]);

            markdownVisitor.visitEnumDeclaration(mockEnum, param);

            mockFileWriter.writeLine.calledWith(0, '### Status (Enumeration)').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, 'Order status').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '| Value | Description | ').should.be.ok;
            mockVal.accept.calledOnce.should.be.ok;
        });

        it('should render enum with no values', () => {
            const mockEnum = sinon.createStubInstance(EnumDeclaration);
            mockEnum.getName.returns('EmptyEnum');
            mockEnum.getFullyQualifiedName.returns('org.acme.EmptyEnum');
            mockEnum.getDecorator.withArgs('description').returns(null);
            mockEnum.getProperties.returns([]);
            mockEnum.getDecorators.returns([]);

            markdownVisitor.visitEnumDeclaration(mockEnum, param);
            mockFileWriter.writeLine.calledWith(0, 'No values.').should.be.ok;
        });

        it('should render an enum value with its description', () => {
            const mockVal = sinon.createStubInstance(EnumValueDeclaration);
            mockVal.getName.returns('ACTIVE');
            const mockDesc = sinon.createStubInstance(Decorator);
            mockDesc.getArguments.returns(['Currently active']);
            mockVal.getDecorator.withArgs('description').returns(mockDesc);

            markdownVisitor.visitEnumValueDeclaration(mockVal, param);
            mockFileWriter.writeLine.calledWith(0, '| ACTIVE |Currently active |').should.be.ok;
        });
    });

    describe('visitMapDeclaration', () => {
        let param;
        beforeEach(() => {
            param = { fileWriter: mockFileWriter, stack: [] };
        });

        it('should render map heading, description, and key/value table', () => {
            const mockMap = sinon.createStubInstance(MapDeclaration);
            mockMap.getName.returns('Metadata');
            mockMap.getFullyQualifiedName.returns('org.acme.Metadata');

            const mockDesc = sinon.createStubInstance(Decorator);
            mockDesc.getArguments.returns(['A metadata map']);
            mockMap.getDecorator.withArgs('description').returns(mockDesc);

            mockMap.getKey.returns({ getType: () => 'String' });
            mockMap.getValue.returns({ getType: () => 'Integer' });
            mockMap.getDecorators.returns([]);

            markdownVisitor.visitMapDeclaration(mockMap, param);

            mockFileWriter.writeLine.calledWith(0, '### Metadata (Map)').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, 'A metadata map').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '| Key Type | Value Type |').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '| <code>String</code> | <code>Integer</code> |').should.be.ok;
        });
    });

    describe('visitScalarDeclaration', () => {
        let param;
        beforeEach(() => {
            param = { fileWriter: mockFileWriter, stack: [] };
        });

        it('should render scalar with default value, validators, and description', () => {
            const mockScalar = sinon.createStubInstance(ScalarDeclaration);
            mockScalar.getName.returns('SSN');
            mockScalar.getFullyQualifiedName.returns('org.acme.SSN');
            mockScalar.getType.returns('String');
            mockScalar.getDefaultValue.returns('000-00-0000');

            const mockDesc = sinon.createStubInstance(Decorator);
            mockDesc.getArguments.returns(['Social security number']);
            mockScalar.getDecorator.withArgs('description').returns(mockDesc);

            mockScalar.getValidator.returns({
                getMinLength: () => 11,
                getMaxLength: () => 11,
                getRegex: () => '\\d{3}-\\d{2}-\\d{4}',
                getLowerBound: () => 1,
                getUpperBound: () => 10,
            });
            mockScalar.getDecorators.returns([]);

            markdownVisitor.visitScalarDeclaration(mockScalar, param);

            mockFileWriter.writeLine.calledWith(0, '### SSN (Scalar)').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, 'Social security number').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '| Type | Default Value | Constraints |').should.be.ok;
            mockFileWriter.writeLine.calledWith(
                0,
                '| <code>String</code> | <code>000-00-0000</code> | Minimum Length: 11<br>Maximum Length: 11<br>Matches Regular Expression: `\\d{3}-\\d{2}-\\d{4}`<br>Minimum Value: 1<br>Maximum Value: 10 |'
            ).should.be.ok;
        });
    });

    describe('visitField and visitScalarField', () => {
        let param;
        beforeEach(() => {
            param = { fileWriter: mockFileWriter, stack: ['org.acme.Vehicle'] };
        });

        it('should ignore system fields', () => {
            const mockField = sinon.createStubInstance(Field);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isSystemModelFile.returns(true);
            mockField.getModelFile.returns(mockModelFile);

            markdownVisitor.visitField(mockField, param);
            mockFileWriter.writeLine.called.should.be.false;
        });

        it('should render field with validators, constraints, and array flag', () => {
            const mockField = sinon.createStubInstance(Field);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isSystemModelFile.returns(false);
            mockField.getModelFile.returns(mockModelFile);

            mockField.getName.returns('tags');
            mockField.getFullyQualifiedTypeName.returns('String');
            mockField.isArray.returns(true);
            mockField.isOptional.returns(false);
            mockField.isRelationship = sinon.stub().returns(false);

            const mockParent = sinon.createStubInstance(ClassDeclaration);
            mockParent.getFullyQualifiedName.returns('org.acme.Vehicle');
            mockParent.getIdentifierFieldName.returns('id');
            mockField.getParent.returns(mockParent);

            mockField.getDecorator = sinon.stub().withArgs('description').returns(null);
            mockField.getValidator = sinon.stub().returns({
                getMinLength: () => 2,
                getMaxLength: () => 10,
                getRegex: () => '[a-z]+',
            });
            mockField.getSizeValidator = sinon.stub().returns({
                getMinSize: () => 1,
                getMaxSize: () => 5,
            });

            markdownVisitor.visitField(mockField, param);

            mockFileWriter.writeLine.calledWith(
                0,
                '| tags | <code>String[]</code> | ✔️ |  |  |  |  | Minimum Length: 2<br>Maximum Length: 10<br>Matches Regular Expression: `[a-z]+`<br>Minimum Size: 1<br>Maximum Size: 5 |'
            ).should.be.ok;
        });

        it('should call visitField from visitScalarField', () => {
            const mockField = sinon.createStubInstance(Field);
            const spy = sinon.spy(markdownVisitor, 'visitField');
            const mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isSystemModelFile.returns(true);
            mockField.getModelFile.returns(mockModelFile);

            markdownVisitor.visitScalarField(mockField, param);
            spy.calledWith(mockField, param).should.be.ok;
        });
    });

    describe('visitDecorator', () => {
        let param;
        beforeEach(() => {
            param = { fileWriter: mockFileWriter };
        });

        it('should render example decorator', () => {
            const mockDec = sinon.createStubInstance(Decorator);
            mockDec.getName.returns('example');
            mockDec.getArguments.returns(['var x = 1;']);

            markdownVisitor.visitDecorator(mockDec, param);
            mockFileWriter.writeLine.calledWith(0, '#### Example Usage').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, 'var x = 1;').should.be.ok;
        });

        it('should render usedBy decorator', () => {
            const mockDec = sinon.createStubInstance(Decorator);
            mockDec.getName.returns('usedBy');
            mockDec.getArguments.returns(['BillingService', 'AuthService']);

            markdownVisitor.visitDecorator(mockDec, param);
            mockFileWriter.writeLine.calledWith(0, '#### Used By').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '|BillingService|').should.be.ok;
            mockFileWriter.writeLine.calledWith(0, '|AuthService|').should.be.ok;
        });

        it('should ignore other decorators', () => {
            const mockDec = sinon.createStubInstance(Decorator);
            mockDec.getName.returns('custom');

            markdownVisitor.visitDecorator(mockDec, param);
            mockFileWriter.writeLine.called.should.be.false;
        });
    });
});
