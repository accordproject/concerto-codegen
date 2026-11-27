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

const MermaidVisitor = require('../../../../lib/codegen/fromcto/mermaid/mermaidvisitor.js');

const ModelFile = require('@accordproject/concerto-core').ModelFile;
const ModelManager = require('@accordproject/concerto-core').ModelManager;
const ClassDeclaration = require('@accordproject/concerto-core').ClassDeclaration;
const { ScalarDeclaration, MapDeclaration, MapKeyType, MapValueType, RelationshipDeclaration } = require('@accordproject/concerto-core');
const FileWriter = require('@accordproject/concerto-util').FileWriter;

describe('MermaidVisitor', function () {
    let mermaidVisitor;
    let mockFileWriter;

    beforeEach(() => {
        mermaidVisitor = new MermaidVisitor();
        mockFileWriter = sinon.createStubInstance(FileWriter);
    });

    const property1 = {
        getFullyQualifiedTypeName: () => 'String',
        getName: () => 'name',
        isArray: () => false,
        isPrimitive: () => true,
        getType: () => 'String',
    };

    describe('visitModelManager', () => {
        it('should write to model.mmd and start classDiagram', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager = () => true;
            mockModelManager.getModelFiles.returns([]);

            mermaidVisitor.visitModelManager(mockModelManager, param);

            param.fileWriter.openFile.withArgs('model.mmd').calledOnce.should.be.ok;
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'classDiagram']);
            param.fileWriter.closeFile.calledOnce.should.be.ok;
        });
    });

    describe('visitClassDeclaration', () => {
        it('should write the class declaration for a concept with properties', () => {
            let acceptSpy = sinon.spy();
            let param = {
                fileWriter: mockFileWriter
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.isEnum.returns(false);
            mockClassDeclaration.getDecorators.returns([]);
            mockClassDeclaration.getFullyQualifiedName.returns('org.acme.Person');
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy, ...property1
            }]);
            mockClassDeclaration.getSuperType.returns(null);

            mermaidVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'class `org.acme.Person` {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<< concept>>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, '}\n']);
        });

        it('should write the class declaration for an empty concept', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.isEnum.returns(false);
            mockClassDeclaration.getDecorators.returns([]);
            mockClassDeclaration.getFullyQualifiedName.returns('org.acme.Empty');
            mockClassDeclaration.getOwnProperties.returns([]);
            mockClassDeclaration.getSuperType.returns(null);

            mermaidVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'class `org.acme.Empty`']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<< concept>> `org.acme.Empty`\n']);
        });

        it('should write inheritance when class has super type', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.isEnum.returns(false);
            mockClassDeclaration.getDecorators.returns([]);
            mockClassDeclaration.getFullyQualifiedName.returns('org.acme.Employee');
            mockClassDeclaration.getOwnProperties.returns([]);
            mockClassDeclaration.getSuperType.returns('org.acme.Person');

            mermaidVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, '`org.acme.Employee` --|> `org.acme.Person`']);
        });

        it('should write composition relationships when enabled', () => {
            let param = {
                fileWriter: mockFileWriter,
                showCompositionRelationships: true,
            };

            const nonPrimitiveProperty = {
                getFullyQualifiedTypeName: () => 'org.acme.Address',
                getName: () => 'address',
                isArray: () => false,
                isPrimitive: () => false,
                getType: () => 'Address',
                accept: sinon.spy(),
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.isEnum.returns(false);
            mockClassDeclaration.getDecorators.returns([]);
            mockClassDeclaration.getFullyQualifiedName.returns('org.acme.Person');
            mockClassDeclaration.getOwnProperties.returns([nonPrimitiveProperty]);
            mockClassDeclaration.getSuperType.returns(null);

            mermaidVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '`org.acme.Person` "1" *-- "1" `org.acme.Address`']);
        });
    });

    describe('visitMapDeclaration', () => {
        it('should write the map declaration with primitive types', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockMapDeclaration = sinon.createStubInstance(MapDeclaration);
            let mockMapKey = sinon.createStubInstance(MapKeyType);
            let mockMapValue = sinon.createStubInstance(MapValueType);

            mockMapDeclaration.getKey.returns(mockMapKey);
            mockMapDeclaration.getValue.returns(mockMapValue);
            mockMapKey.getType.returns('String');
            mockMapValue.getType.returns('Double');
            mockMapDeclaration.getFullyQualifiedName.returns('org.acme.Rates');

            mermaidVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'class `org.acme.Rates` {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<< map >>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '+ Key:`String`']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([1, '+ Value: `Double`']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, '}\n']);
        });

        it('should resolve fully qualified names for non-primitive map types', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.getFullyQualifiedTypeName.withArgs('Address').returns('org.acme.Address');

            let mockMapDeclaration = sinon.createStubInstance(MapDeclaration);
            let mockMapKey = sinon.createStubInstance(MapKeyType);
            let mockMapValue = sinon.createStubInstance(MapValueType);

            mockMapDeclaration.getKey.returns(mockMapKey);
            mockMapDeclaration.getValue.returns(mockMapValue);
            mockMapKey.getType.returns('String');
            mockMapValue.getType.returns('Address');
            mockMapDeclaration.getModelFile.returns(mockModelFile);
            mockMapDeclaration.getFullyQualifiedName.returns('org.acme.AddressMap');

            mermaidVisitor.visitMapDeclaration(mockMapDeclaration, param);

            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'class `org.acme.AddressMap` {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<< map >>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '+ Key:`String`']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([1, '+ Value: `org.acme.Address`']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, '}\n']);
        });
    });

    describe('visitScalarDeclaration', () => {
        it('should write the class declaration for a scalar', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockScalarDeclaration = sinon.createStubInstance(ScalarDeclaration);
            mockScalarDeclaration.getFullyQualifiedName.returns('org.acme.SSN');
            mockScalarDeclaration.getType.returns('String');

            mermaidVisitor.visitScalarDeclaration(mockScalarDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(4);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'class `org.acme.SSN` {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '<< scalar >>']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '+ String']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '}\n']);
        });
    });

    describe('writeRelationshipAggregation', () => {
        it('should write aggregation for relationships', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            let mockParent = sinon.createStubInstance(ClassDeclaration);
            mockParent.getFullyQualifiedName.returns('org.acme.Order');
            mockRelationship.getParent.returns(mockParent);
            mockRelationship.getFullyQualifiedTypeName.returns('org.acme.Customer');
            mockRelationship.getName.returns('customer');
            mockRelationship.isArray.returns(false);

            mermaidVisitor.writeRelationshipAggregation(mockRelationship, param);

            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '`org.acme.Order` "1" o-- "1" `org.acme.Customer` : customer']);
        });

        it('should write aggregation with array multiplicity for array relationships', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            let mockParent = sinon.createStubInstance(ClassDeclaration);
            mockParent.getFullyQualifiedName.returns('org.acme.Order');
            mockRelationship.getParent.returns(mockParent);
            mockRelationship.getFullyQualifiedTypeName.returns('org.acme.Item');
            mockRelationship.getName.returns('items');
            mockRelationship.isArray.returns(true);

            mermaidVisitor.writeRelationshipAggregation(mockRelationship, param);

            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '`org.acme.Order` "1" o-- "*" `org.acme.Item` : items']);
        });
    });
});
