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

const JavaVisitor = require('../../../../lib/codegen/fromcto/java/javavisitor.js');

const ClassDeclaration = require('@accordproject/concerto-core').ClassDeclaration;
const MapDeclaration = require('@accordproject/concerto-core').MapDeclaration;
const ModelUtil = require('@accordproject/concerto-core').ModelUtil;
const EnumDeclaration = require('@accordproject/concerto-core').EnumDeclaration;
const EnumValueDeclaration = require('@accordproject/concerto-core').EnumValueDeclaration;
const Field = require('@accordproject/concerto-core').Field;
const ModelFile = require('@accordproject/concerto-core').ModelFile;
const ModelManager = require('@accordproject/concerto-core').ModelManager;
const RelationshipDeclaration = require('@accordproject/concerto-core').RelationshipDeclaration;
const FileWriter = require('@accordproject/concerto-util').FileWriter;

let sandbox = sinon.createSandbox();

describe('JavaVisitor', function () {
    let javaVisit;
    let mockFileWriter;
    beforeEach(() => {
        javaVisit = new JavaVisitor();
        mockFileWriter = sinon.createStubInstance(FileWriter);
        sandbox.stub(ModelUtil, 'isMap').callsFake(() => {
            return false;
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('visit', () => {
        let param;
        beforeEach(() => {
            param = {
                property1: 'value1'
            };
        });

        it('should call visitModelManager for a ModelManager', () => {
            let thing = sinon.createStubInstance(ModelManager);
            thing.isModelManager.returns(true);
            let mockSpecialVisit = sinon.stub(javaVisit, 'visitModelManager');
            mockSpecialVisit.returns('Duck');

            javaVisit.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should default to callint visitModelManager with no options', () => {
            let thing = sinon.createStubInstance(ModelManager);
            thing.isModelManager.returns(true);
            let mockSpecialVisit = sinon.stub(javaVisit, 'visitModelManager');
            mockSpecialVisit.returns('Duck');

            javaVisit.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should call visitModelFile for a ModelFile', () => {
            let thing = sinon.createStubInstance(ModelFile);
            thing.isModelFile.returns(true);
            thing.getNamespace.returns('animal');
            let mockSpecialVisit = sinon.stub(javaVisit, 'visitModelFile');
            mockSpecialVisit.returns('Duck');

            javaVisit.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should call visitEnumDeclaration for a EnumDeclaration', () => {
            let thing = sinon.createStubInstance(EnumDeclaration);
            thing.isEnum.returns(true);
            let mockSpecialVisit = sinon.stub(javaVisit, 'visitEnumDeclaration');
            mockSpecialVisit.returns('Duck');

            javaVisit.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should call visitClassDeclaration for a ClassDeclaration', () => {
            let thing = sinon.createStubInstance(ClassDeclaration);
            thing.isClassDeclaration.returns(true);
            let mockSpecialVisit = sinon.stub(javaVisit, 'visitClassDeclaration');
            mockSpecialVisit.returns('Duck');

            javaVisit.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should call visitField for a Field', () => {
            let thing = sinon.createStubInstance(Field);
            thing.isField.returns(true);
            let mockSpecialVisit = sinon.stub(javaVisit, 'visitField');
            mockSpecialVisit.returns('Duck');

            javaVisit.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should call visitRelationship for a RelationshipDeclaration', () => {
            let thing = sinon.createStubInstance(RelationshipDeclaration);
            thing.isRelationship.returns(true);
            let mockSpecialVisit = sinon.stub(javaVisit, 'visitRelationship');
            mockSpecialVisit.returns('Duck');

            javaVisit.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should call visitEnumValueDeclaration for a EnumValueDeclaration', () => {
            let thing = sinon.createStubInstance(EnumValueDeclaration);
            thing.isEnumValue.returns(true);
            let mockSpecialVisit = sinon.stub(javaVisit, 'visitEnumValueDeclaration');
            mockSpecialVisit.returns('Duck');

            javaVisit.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should throw an error when an unrecognised type is supplied', () => {
            let thing = 'Something of unrecognised type';

            (() => {
                javaVisit.visit(thing, param);
            }).should.throw('Unrecognised type: string, value: \'Something of unrecognised type\'');
        });
    });

    describe('visitModelFile', () => {
        it('should call accept for each declaration', () => {
            let param = {
                property1: 'value1'
            };

            let acceptSpy = sinon.spy();
            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isModelFile.returns(true);
            mockModelFile.getAllDeclarations.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);

            javaVisit.visitModelFile(mockModelFile, param);

            acceptSpy.withArgs(javaVisit, param).calledTwice.should.be.ok;
        });
    });

    describe('startClassFile', () => {
        it('should write a java class file header', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockClass = sinon.createStubInstance(ClassDeclaration);
            mockClass.isClassDeclaration.returns(true);
            mockClass.getNamespace.returns('org.acme.people');
            mockClass.getModelFile.returns({
                getNamespace: () => {
                    return 'org.acme.people';
                },
                getName: () => {
                    return 'Bob';
                }
            });

            javaVisit.startClassFile(mockClass, param);

            param.fileWriter.openFile.withArgs('org/acme/people/bob.java');
            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '// this code is generated and should not be modified']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'package org.acme.people;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, '']);
        });
    });

    describe('endClassFile', () => {
        it('should close a java class file', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockClass = sinon.createStubInstance(ClassDeclaration);
            mockClass.isClassDeclaration.returns(true);

            javaVisit.endClassFile(mockClass, param);

            param.fileWriter.closeFile.calledOnce.should.be.ok;
        });
    });

    describe('visitEnumDeclaration', () => {
        it('should write an enum declaration and call accept on each property', () => {
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

            let mockStartClassFile = sinon.stub(javaVisit, 'startClassFile');
            let mockEndClassFile = sinon.stub(javaVisit, 'endClassFile');

            javaVisit.visitEnumDeclaration(mockEnumDeclaration, param);

            mockStartClassFile.withArgs(mockEnumDeclaration, param).calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(4);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'import com.fasterxml.jackson.annotation.*;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '@JsonIgnoreProperties({"$class"})']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'public enum Bob {']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '}']);
            mockEndClassFile.withArgs(mockEnumDeclaration, param).calledOnce.should.be.ok;
        });
    });

    describe('visitClassDeclaration', () => {
        let acceptSpy;
        let param;
        let mockClassDeclaration;
        let mockStartClassFile;
        let mockEndClassFile;
        beforeEach(() => {
            acceptSpy = sinon.spy();

            param = {
                fileWriter: mockFileWriter
            };

            mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getName.returns('Bob');
            mockClassDeclaration.getNamespace.returns('people');
            mockClassDeclaration.getModelFile.returns({
                getImports: () => {
                    return ['fruit.oranges', 'fruit.apples'];
                }
            });
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.isConcept.returns(false);
            mockClassDeclaration.isAbstract.returns(false);
            mockClassDeclaration.getSuperType.returns(false);
            mockClassDeclaration.getIdentifierFieldName.returns(false);

            mockStartClassFile = sinon.stub(javaVisit, 'startClassFile');
            mockEndClassFile = sinon.stub(javaVisit, 'endClassFile');
        });

        it('should write a class declaration and call accept on each property', () => {
            javaVisit.visitClassDeclaration(mockClassDeclaration, param);

            mockStartClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'import fruit.oranges;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'import fruit.apples;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'import com.fasterxml.jackson.annotation.*;']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, 'public class Bob {']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '}']);
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'field'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'getter'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'setter'})).calledTwice.should.be.ok;
            mockEndClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
        });

        it('should write a concept class declaration and call accept on each property', () => {
            mockClassDeclaration.isConcept.returns(true);

            javaVisit.visitClassDeclaration(mockClassDeclaration, param);

            mockStartClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(7);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'import fruit.oranges;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'import fruit.apples;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'import com.fasterxml.jackson.annotation.*;']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, '@JsonTypeInfo(use = JsonTypeInfo.Id.CLASS, property = "$class")']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, 'public class Bob {']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([0, '}']);
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'field'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'getter'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'setter'})).calledTwice.should.be.ok;
            mockEndClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
        });

        it('should write an abstract class declaration and call accept on each property', () => {
            mockClassDeclaration.isAbstract.returns(true);

            javaVisit.visitClassDeclaration(mockClassDeclaration, param);

            mockStartClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'import fruit.oranges;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'import fruit.apples;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'import com.fasterxml.jackson.annotation.*;']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, 'public abstract class Bob {']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '}']);
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'field'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'getter'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'setter'})).calledTwice.should.be.ok;
            mockEndClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
        });

        it('should write a super type class declaration and call accept on each property', () => {
            mockClassDeclaration.getSuperType.returns('org.acme.Person');

            javaVisit.visitClassDeclaration(mockClassDeclaration, param);

            mockStartClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'import fruit.oranges;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'import fruit.apples;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'import com.fasterxml.jackson.annotation.*;']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, 'public class Bob extends Person {']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '}']);
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'field'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'getter'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'setter'})).calledTwice.should.be.ok;
            mockEndClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
        });

        it('should write a class declaration, including a function to access the id field and call accept on each property', () => {
            mockClassDeclaration.getIdentifierFieldName.returns('employeeID');
            javaVisit.visitClassDeclaration(mockClassDeclaration, param);

            mockStartClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(7);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'import fruit.oranges;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'import fruit.apples;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'import com.fasterxml.jackson.annotation.*;']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, '']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, 'public class Bob {']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([1, `
   // the accessor for the identifying field
   public String getID() {
      return this.getEmployeeID();
   }
`]);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([0, '}']);
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'field'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'getter'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'setter'})).calledTwice.should.be.ok;
            mockEndClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
        });

        it('should write a class declaration, including imports for java.util Map & HashMap types', () => {
            mockClassDeclaration.getIdentifierFieldName.returns('employeeID');
            sandbox.restore();
            sandbox.stub(ModelUtil, 'isMap').callsFake(() => {
                return true;
            });
            javaVisit.visitClassDeclaration(mockClassDeclaration, param);

            mockStartClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.deep.equal(9);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'import fruit.oranges;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'import fruit.apples;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'import java.util.HashMap;']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, 'import java.util.Map;']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([0, 'import com.fasterxml.jackson.annotation.*;']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([0, 'public class Bob {']);
            param.fileWriter.writeLine.getCall(7).args.should.deep.equal([1, `
   // the accessor for the identifying field
   public String getID() {
      return this.getEmployeeID();
   }
`]);
            param.fileWriter.writeLine.getCall(8).args.should.deep.equal([0, '}']);
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'field'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'getter'})).calledTwice.should.be.ok;
            acceptSpy.withArgs(javaVisit, Object.assign({},param,{mode:'setter'})).calledTwice.should.be.ok;
            mockEndClassFile.withArgs(mockClassDeclaration, param).calledOnce.should.be.ok;
        });
    });

    describe('visitField', () => {
        let param;

        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });

        it('should default to write a line defining a field', () => {
            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.isArray.returns(false);
            mockField.getName.returns('Bob');
            mockField.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'private JavaType Bob;').calledOnce.should.be.ok;
        });

        it('should default to write a line defining a field and add [] if an array', () => {
            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.isArray.returns(true);
            mockField.getName.returns('Bob');
            mockField.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'private JavaType[] Bob;').calledOnce.should.be.ok;
        });

        it('should write a line with a HashMap', () => {
            let param = {
                fileWriter: mockFileWriter,
                mode: 'field'
            };

            sandbox.restore();
            sandbox.stub(ModelUtil, 'isMap').callsFake(() => {
                return true;
            });

            const mockField             = sinon.createStubInstance(Field);
            const getType               = sinon.stub();

            mockField.ast = { type: { name: 'Dummy Value'} };
            mockField.getModelFile.returns({ getType: getType });

            const mockMapDeclaration    = sinon.createStubInstance(MapDeclaration);
            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();

            mockField.getName.returns('Bob');
            mockField.getType.returns('SpecialType');

            getType.returns(mockMapDeclaration);
            getKeyType.returns('String');
            getValueType.returns('String');
            mockField.getName.returns('Map1');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.isMapDeclaration.returns(true);
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            javaVisit.visitField(mockField,param);

            param.fileWriter.writeLine.withArgs(1, 'private Map<String, String> Map1 = new HashMap<>();').calledOnce.should.be.ok;
            sandbox.reset();
        });

        it('should write a line defining a field', () => {
            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.isArray.returns(false);
            mockField.getName.returns('Bob');
            mockField.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitField(mockField, Object.assign({},param,{mode:'field'}));
            param.fileWriter.writeLine.withArgs(1, 'private JavaType Bob;').calledOnce.should.be.ok;
        });

        it('should write a line defining a field and add [] if an array', () => {
            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.isArray.returns(true);
            mockField.getName.returns('Bob');
            mockField.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitField(mockField, Object.assign({},param,{mode:'field'}));
            param.fileWriter.writeLine.withArgs(1, 'private JavaType[] Bob;').calledOnce.should.be.ok;
        });

        it('should write a line setting a field', () => {
            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.isArray.returns(false);
            mockField.getName.returns('Bob');
            mockField.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitField(mockField, Object.assign({},param,{mode:'setter'}));
            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([1, 'public void setBob(JavaType Bob) {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([2, 'this.Bob = Bob;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '}']);
        });

        it('should write a line setting a field and add [] if an array', () => {
            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.isArray.returns(true);
            mockField.getName.returns('Bob');
            mockField.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitField(mockField, Object.assign({},param,{mode:'setter'}));
            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([1, 'public void setBob(JavaType[] Bob) {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([2, 'this.Bob = Bob;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '}']);
        });

        it('should write a line getting a field', () => {
            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.isArray.returns(false);
            mockField.getName.returns('Bob');
            mockField.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitField(mockField, Object.assign({},param,{mode:'getter'}));
            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([1, 'public JavaType getBob() {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([2, 'return this.Bob;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '}']);
        });

        it('should write a line getting a field and add [] if an array', () => {
            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.isArray.returns(true);
            mockField.getName.returns('Bob');
            mockField.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitField(mockField, Object.assign({},param,{mode:'getter'}));
            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([1, 'public JavaType[] getBob() {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([2, 'return this.Bob;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '}']);
        });
    });

    describe('visitEnumValueDeclaration', () => {
        it('should write a line with the enum value', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockEnumValueDeclaration = sinon.createStubInstance(EnumValueDeclaration);
            mockEnumValueDeclaration.isEnumValue.returns(true);
            mockEnumValueDeclaration.getName.returns('Bob');

            javaVisit.visitEnumValueDeclaration(mockEnumValueDeclaration, param);
            param.fileWriter.writeLine.withArgs(1, 'Bob,').calledOnce.should.be.ok;
        });
    });

    describe('visitRelationship', () => {
        let param;

        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });

        it('should default to write a line defining a field', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.isArray.returns(false);
            mockRelationship.getName.returns('Bob');
            mockRelationship.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitRelationship(mockRelationship, param);
            param.fileWriter.writeLine.withArgs(1, 'private JavaType Bob;').calledOnce.should.be.ok;
        });

        it('should default to write a line defining a field and add [] if an array', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.isArray.returns(true);
            mockRelationship.getName.returns('Bob');
            mockRelationship.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitRelationship(mockRelationship, param);
            param.fileWriter.writeLine.withArgs(1, 'private JavaType[] Bob;').calledOnce.should.be.ok;
        });
        it('should write a line defining a field', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.isArray.returns(false);
            mockRelationship.getName.returns('Bob');
            mockRelationship.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitRelationship(mockRelationship, Object.assign({},param,{mode:'field'}));
            param.fileWriter.writeLine.withArgs(1, 'private JavaType Bob;').calledOnce.should.be.ok;
        });

        it('should write a line defining a field and add [] if an array', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.isArray.returns(true);
            mockRelationship.getName.returns('Bob');
            mockRelationship.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitRelationship(mockRelationship, Object.assign({},param,{mode:'field'}));
            param.fileWriter.writeLine.withArgs(1, 'private JavaType[] Bob;').calledOnce.should.be.ok;
        });

        it('should write a line setting a field', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.isArray.returns(false);
            mockRelationship.getName.returns('Bob');
            mockRelationship.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitRelationship(mockRelationship, Object.assign({},param,{mode:'setter'}));
            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([1, 'public void setBob(JavaType Bob) {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([2, 'this.Bob = Bob;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '}']);
        });

        it('should write a line setting a field and add [] if an array', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.isArray.returns(true);
            mockRelationship.getName.returns('Bob');
            mockRelationship.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitRelationship(mockRelationship, Object.assign({},param,{mode:'setter'}));
            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([1, 'public void setBob(JavaType[] Bob) {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([2, 'this.Bob = Bob;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '}']);
        });

        it('should write a line getting a field', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.isArray.returns(false);
            mockRelationship.getName.returns('Bob');
            mockRelationship.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitRelationship(mockRelationship, Object.assign({},param,{mode:'getter'}));
            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([1, 'public JavaType getBob() {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([2, 'return this.Bob;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '}']);
        });

        it('should write a line getting a field and add [] if an array', () => {
            let mockRelationship = sinon.createStubInstance(RelationshipDeclaration);
            mockRelationship.isRelationship.returns(true);
            mockRelationship.isArray.returns(true);
            mockRelationship.getName.returns('Bob');
            mockRelationship.getType.returns('SpecialType');
            let mockJavaType = sinon.stub(javaVisit, 'toJavaType');
            mockJavaType.returns('JavaType');

            javaVisit.visitRelationship(mockRelationship, Object.assign({},param,{mode:'getter'}));
            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([1, 'public JavaType[] getBob() {']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([2, 'return this.Bob;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([1, '}']);
        });
    });

    describe('toJavaType', () => {
        it('should return java.util.Date for DateTime', () => {
            javaVisit.toJavaType('DateTime').should.deep.equal('java.util.Date');
        });

        it('should return boolean for Boolean', () => {
            javaVisit.toJavaType('Boolean').should.deep.equal('boolean');
        });

        it('should return String for String', () => {
            javaVisit.toJavaType('String').should.deep.equal('String');
        });

        it('should return double for Double', () => {
            javaVisit.toJavaType('Double').should.deep.equal('double');
        });

        it('should return long for Long', () => {
            javaVisit.toJavaType('Long').should.deep.equal('long');
        });

        it('should return int for Integer', () => {
            javaVisit.toJavaType('Integer').should.deep.equal('int');
        });

        it('should return the param as default', () => {
            javaVisit.toJavaType('Penguin').should.deep.equal('Penguin');
        });
    });
});
