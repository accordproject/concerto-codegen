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

const fs = require('fs');
const path = require('path');
const { InMemoryWriter } = require('@accordproject/concerto-util');
const chai = require('chai');
chai.should();
const sinon = require('sinon');

const CSharpVisitor = require('../../../../lib/codegen/fromcto/csharp/csharpvisitor.js');

const ClassDeclaration = require('@accordproject/concerto-core').ClassDeclaration;
const EnumDeclaration = require('@accordproject/concerto-core').EnumDeclaration;
const { ModelUtil, MapDeclaration } = require('@accordproject/concerto-core');
const EnumValueDeclaration = require('@accordproject/concerto-core').EnumValueDeclaration;
const Field = require('@accordproject/concerto-core').Field;
const ModelFile = require('@accordproject/concerto-core').ModelFile;
const ModelManager = require('@accordproject/concerto-core').ModelManager;
const RelationshipDeclaration = require('@accordproject/concerto-core').RelationshipDeclaration;
const FileWriter = require('@accordproject/concerto-util').FileWriter;
const csharpBuiltInTypes = ['bool','byte','char','decimal','double','float','int','long','nint','nuint','sbyte','short',
    'string','uint','ulong','ushort'];
let sandbox = sinon.createSandbox();

describe('CSharpVisitor', function () {
    let csharpVisitor;
    let mockFileWriter;

    beforeEach(() => {
        csharpVisitor = new CSharpVisitor();
        mockFileWriter = sinon.createStubInstance(FileWriter);
        sandbox.stub(ModelUtil, 'isMap').callsFake(() => {
            return false;
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('visit improved', () => {
        let fileWriter;

        beforeEach(() => {
            fileWriter = new InMemoryWriter();
        });

        it('should default namespaces using just the name portion of the namespace', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            concept Thing {}
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file = files.get('org.acme@1.2.3.cs');
            file.should.match(/namespace org.acme;/);
        });

        it('should default imported namespaces using just the name portion of the namespace', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme.other@2.3.4

            concept OtherThing {}
            `);
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            import org.acme.other@2.3.4.{ OtherThing }

            concept Thing {
                o OtherThing otherThing
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace org.acme;/);
            file1.should.match(/using org.acme.other;/);
            const file2 = files.get('org.acme.other@2.3.4.cs');
            file2.should.match(/namespace org.acme.other;/);
        });

        csharpBuiltInTypes.forEach(builtInType => {
            it('should use the dotnet built in type '+ builtInType +' if @DotNetType if present', () => {
                const modelManager = new ModelManager({ strict: true });
                modelManager.addCTOModel(`
                namespace org.acme@1.2.3

                concept Thing {
                    @DotNetType("`+ builtInType +`")
                    o String builtInTypeValue
                    @DotNetType("`+ builtInType +`")
                    o String optionalBuiltInTypeValue optional
                }
                `);
                csharpVisitor.visit(modelManager, { fileWriter });
                const files = fileWriter.getFilesInMemory();
                const file = files.get('org.acme@1.2.3.cs');
                let matchText = 'public '+ builtInType + ' builtInTypeValue';
                file.should.match(new RegExp(matchText,'g'));
                matchText = 'public '+ builtInType + '\\? optionalBuiltInTypeValue';
                file.should.match(new RegExp(matchText,'g'));
            });
        });

        it('should throw an error when an non built in @DotNetType is supplied', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            concept Thing {
                @DotNetType("nonBuiltInType")
                o String builtInTypeValue
            }`);
            (() => {
                csharpVisitor.visit(modelManager, { fileWriter });
            }).should.throw('Malformed @DotNetType decorator');
        });

        it('should use the @DotNetNamespace decorator if present', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            @DotNetNamespace("Org.Acme.Models")
            namespace org.acme@1.2.3

            concept Thing {}
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file = files.get('org.acme@1.2.3.cs');
            file.should.match(/namespace Org.Acme.Models;/);
        });

        it('should use the imported @DotNetNamespace decorator if present', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            @DotNetNamespace("Org.Acme.OtherModels")
            namespace org.acme.other@2.3.4

            concept OtherThing {}
            `);
            modelManager.addCTOModel(`
            @DotNetNamespace("Org.Acme.Models")
            namespace org.acme@1.2.3

            import org.acme.other@2.3.4.{ OtherThing }

            concept Thing {
                o OtherThing otherThing
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace Org.Acme.Models;/);
            file1.should.match(/using Org.Acme.OtherModels;/);
            const file2 = files.get('org.acme.other@2.3.4.cs');
            file2.should.match(/namespace Org.Acme.OtherModels;/);
        });

        it('should use configured dotnet namespace if model extends from other namespace', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            @DotNetNamespace("Org.Acme.OtherModels")
            namespace org.acme.other@2.3.4

            concept OtherThing {}
            `);
            modelManager.addCTOModel(`
            @DotNetNamespace("Org.Acme.Models")
            namespace org.acme@1.2.3

            import org.acme.other@2.3.4.{ OtherThing }

            concept Thing {
                o OtherThing otherThing
            }

            concept SomeOtherThing extends OtherThing {
                o String someId
            }

            concept SameThing extends Thing {
                o String id
            }

            concept OneMoreThing {
                o String oneMoreThingId
                o Thing thing
            }
            `);
            [
                true, //namespace prefix shouldn't have any effect @DotNetNamespace() is used
                false
            ].forEach((useNamespacePrefix) => {
                let ns = useNamespacePrefix? 'custom.project.ns' : '';
                csharpVisitor.visit(modelManager, { fileWriter, namespacePrefix: ns });
                const files = fileWriter.getFilesInMemory();
                const file1 = files.get('org.acme@1.2.3.cs');
                file1.should.match(/namespace Org.Acme.Models;/);
                file1.should.match(/using Org.Acme.OtherModels;/);
                // should not resolve fqn as parent type belongs to same namespace
                file1.should.match(/class SameThing : Thing/);
                // should not resolve fqn as field type belongs to same namespace
                file1.should.match(/public Thing thing { get; set; }/);
                // should resolve field type with fqn
                file1.should.match(/public Org.Acme.OtherModels.OtherThing otherThing { get; set; }/);
                // should resolve parent type with fqn
                file1.should.match(/class SomeOtherThing : Org.Acme.OtherModels.OtherThing/);
            });
        });

        it('should use fully qualified dotnet namespace if model extends from other namespace', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme.other@2.3.4

            concept OtherThing {}
            `);
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            import org.acme.other@2.3.4.{ OtherThing }

            concept Thing {
                o OtherThing otherThing
            }

            concept SomeOtherThing extends OtherThing {
                o String someId
            }

            concept SameThing extends Thing {
                o String id
            }

            concept OneMoreThing {
                o String oneMoreThingId
                o Thing thing
            }
            `);
            [
                [true, false],
                [false, false],
                [true, true],
                [false, true],
            ].forEach(([useNamespacePrefix, pascalCase]) => {
                let ns = '';
                if (useNamespacePrefix) {
                    ns = pascalCase? 'Custom.Project.Ns' : 'custom.project.ns';
                }
                csharpVisitor.visit(modelManager, { fileWriter, namespacePrefix: ns, pascalCase: pascalCase });
                const files = fileWriter.getFilesInMemory();
                const file1 = files.get('org.acme@1.2.3.cs');
                file1.should.match(/class SameThing : Thing/); // should not resolve fqn as parent type belongs to same namespace
                if (useNamespacePrefix) {
                    if (pascalCase) {
                        file1.should.match(/namespace Custom.Project.Ns.Org.Acme;/);
                        file1.should.match(/using Custom.Project.Ns.Org.Acme.Other;/);
                        file1.should.match(/public Thing Thing { get; set; }/); // should not resolve fqn as field type belongs to same namespace
                        file1.should.match(/public Custom.Project.Ns.Org.Acme.Other.OtherThing OtherThing { get; set; }/); // should resolve field type with fqn (including ns prefix)
                        file1.should.match(/class SomeOtherThing : Custom.Project.Ns.Org.Acme.Other.OtherThing/); // should resolve parent type with fqn (including ns prefix)
                    } else {
                        file1.should.match(/namespace custom.project.ns.org.acme;/);
                        file1.should.match(/using custom.project.ns.org.acme.other;/);
                        file1.should.match(/public Thing thing { get; set; }/); // should not resolve fqn as field type belongs to same namespace
                        file1.should.match(/public custom.project.ns.org.acme.other.OtherThing otherThing { get; set; }/); // should resolve field type with fqn (including ns prefix)
                        file1.should.match(/class SomeOtherThing : custom.project.ns.org.acme.other.OtherThing/); // should resolve parent type with fqn (including ns prefix)
                    }
                } else {
                    if (pascalCase) {
                        file1.should.match(/namespace Org.Acme;/);
                        file1.should.match(/using Org.Acme.Other;/);
                        file1.should.match(/public Org.Acme.Other.OtherThing OtherThing { get; set; }/); // should resolve field type with fqn
                        file1.should.match(/public Thing Thing { get; set; }/); // should not resolve fqn as field type belongs to same namespace
                        file1.should.match(/class SomeOtherThing : Org.Acme.Other.OtherThing/); // should resolve parent type with fqn
                    } else {
                        file1.should.match(/namespace org.acme;/);
                        file1.should.match(/using org.acme.other;/);
                        file1.should.match(/public org.acme.other.OtherThing otherThing { get; set; }/); // should resolve field type with fqn
                        file1.should.match(/public Thing thing { get; set; }/); // should not resolve fqn as field type belongs to same namespace
                        file1.should.match(/class SomeOtherThing : org.acme.other.OtherThing/); // should resolve parent type with fqn
                    }
                }
            });
        });

        it('should use pascal case for the namespace if specified', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            concept Thing {}
            `);
            csharpVisitor.visit(modelManager, { fileWriter, pascalCase: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace Org.Acme;/);
        });

        it('should use pascal case for a concept if specified', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            concept camelCaseThing {}
            `);
            csharpVisitor.visit(modelManager, { fileWriter, pascalCase: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/AccordProject.Concerto.Type\(Namespace = "org.acme".*?Name = "camelCaseThing"/);
            file1.should.match(/class CamelCaseThing/);
        });

        it('should use pascal case for an enum if specified', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            enum camelCaseThing {}
            `);
            csharpVisitor.visit(modelManager, { fileWriter, pascalCase: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/enum CamelCaseThing/);
        });

        it('should use pascal case for a property name if specified', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            concept PascalCaseThing {
                o String someProperty
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter, pascalCase: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/public string SomeProperty/);
        });

        it('should use pascal case for a type reference if specified', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            enum camelCaseThing {}

            concept PascalCaseThing {
                o camelCaseThing someProperty
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter, pascalCase: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/enum CamelCaseThing/);
            file1.should.match(/public CamelCaseThing SomeProperty/);
        });

        it('should avoid clashes between class name and property name', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            concept Model {
                o String Model
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/class Model/);
            file1.should.match(/public string _Model/);
        });

        it('should add identifier attributes for concepts with identified', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            concept Thing identified {
                o String value
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter, pascalCase: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/class Thing/);
            file1.should.match(/AccordProject.Concerto.Identifier\(\)/);
            file1.should.match(/public string _Identifier/);
        });

        it('should add ?(nullable) expression for optional fields except for string type', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3
            concept Thing identified by thingId {
                o String thingId
                o String value optional
                o Integer nullableIntValue optional
                o Integer nonNullableIntValue
                o Double nullableDoubleValue optional
                o Double nonNullableDoubleValue
                o Boolean nullableBooleanValue optional
                o Boolean nonNullableBooleanValue
                o DateTime nullableDateTimeValue optional
                o DateTime nonNullableDateTimeValue
                o Long nullableLongValue optional
                o Long nonNullableLongValue
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter, pascalCase: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/public string ThingId/);
            file1.should.match(/public string\? Value/);
            file1.should.match(/public int\? NullableIntValue/);
            file1.should.match(/public int NonNullableIntValue/);
            file1.should.match(/public float\? NullableDoubleValue/);
            file1.should.match(/public float NonNullableDoubleValue/);
            file1.should.match(/public bool\? NullableBooleanValue/);
            file1.should.match(/public bool NonNullableBooleanValue/);
            file1.should.match(/public System.DateTime\? NullableDateTimeValue/);
            file1.should.match(/public System.DateTime NonNullableDateTimeValue/);
            file1.should.match(/public long\? NullableLongValue/);
            file1.should.match(/public long NonNullableLongValue/);
        });

        it('should add identifier attributes for concepts with identified by', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            concept Thing identified by thingId {
                o String thingId
                o String value
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter, pascalCase: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/class Thing/);
            file1.should.match(/AccordProject.Concerto.Identifier\(\)/);
            file1.should.match(/public string ThingId/);
        });

        it('should use Guid if scalar type with name UUID provided with namespace concerto.scalar', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace concerto.scalar@1.0.0

            scalar UUID extends String default="00000000-0000-0000-0000-000000000000" regex=/^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$/
            `);
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            import concerto.scalar@1.0.0.{ UUID }

            concept Thing {
                o UUID ThingId
                o UUID SomeOtherId optional
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace org.acme;/);
            file1.should.match(/using concerto.scalar;/);
            file1.should.match(/class Thing/);
            file1.should.match(/public System.Guid ThingId/);
            file1.should.match(/public System.Guid\? SomeOtherId/);

            const file2 = files.get('concerto.scalar@1.0.0.cs');
            file2.should.match(/class UUID_Dummy {}/);
        });

        it('should use regex annotation when regex pattern provided to a field', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(fs.readFileSync(path.resolve(__dirname, '../data/model/agreement.cto'), 'utf8'), 'agreement.cto');
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.equal(`namespace org.acme;
using AccordProject.Concerto;
[AccordProject.Concerto.Type(Namespace = "org.acme", Version = "1.2.3", Name = "AgreementBase")]
[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]
public class AgreementBase : Concept {
   [System.Text.Json.Serialization.JsonPropertyName("$class")]
   public override string _class { get; } = "org.acme@1.2.3.AgreementBase";
   [System.ComponentModel.DataAnnotations.RegularExpression(@"^[^?\\/:<>|]*$", ErrorMessage = "Invalid characters")]
   public string name { get; set; }
   [System.ComponentModel.DataAnnotations.RegularExpression(@"^([^?\\/:<>|+=@-][^?\\/:<>|]*)?$", ErrorMessage = "Invalid characters")]
   public string externalSource { get; set; }
   [System.ComponentModel.DataAnnotations.RegularExpression(@"^([^?\\/:<>|+=@-][^?\\/:<>|]*)?$", ErrorMessage = "Invalid characters")]
   public string externalId { get; set; }
   public string agreementType { get; set; }
   public decimal? value { get; set; }
   [System.ComponentModel.DataAnnotations.RegularExpression(@"^[^\\<\\>]*$", ErrorMessage = "Invalid characters")]
   public string requestor { get; set; }
}
`);
        });

        it('should use min max annotation when string length validator provided to a field', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(fs.readFileSync(path.resolve(__dirname, '../data/model/stringlength.cto'), 'utf8'), 'stringlength.cto');
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.equal(`namespace org.acme;
using AccordProject.Concerto;
[AccordProject.Concerto.Type(Namespace = "org.acme", Version = "1.2.3", Name = "SampleModel")]
[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]
public class SampleModel : Concept {
   [System.Text.Json.Serialization.JsonPropertyName("$class")]
   public override string _class { get; } = "org.acme@1.2.3.SampleModel";
   [System.ComponentModel.DataAnnotations.MinLength(1)]
   [System.ComponentModel.DataAnnotations.MaxLength(10)]
   [System.ComponentModel.DataAnnotations.RegularExpression(@"^[^?\\/:<>|]*$", ErrorMessage = "Invalid characters")]
   public string stringLengthWithRegex { get; set; }
   [System.ComponentModel.DataAnnotations.MinLength(1)]
   public string stringWithMinLength { get; set; }
   [System.ComponentModel.DataAnnotations.MaxLength(10)]
   public string stringWithMaxLength { get; set; }
   [System.ComponentModel.DataAnnotations.MinLength(10)]
   [System.ComponentModel.DataAnnotations.MaxLength(10)]
   public string stringWithSameMinMaxLength { get; set; }
}
`);
        });

        it('should use min max annotation when string length validator provided to a scalar field of type string', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            scalar ScalarStringLengthWithRegex extends String regex=/^[^?/:<>|]*$/ length=[1,10]
            scalar ScalarStringWithMinLength extends String length=[2,]
            scalar ScalarStringWithMaxLength extends String length=[,100]
            scalar ScalarStringWithSameMinMaxLength extends String length=[3,3]

            concept SampleModel {
                o ScalarStringLengthWithRegex scalarStringLengthWithRegex
                o ScalarStringWithMinLength scalarStringWithMinLength
                o ScalarStringWithMaxLength scalarStringWithMaxLength
                o ScalarStringWithSameMinMaxLength scalarStringWithSameMinMaxLength
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace org.acme;/);
            file1.should.match(/class SampleModel/);
            file1.should.match(/[System.ComponentModel.DataAnnotations.MinLength(1)]/);
            file1.should.match(/[System.ComponentModel.DataAnnotations.MaxLength(10)]/);
            file1.should.match(/public string scalarStringLengthWithRegex/);
            file1.should.match(/[System.ComponentModel.DataAnnotations.MinLength(2)]/);
            file1.should.match(/public string scalarStringWithMinLength/);
            file1.should.match(/[System.ComponentModel.DataAnnotations.MinLength(100)]/);
            file1.should.match(/public string scalarStringWithMaxLength/);
            file1.should.match(/[System.ComponentModel.DataAnnotations.MinLength(3)]/);
            file1.should.match(/[System.ComponentModel.DataAnnotations.MaxLength(3)]/);
            file1.should.match(/public string scalarStringWithSameMinMaxLength/);
        });

        it('should use string for scalar type UUID but with different namespace than concerto.scalar ', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.specific.scalar@1.0.0

            scalar UUID extends String default="00000000-0000-0000-0000-000000000000" regex=/^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$/
            `);
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            import org.specific.scalar@1.0.0.{ UUID }

            concept Thing {
                o UUID ThingId
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace org.acme;/);
            file1.should.match(/using org.specific.scalar;/);
            file1.should.match(/class Thing/);
            file1.should.match(/public string ThingId/);

            const file2 = files.get('org.specific.scalar@1.0.0.cs');
            file2.should.match(/class UUID_Dummy {}/);
        });

        it('should use string for scalar type non UUID', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace concerto.scalar@1.0.0

            scalar SSN extends String
            `);
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            import concerto.scalar@1.0.0.{ SSN }

            concept Thing {
                o SSN ThingId
                o SSN SomeOtherId optional
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace org.acme;/);
            file1.should.match(/class Thing/);
            file1.should.match(/public string ThingId/);
            file1.should.match(/public string\? SomeOtherId/);

            const file2 = files.get('concerto.scalar@1.0.0.cs');
            file2.should.match(/class SSN_Dummy {}/);
        });

        it('should use the @AcceptedValue decorator if present', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            enum SomeEnum {
                @AcceptedValue("Payment terms")
                o PaymentTerms
                @AcceptedValue("Payment Late Fees")
                o PaymentLateFees
                @AcceptedValue("NA")
                o NotApplicable
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace org.acme;/);
            file1.should.match(/enum SomeEnum/);
            file1.should.match(/[System.Runtime.Serialization.EnumMember(Value = "Payment terms")]/);
            file1.should.match(/PaymentTerms/);
            file1.should.match(/[System.Runtime.Serialization.EnumMember(Value = "Payment Late Fees")]/);
            file1.should.match(/PaymentLateFees/);
            file1.should.match(/[System.Runtime.Serialization.EnumMember(Value = "NA")]/);
            file1.should.match(/NotApplicable/);
        });

        it('should throw an error when an invalid @AcceptedValue provided', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            enum SomeEnum {
                @AcceptedValue("Payment terms", 123)
                o PaymentTerms
            }`);
            (() => {
                csharpVisitor.visit(modelManager, { fileWriter });
            }).should.throw('Malformed @AcceptedValue decorator');
        });

        it('should use relationship id if enableReferenceType param is set to true', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme.other@2.3.4

            concept OtherThing identified by someId {
                o String someId
            }

            concept SomeOtherThing identified {
                o Integer intField
            }
            `);
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            import org.acme.other@2.3.4.{ OtherThing }
            import org.acme.other@2.3.4.{ SomeOtherThing }

            concept Thing {
                o Integer someIntField
                --> OtherThing otherThingId
                --> SomeOtherThing someOtherThingId
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter, enableReferenceType: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace org.acme;/);
            file1.should.match(/public string otherThingId/);
            file1.should.match(/public string someOtherThingId/);
        });

        it('should not use relationship id if enableReferenceType param is not set', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace org.acme.other@2.3.4

            concept OtherThing identified by someId {
                o String someId
            }

            concept SomeOtherThing identified {
                o Integer intField
            }
            `);
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            import org.acme.other@2.3.4.{ OtherThing }
            import org.acme.other@2.3.4.{ SomeOtherThing }

            concept Thing {
                o Integer someIntField
                --> OtherThing otherThingId
                --> SomeOtherThing someOtherThingId
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace org.acme;/);
            file1.should.match(/public OtherThing otherThingId/);
            file1.should.match(/public SomeOtherThing someOtherThingId/);
        });

        it('should use relationship id (System.Guid) if enableReferenceType param is set to true', () => {
            const modelManager = new ModelManager({ strict: true });
            modelManager.addCTOModel(`
            namespace concerto.scalar@1.0.0

            scalar UUID extends String default="00000000-0000-0000-0000-000000000000" regex=/^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$/
            `);
            modelManager.addCTOModel(`
            namespace org.acme.other@2.3.4

            import concerto.scalar@1.0.0.{ UUID }

            concept OtherThing identified by id {
                o UUID id
                o String someId
            }

            concept SomeOtherThing identified {
                o Integer intField
            }
            `);
            modelManager.addCTOModel(`
            namespace org.acme@1.2.3

            import org.acme.other@2.3.4.{ OtherThing }
            import org.acme.other@2.3.4.{ SomeOtherThing }

            concept Thing {
                o Integer someIntField
                --> OtherThing otherThingId
                --> SomeOtherThing someOtherThingId
            }
            `);
            csharpVisitor.visit(modelManager, { fileWriter, enableReferenceType: true });
            const files = fileWriter.getFilesInMemory();
            const file1 = files.get('org.acme@1.2.3.cs');
            file1.should.match(/namespace org.acme;/);
            file1.should.match(/public System.Guid otherThingId/);
            file1.should.match(/public string someOtherThingId/);
        });
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
            let mockSpecialVisit = sinon.stub(csharpVisitor, 'visitModelManager');
            mockSpecialVisit.returns('Duck');

            csharpVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitModelFile for a ModelFile', () => {
            let thing = sinon.createStubInstance(ModelFile);
            thing.isModelFile.returns(true);
            let mockSpecialVisit = sinon.stub(csharpVisitor, 'visitModelFile');
            mockSpecialVisit.returns('Duck');

            csharpVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitEnumDeclaration for a EnumDeclaration', () => {
            let thing = sinon.createStubInstance(EnumDeclaration);
            thing.isEnum.returns(true);
            let mockSpecialVisit = sinon.stub(csharpVisitor, 'visitEnumDeclaration');
            mockSpecialVisit.returns('Duck');

            csharpVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitClassDeclaration for a ClassDeclaration', () => {
            let thing = sinon.createStubInstance(ClassDeclaration);
            thing.isClassDeclaration.returns(true);
            let mockSpecialVisit = sinon.stub(csharpVisitor, 'visitClassDeclaration');
            mockSpecialVisit.returns('Duck');

            csharpVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitField for a Field', () => {
            let thing = sinon.createStubInstance(Field);
            thing.isField.returns(true);
            let mockSpecialVisit = sinon.stub(csharpVisitor, 'visitField');
            mockSpecialVisit.returns('Duck');

            csharpVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitRelationship for a RelationshipDeclaration', () => {
            let thing = sinon.createStubInstance(RelationshipDeclaration);
            thing.isRelationship.returns(true);
            let mockSpecialVisit = sinon.stub(csharpVisitor, 'visitRelationship');
            mockSpecialVisit.returns('Duck');

            csharpVisitor.visit(thing, param).should.deep.equal('Duck');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should return visitEnumValueDeclaration for a EnumValueDeclaration', () => {
            let thing = sinon.createStubInstance(EnumValueDeclaration);
            thing.isEnumValue.returns(true);
            let mockSpecialVisit = sinon.stub(csharpVisitor, 'visitEnumValueDeclaration');
            mockSpecialVisit.returns('Goose');

            csharpVisitor.visit(thing, param).should.deep.equal('Goose');

            mockSpecialVisit.calledWith(thing, param).should.be.ok;
        });

        it('should throw an error when an unrecognised type is supplied', () => {
            let thing = 'Something of unrecognised type';

            (() => {
                csharpVisitor.visit(thing, param);
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

            csharpVisitor.visitModelManager(mockModelManager, param);

            acceptSpy.withArgs(csharpVisitor, param).calledTwice.should.be.ok;
        });
    });

    describe('visitModelFile', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should write lines for the imports that are not in own namespace (including super types) ignoring primitives', () => {
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
                }
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
            mockClassDeclaration.getSuperType.returns('super.Parent');
            mockClassDeclaration.getProperties.returns([property1, property2, property3]);
            mockClassDeclaration.accept = acceptSpy;

            let mockClassDeclaration2 = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockClassDeclaration2.getSuperType.returns('super.Parent');
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
                'org.org1.Import1',
                'org.org1.Import2',
                'org.org2.Import1',
                'super.Property3',
                'super.Parent'
            ]);

            const myParams = {
                ...param,
                namespacePrefix: 'Concerto.Models.'
            };
            csharpVisitor.visitModelFile(mockModelFile, myParams);

            param.fileWriter.openFile.withArgs('org.acme.cs').calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.equal(4);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'namespace Concerto.Models.org.acme;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'using Concerto.Models.org.org1;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'using Concerto.Models.org.org2;']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, 'using Concerto.Models.super;']);
            param.fileWriter.closeFile.calledOnce.should.be.ok;
            acceptSpy.withArgs(csharpVisitor, myParams).calledThrice.should.be.ok;
        });

        it('should write lines for the imports that are not in own namespace (including super types) ignoring primitives using Newtonsoft.Json', () => {
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
                }
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
            mockClassDeclaration.getSuperType.returns('super.Parent');
            mockClassDeclaration.getProperties.returns([property1, property2, property3]);
            mockClassDeclaration.accept = acceptSpy;

            let mockClassDeclaration2 = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockClassDeclaration2.getSuperType.returns('super.Parent');
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
                'org.org1.Import1',
                'org.org1.Import2',
                'org.org2.Import1',
                'super.Property3',
                'super.Parent'
            ]);

            const newtonsoftParams = {
                ...param,
                useNewtonsoftJson: true,
                namespacePrefix: 'Concerto.Models'
            };
            csharpVisitor.visitModelFile(mockModelFile, newtonsoftParams);

            param.fileWriter.openFile.withArgs('org.acme.cs').calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.equal(4);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'namespace Concerto.Models.org.acme;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'using Concerto.Models.org.org1;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'using Concerto.Models.org.org2;']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, 'using Concerto.Models.super;']);
            param.fileWriter.closeFile.calledOnce.should.be.ok;
            acceptSpy.withArgs(csharpVisitor, newtonsoftParams).calledThrice.should.be.ok;
        });


        it('should write lines for the imports that are not in own namespace ignoring primitives and write lines for importing system type', () => {
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
                }
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
                    return false;
                },
                getFullyQualifiedTypeName: () => {
                    return 'org.org1.Property3';
                }
            };

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getProperties.returns([property1, property2, property3]);
            mockClassDeclaration.accept = acceptSpy;

            let mockModelManager = sinon.createStubInstance(ModelManager);
            mockModelManager.isModelManager.returns(true);

            let mockModelFile = sinon.createStubInstance(ModelFile);
            mockModelFile.isModelFile.returns(true);
            mockModelFile.getNamespace.returns('org.acme');
            mockModelFile.getAllDeclarations.returns([
                mockEnum,
                mockClassDeclaration
            ]);
            mockModelFile.getImports.returns([
                'org.org1.Import1',
                'org.org1.Import2',
                'org.org2.Import1'
            ]);
            mockModelFile.getModelManager.returns(mockModelManager);

            const myParams = {
                ...param,
                namespacePrefix: 'Concerto.Models.'
            };
            csharpVisitor.visitModelFile(mockModelFile, myParams);

            param.fileWriter.openFile.withArgs('org.acme.cs').calledOnce.should.be.ok;
            param.fileWriter.writeLine.callCount.should.equal(3);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, 'namespace Concerto.Models.org.acme;']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, 'using Concerto.Models.org.org1;']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'using Concerto.Models.org.org2;']);
            param.fileWriter.closeFile.calledOnce.should.be.ok;
            acceptSpy.withArgs(csharpVisitor, myParams).calledTwice.should.be.ok;
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

            csharpVisitor.visitEnumDeclaration(mockEnumDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(3);
            param.fileWriter.writeLine.withArgs(0, '[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]').calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(0, 'public enum Bob {').calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(0, '}').calledOnce.should.be.ok;

            acceptSpy.withArgs(csharpVisitor, param).calledTwice.should.be.ok;
        });
    });

    describe('visitClassDeclaration', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });
        it('should write the class opening and close', () => {
            let acceptSpy = sinon.spy();

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.getName.returns('Bob');
            mockClassDeclaration.getNamespace.returns('org.acme');

            csharpVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '[AccordProject.Concerto.Type(Namespace = "org.acme", Version = null, Name = "Bob")]']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'public class Bob {']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([1, '[System.Text.Json.Serialization.JsonPropertyName("$class")]']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, 'public override string _class { get; } = "undefined";']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '}']);
        });
        it('should write the class opening and close with Newtonsoft.Json', () => {
            let acceptSpy = sinon.spy();

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            let mockClassDeclaration2 = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.getName.returns('Bob');
            mockClassDeclaration.getNamespace.returns('org.acme');
            mockClassDeclaration.getAssignableClassDeclarations.returns([mockClassDeclaration, mockClassDeclaration2]);
            csharpVisitor.visitClassDeclaration(mockClassDeclaration, { ...param, useNewtonsoftJson: true});

            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '[AccordProject.Concerto.Type(Namespace = "org.acme", Version = null, Name = "Bob")]']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '[Newtonsoft.Json.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterNewtonsoft))]']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'public class Bob {']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([1, '[Newtonsoft.Json.JsonProperty("$class")]']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, 'public override string _class { get; } = "undefined";']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '}']);
        });
        it('should write the class opening and close with abstract and super type', () => {
            let acceptSpy = sinon.spy();

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.getName.returns('Bob');
            mockClassDeclaration.getNamespace.returns('org.acme');
            mockClassDeclaration.isAbstract.returns(true);
            mockClassDeclaration.getSuperType.returns('org.acme.Person');

            csharpVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '[AccordProject.Concerto.Type(Namespace = "org.acme", Version = null, Name = "Bob")]']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'public abstract class Bob : Person {']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([1, '[System.Text.Json.Serialization.JsonPropertyName("$class")]']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, 'public override string _class { get; } = "undefined";']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '}']);
        });
        it('should write the class opening and close with abstract and super type, with explicit System.Text.Json flag', () => {
            let acceptSpy = sinon.spy();

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.getName.returns('Bob');
            mockClassDeclaration.getNamespace.returns('org.acme');
            mockClassDeclaration.isAbstract.returns(true);
            mockClassDeclaration.getSuperType.returns('org.acme.Person');

            csharpVisitor.visitClassDeclaration(mockClassDeclaration, { ...param, useSystemTextJson: true });

            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '[AccordProject.Concerto.Type(Namespace = "org.acme", Version = null, Name = "Bob")]']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'public abstract class Bob : Person {']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([1, '[System.Text.Json.Serialization.JsonPropertyName("$class")]']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, 'public override string _class { get; } = "undefined";']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '}']);
        });
        it('should write the class opening and close with abstract and super type, with both serializer flags', () => {
            let acceptSpy = sinon.spy();

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.getName.returns('Bob');
            mockClassDeclaration.getNamespace.returns('org.acme');
            mockClassDeclaration.isAbstract.returns(true);
            mockClassDeclaration.getSuperType.returns('org.acme.Person');

            csharpVisitor.visitClassDeclaration(mockClassDeclaration, { ...param, useSystemTextJson: true, useNewtonsoftJson: true });

            param.fileWriter.writeLine.callCount.should.deep.equal(8);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '[AccordProject.Concerto.Type(Namespace = "org.acme", Version = null, Name = "Bob")]']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, '[Newtonsoft.Json.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterNewtonsoft))]']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([0, 'public abstract class Bob : Person {']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, '[System.Text.Json.Serialization.JsonPropertyName("$class")]']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([1, '[Newtonsoft.Json.JsonProperty("$class")]']);
            param.fileWriter.writeLine.getCall(6).args.should.deep.equal([1, 'public override string _class { get; } = "undefined";']);
            param.fileWriter.writeLine.getCall(7).args.should.deep.equal([0, '}']);
        });
        it('should write the class opening and close with virtual modifier for base class', () => {
            let acceptSpy = sinon.spy();

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.getName.returns('Concept');
            mockClassDeclaration.getNamespace.returns('concerto');
            mockClassDeclaration.getFullyQualifiedName.returns('concerto.Concept');
            mockClassDeclaration.isAbstract.returns(true);

            csharpVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '[AccordProject.Concerto.Type(Namespace = "concerto", Version = null, Name = "Concept")]']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'public abstract class Concept {']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([1, '[System.Text.Json.Serialization.JsonPropertyName("$class")]']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, 'public virtual string _class { get; } = "concerto.Concept";']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '}']);
        });
        it('should write the class opening and close with virtual modifier for base versioned class', () => {
            let acceptSpy = sinon.spy();

            let mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);
            mockClassDeclaration.isClassDeclaration.returns(true);
            mockClassDeclaration.getOwnProperties.returns([{
                accept: acceptSpy
            },
            {
                accept: acceptSpy
            }]);
            mockClassDeclaration.getName.returns('Concept');
            mockClassDeclaration.getNamespace.returns('concerto@1.0.0');
            mockClassDeclaration.getFullyQualifiedName.returns('concerto@1.0.0.Concept');
            mockClassDeclaration.isAbstract.returns(true);

            csharpVisitor.visitClassDeclaration(mockClassDeclaration, param);

            param.fileWriter.writeLine.callCount.should.deep.equal(6);
            param.fileWriter.writeLine.getCall(0).args.should.deep.equal([0, '[AccordProject.Concerto.Type(Namespace = "concerto", Version = "1.0.0", Name = "Concept")]']);
            param.fileWriter.writeLine.getCall(1).args.should.deep.equal([0, '[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]']);
            param.fileWriter.writeLine.getCall(2).args.should.deep.equal([0, 'public abstract class Concept {']);
            param.fileWriter.writeLine.getCall(3).args.should.deep.equal([1, '[System.Text.Json.Serialization.JsonPropertyName("$class")]']);
            param.fileWriter.writeLine.getCall(4).args.should.deep.equal([1, 'public virtual string _class { get; } = "concerto@1.0.0.Concept";']);
            param.fileWriter.writeLine.getCall(5).args.should.deep.equal([0, '}']);
        });
    });

    describe('visitScalarField', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
        });

        it('should write a line for scalar field of type UUID with dotnet type Guid', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.getName.returns('someId');
            mockField.getType.returns('UUID');
            mockField.isArray.returns(false);
            mockField.isTypeScalar.returns(true);
            mockField.getFullyQualifiedTypeName.returns('concerto.scalar@1.0.0.UUID');

            const mockScalarField = sinon.createStubInstance(Field);
            mockScalarField.getType.returns('String');
            mockScalarField.getName.returns('someId');
            mockField.getScalarField.returns(mockScalarField);

            csharpVisitor.visitScalarField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public System.Guid someId { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for scalar optional field of type UUID with dotnet type nullable Guid', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.getName.returns('someId');
            mockField.getType.returns('UUID');
            mockField.isArray.returns(false);
            mockField.isTypeScalar.returns(true);

            mockField.getFullyQualifiedTypeName.returns('concerto.scalar@1.0.0.UUID');

            const mockScalarField = sinon.createStubInstance(Field);
            mockScalarField.getType.returns('String');
            mockScalarField.getName.returns('someId');
            mockScalarField.isOptional.returns(true);
            mockField.getScalarField.returns(mockScalarField);

            csharpVisitor.visitScalarField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public System.Guid? someId { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for scalar field of type UUID from org specific namespce with dotnet type string', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.getName.returns('someId');
            mockField.getType.returns('UUID');
            mockField.isArray.returns(false);
            mockField.isTypeScalar.returns(true);
            mockField.getFullyQualifiedTypeName.returns('org.acme.scalar@1.0.0.UUID');

            const mockScalarField = sinon.createStubInstance(Field);
            mockScalarField.getType.returns('String');
            mockScalarField.getName.returns('someId');
            mockField.getScalarField.returns(mockScalarField);

            csharpVisitor.visitScalarField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public string someId { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for scalar field of non UUID type', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.getName.returns('someId');
            mockField.getType.returns('SSN');
            mockField.isArray.returns(false);
            mockField.isTypeScalar.returns(true);
            mockField.getFullyQualifiedTypeName.returns('org.arg@1.2.3.SSN');

            const mockScalarField = sinon.createStubInstance(Field);
            mockScalarField.getType.returns('String');
            mockScalarField.getName.returns('someId');
            mockField.getScalarField.returns(mockScalarField);

            csharpVisitor.visitScalarField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public string someId { get; set; }').calledOnce.should.be.ok;
        });
    });

    describe('visitField', () => {
        let param;
        beforeEach(() => {
            param = {
                fileWriter: mockFileWriter
            };
            sandbox.restore();
            sandbox.stub(ModelUtil, 'isMap').callsFake(() => {
                return true;
            });

        });

        it('should write a line for primitive field name and type', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.getName.returns('name');
            mockField.getType.returns('String');
            mockField.isPrimitive.returns(true);
            csharpVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public string name { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for primitive field name and type, where the field name is reserved in C#', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.getName.returns('bool');
            mockField.getType.returns('String');
            mockField.isPrimitive.returns(true);
            csharpVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, '[System.Text.Json.Serialization.JsonPropertyName("bool")]').calledOnce.should.be.ok;
            param.fileWriter.writeLine.withArgs(1, 'public string _bool { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for an optional enum field name and type', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.getName.returns('myEnum');
            mockField.getType.returns('Enum');
            mockField.isOptional.returns(true);
            mockField.isTypeEnum.returns(true);
            csharpVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public Enum? myEnum { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for field name and type thats an array', () => {
            const mockField = sinon.createStubInstance(Field);
            mockField.isPrimitive.returns(false);
            mockField.getName.returns('Bob');
            mockField.getType.returns('Person');
            mockField.isArray.returns(true);

            const mockModelManager = sinon.createStubInstance(ModelManager);
            const mockModelFile = sinon.createStubInstance(ModelFile);
            const mockClassDeclaration = sinon.createStubInstance(ClassDeclaration);

            mockModelManager.getType.returns(mockClassDeclaration);
            mockClassDeclaration.isEnum.returns(false);
            mockModelFile.getModelManager.returns(mockModelManager);
            mockClassDeclaration.getModelFile.returns(mockModelFile);
            mockField.getParent.returns(mockClassDeclaration);
            csharpVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public Person[] Bob { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for field name and type thats a map of <String, String>', () => {
            const mockField             = sinon.createStubInstance(Field);
            const getType               = sinon.stub();

            mockField.dummy = 'Dummy Value';
            mockField.getModelFile.returns({ getType: getType });

            const mockMapDeclaration    = sinon.createStubInstance(MapDeclaration);
            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();

            getType.returns(mockMapDeclaration);
            getKeyType.returns('String');
            getValueType.returns('String');
            mockField.getName.returns('Map1');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.isMapDeclaration.returns(true);
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            csharpVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public Dictionary<string, string> Map1 { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for field name and type thats a map of <String, Concept>', () => {
            const mockField             = sinon.createStubInstance(Field);
            const getType               = sinon.stub();

            mockField.dummy = 'Dummy Value';
            mockField.getModelFile.returns({ getType: getType });


            let mockMapDeclaration      = sinon.createStubInstance(MapDeclaration);
            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();

            getType.returns(mockMapDeclaration);
            getKeyType.returns('String');
            getValueType.returns('Concept');
            mockField.getName.returns('Map1');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.isMapDeclaration.returns(true);
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            csharpVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public Dictionary<string, Concept> Map1 { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for field name and type thats a map of <String, DateTime>', () => {
            const mockField             = sinon.createStubInstance(Field);
            const getType               = sinon.stub();

            mockField.dummy = 'Dummy Value';
            mockField.getModelFile.returns({ getType: getType });

            let mockMapDeclaration      = sinon.createStubInstance(MapDeclaration);
            const getKeyType            = sinon.stub();
            const getValueType          = sinon.stub();

            getType.returns(mockMapDeclaration);
            getKeyType.returns('String');
            getValueType.returns('DateTime');
            mockField.getName.returns('Map1');
            mockMapDeclaration.getName.returns('Map1');
            mockMapDeclaration.isMapDeclaration.returns(true);
            mockMapDeclaration.getKey.returns({ getType: getKeyType });
            mockMapDeclaration.getValue.returns({ getType: getValueType });

            csharpVisitor.visitField(mockField, param);
            param.fileWriter.writeLine.withArgs(1, 'public Dictionary<string, System.DateTime> Map1 { get; set; }').calledOnce.should.be.ok;
        });
    });

    describe('visitEnumValueDeclaration', () => {
        it('should write a line with the name of the enum value', () => {
            let param = {
                fileWriter: mockFileWriter
            };

            let mockEnumValueDeclaration = sinon.createStubInstance(EnumValueDeclaration);
            mockEnumValueDeclaration.isEnumValue.returns(true);
            mockEnumValueDeclaration.getName.returns('Bob');

            csharpVisitor.visitEnumValueDeclaration(mockEnumValueDeclaration, param);
            param.fileWriter.writeLine.withArgs(2, 'Bob,').calledOnce.should.be.ok;
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
            mockRelationship.getName.returns('Bob');
            mockRelationship.getType.returns('Person');
            csharpVisitor.visitRelationship(mockRelationship, param);

            param.fileWriter.writeLine.withArgs(1, 'public Person Bob { get; set; }').calledOnce.should.be.ok;
        });

        it('should write a line for field name and type thats an array', () => {
            let mockField = sinon.createStubInstance(Field);
            mockField.isField.returns(true);
            mockField.getName.returns('Bob');
            mockField.getType.returns('Person');
            mockField.isArray.returns(true);
            csharpVisitor.visitRelationship(mockField, param);

            param.fileWriter.writeLine.withArgs(1, 'public Person[] Bob { get; set; }').calledOnce.should.be.ok;
        });
    });

    describe('toCSharpType', () => {
        it('should return System.DateTime for DateTime', () => {
            csharpVisitor.toCSharpType('DateTime').should.deep.equal('System.DateTime');
        });
        it('should return boolean for Boolean', () => {
            csharpVisitor.toCSharpType('Boolean').should.deep.equal('bool');
        });
        it('should return string for String', () => {
            csharpVisitor.toCSharpType('String').should.deep.equal('string');
        });
        it('should return number for Double', () => {
            csharpVisitor.toCSharpType('Double').should.deep.equal('float');
        });
        it('should return number for Long', () => {
            csharpVisitor.toCSharpType('Long').should.deep.equal('long');
        });
        it('should return number for Integer', () => {
            csharpVisitor.toCSharpType('Integer').should.deep.equal('int');
        });
        it('should return Guid for Scalar type UUID', () => {
            csharpVisitor.toCSharpType('concerto.scalar.UUID').should.deep.equal('System.Guid');
        });
        csharpBuiltInTypes.forEach(builtInType => {
            it('should return ' + builtInType + ' for ' + builtInType, () => {
                csharpVisitor.toCSharpType(builtInType).should.deep.equal(builtInType);
            });
        });
        it('should return passed in type by default', () => {
            csharpVisitor.toCSharpType('Penguin').should.deep.equal('Penguin');
        });
    });
});

