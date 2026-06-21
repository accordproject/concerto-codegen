/* eslint-disable eqeqeq */
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

const { ModelUtil } = require('@accordproject/concerto-core');
const camelCase = require('camelcase');
const { throwUnrecognizedType } = require('../../../common/util');

// Types needed for TypeScript generation.
/* eslint-disable no-unused-vars */
/* istanbul ignore next */
if (global === undefined) {
    const { ModelFile } = require('@accordproject/concerto-core');
}
const csharpBuiltInTypes = ['bool','byte','char','decimal','double','float','int','long','nint','nuint','sbyte','short',
    'string','uint','ulong','ushort'];

const reservedKeywords = csharpBuiltInTypes.concat(['abstract','as','base','break','case','catch','checked',
    'class','const','continue','default','delegate','do','else',
    'enum','event','explicit','extern','false','finally','fixed','for','foreach',
    'goto','if','implicit','in','interface','internal','is','lock','namespace',
    'new','null','object','operator','out','override','params','private','protected','public',
    'readonly','ref','return','sealed','sizeof','stackalloc','static',
    'struct','switch','this','throw','true','try','typeof','unchecked',
    'unsafe','using','virtual','void','volatile','while']);

const dotnetTypeDecoratorName = 'DotNetType';
const enumValueDecoratorName = 'AcceptedValue';

/**
 * Convert the contents of a ModelManager to C# code. Set a
 * fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @private
 * @class
 * @memberof module:concerto-codegen
 */
class CSharpVisitor {
    /**
     * Visitor design pattern
     * @param {Object} thing - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     */
    visit(thing, parameters) {
        if (thing.isModelManager?.()) {
            return this.visitModelManager(thing, parameters);
        } else if (thing.isModelFile?.()) {
            return this.visitModelFile(thing, parameters);
        } else if (thing.isScalarDeclaration?.()) {
            return this.visitScalarDeclaration(thing, parameters);
        } else if (thing.isEnum?.()) {
            return this.visitEnumDeclaration(thing, parameters);
        } else if (thing.isClassDeclaration?.()) {
            return this.visitClassDeclaration(thing, parameters);
        } else if (thing.isMapDeclaration?.()) {
            return this.visitMapDeclaration(thing, parameters);
        } else if (thing.isTypeScalar?.()) {
            return this.visitScalarField(thing, parameters);
        } else if (thing.isField?.()) {
            return this.visitField(thing, parameters);
        } else if (thing.isRelationship?.()) {
            return this.visitRelationship(thing, parameters);
        } else if (thing.isEnumValue?.()) {
            return this.visitEnumValueDeclaration(thing, parameters);
        } else {
            throwUnrecognizedType(thing);
        }
    }

    /**
     * Visitor design pattern
     * @param {ModelManager} modelManager - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitModelManager(modelManager, parameters) {
        modelManager.getModelFiles(true).forEach((modelFile) => {
            modelFile.accept(this, parameters);
        });
        return null;
    }

    /**
     * Visitor design pattern
     * @param {ModelFile} modelFile - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitModelFile(modelFile, parameters) {
        // If no serlialization library is specified we default to the .NET one.
        // However, we also allow both options to be specified
        if (!parameters.useSystemTextJson && !parameters.useNewtonsoftJson){
            parameters.useSystemTextJson = true;
        }

        // Ensure non-empty string, that is separated by a period
        let namespacePrefix = parameters.namespacePrefix ? parameters.namespacePrefix : '';
        if (namespacePrefix !== '' && namespacePrefix.slice(-1) !== '.'){
            namespacePrefix += '.';
        }

        const dotNetNamespace = this.getDotNetNamespace(modelFile, { ...parameters, namespacePrefix });
        parameters.fileWriter.openFile(modelFile.getNamespace() + '.cs');

        parameters.fileWriter.writeLine(0, `namespace ${dotNetNamespace};`);

        parameters.fileWriter.writeLine(0, 'using System.Collections.Generic;');
        parameters.fileWriter.writeLine(0, 'using System.ComponentModel.DataAnnotations;');

        modelFile.getImports()
            .map(importString => ModelUtil.getNamespace(importString))
            .filter(namespace => namespace !== modelFile.getNamespace()) // Skip own namespace.
            .filter((v, i, a) => a.indexOf(v) === i) // Remove any duplicates from direct imports
            .forEach(namespace => {
                // concerto.decorator types are provided by the .NET runtime package.
                if (this.useConcertoRuntime(parameters) && ModelUtil.parseNamespace(namespace).name === 'concerto.decorator') {
                    parameters.fileWriter.writeLine(0, 'using AccordProject.Concerto.Metamodel;');
                    return;
                }
                const otherModelFile = modelFile.getModelManager()?.getModelFile(namespace);
                if (!otherModelFile) {
                    // Couldn't resolve the other model file.
                    parameters.fileWriter.writeLine(0, `using ${namespacePrefix}${this.toCSharpNamespace(namespace, parameters)};`);
                    return;
                }
                const otherDotNetNamespace = this.getDotNetNamespace(otherModelFile, { ...parameters, namespacePrefix });
                parameters.fileWriter.writeLine(0, `using ${otherDotNetNamespace};`);
            });

        modelFile.getAllDeclarations().forEach((decl) => {
            decl.accept(this, parameters);
        });

        parameters.fileWriter.closeFile();

        return null;
    }

    /**
     * Visitor design pattern
     * @param {EnumDeclaration} enumDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitEnumDeclaration(enumDeclaration, parameters) {
        // If no serlialization library is specified we default to the .NET one.
        // However, we also allow both options to be specified
        if (!parameters.useSystemTextJson && !parameters.useNewtonsoftJson){
            parameters.useSystemTextJson = true;
        }

        if (parameters.useSystemTextJson) {
            parameters.fileWriter.writeLine(0, '[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]');
        }
        if (parameters.useNewtonsoftJson) {
            parameters.fileWriter.writeLine(0, '[Newtonsoft.Json.JsonConverter(typeof(Newtonsoft.Json.Converters.StringEnumConverter))]');
        }
        const name = enumDeclaration.getName();
        const identifier = this.toCSharpIdentifier(undefined, name, parameters);
        parameters.fileWriter.writeLine(0, 'public enum ' + identifier + ' {');

        enumDeclaration.getOwnProperties().forEach((property) => {
            property.accept(this, parameters);
        });

        parameters.fileWriter.writeLine(0, '}');
        return null;
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitClassDeclaration(classDeclaration, parameters) {
        // If no serlialization library is specified we default to the .NET one.
        // However, we also allow both options to be specified
        if (!parameters.useSystemTextJson && !parameters.useNewtonsoftJson){
            parameters.useSystemTextJson = true;
        }

        let superType = ' ';
        if (classDeclaration.getSuperType()) {
            const superTypeName = ModelUtil.getShortName(classDeclaration.getSuperType());
            const superTypeIdentifier = this.toCSharpIdentifier(undefined, superTypeName, parameters);
            let fqn = this.getDotNetNamespaceOfType(classDeclaration.getSuperType(), classDeclaration, parameters);
            superType = ` : ${fqn}${superTypeIdentifier} `;
        }

        let abstract = '';
        if(classDeclaration.isAbstract()) {
            abstract = 'abstract ';
        }

        const { name: namespace, version } = ModelUtil.parseNamespace(classDeclaration.getNamespace());
        const name = classDeclaration.getName();
        const identifier = this.toCSharpIdentifier(undefined, name, parameters);
        if (this.useConcertoRuntime(parameters)) {
            parameters.fileWriter.writeLine(0, `[AccordProject.Concerto.Type(Namespace = "${namespace}", Version = ${version ? `"${version}"` : 'null'}, Name = "${name}")]`);

            // classDeclaration has any other subtypes
            if (parameters.useSystemTextJson) {
                parameters.fileWriter.writeLine(0, '[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]');
            }
            if (parameters.useNewtonsoftJson) {
                parameters.fileWriter.writeLine(0, '[Newtonsoft.Json.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterNewtonsoft))]');
            }
        }
        parameters.fileWriter.writeLine(0, `public ${abstract}class ${identifier}${superType}{`);
        const override = namespace === 'concerto' && name === 'Concept' ? 'virtual' : 'override';
        const lines = this.toCSharpProperty(
            'public '+ override,
            name,
            '$class',
            'String',
            '',
            '',
            `{ get; } = "${classDeclaration.getFullyQualifiedName()}";`,
            parameters
        );
        lines.forEach(line => parameters.fileWriter.writeLine(1, line));
        classDeclaration.getOwnProperties().forEach((property) => {
            property.accept(this, parameters);
        });
        parameters.fileWriter.writeLine(0, '}');
        return null;
    }

    /**
     * Get dotnet namespace of a given type if it belongs to different namespace from associated concept/class
     * @param {string} type name of the super type
     * @param {ClassDeclaration} classDeclaration of the class
     * @param {Object} parameters - the parameter
     * @returns {string} the dotnet namespace of given type
     * @private
     */
    getDotNetNamespaceOfType(type, classDeclaration, parameters) {
        let dotnetNs = '';
        const parsedNamespace = type ? ModelUtil.parseNamespace(ModelUtil.getNamespace(type)).name : null;
        // concerto.decorator base types are provided by the .NET runtime package.
        if (this.useConcertoRuntime(parameters) && parsedNamespace === 'concerto.decorator') {
            return 'AccordProject.Concerto.Metamodel.';
        }
        // Resolve to dotnet namespace only if its a non system type
        if (type && parsedNamespace !== 'concerto') {
            const mm = classDeclaration.getModelFile()?.getModelManager();
            let typeNamespace = mm?.getType(type)?.getNamespace();
            if (typeNamespace && typeNamespace !== classDeclaration.getNamespace()) {
                // Ensure non-empty string, that is separated by a period
                let namespacePrefix = parameters.namespacePrefix ? parameters.namespacePrefix : '';
                if (namespacePrefix !== '' && namespacePrefix.slice(-1) !== '.') {
                    namespacePrefix += '.';
                }
                const otherModelFile = mm.getModelFile(typeNamespace);
                dotnetNs = this.getDotNetNamespace(otherModelFile, { ...parameters, namespacePrefix });
                dotnetNs += '.';
            }
        }
        return dotnetNs;
    }

    /**
     * Visitor design pattern
     * @param {ScalarDeclaration} scalarDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitScalarDeclaration(scalarDeclaration, parameters) {
        const name = scalarDeclaration.getName();
        const identifier = this.toCSharpIdentifier(undefined, name, parameters);
        const fqn = ModelUtil.removeNamespaceVersionFromFullyQualifiedName(scalarDeclaration.getFullyQualifiedName());
        const csharpType = fqn === 'concerto.scalar.UUID'
            ? 'System.Guid'
            : this.toCSharpType(scalarDeclaration.getType());
        // If the scalar type itself is named Value, using Value as the generated
        // record parameter/member causes a C# CS0542 collision.
        const scalarMemberName = identifier === 'Value' ? 'RawValue' : 'Value';
        const validatorLines = this.buildScalarValidatorLines(scalarDeclaration);
        const converterName = `${identifier}JsonConverter`;
        const useNewtonsoft = !!parameters.useNewtonsoftJson;

        const converterAttr = useNewtonsoft
            ? `[Newtonsoft.Json.JsonConverter(typeof(${converterName}))]`
            : `[System.Text.Json.Serialization.JsonConverter(typeof(${converterName}))]`;
        const converterBase = useNewtonsoft
            ? `Newtonsoft.Json.JsonConverter<${identifier}>`
            : `System.Text.Json.Serialization.JsonConverter<${identifier}>`;
        const readSig = useNewtonsoft
            ? `public override ${identifier} ReadJson(Newtonsoft.Json.JsonReader r, System.Type t, ${identifier} existing, bool hasExisting, Newtonsoft.Json.JsonSerializer s)`
            : `public override ${identifier} Read(ref System.Text.Json.Utf8JsonReader r, System.Type t, System.Text.Json.JsonSerializerOptions o)`;
        const writeSig = useNewtonsoft
            ? `public override void WriteJson(Newtonsoft.Json.JsonWriter w, ${identifier} v, Newtonsoft.Json.JsonSerializer s)`
            : `public override void Write(System.Text.Json.Utf8JsonWriter w, ${identifier} v, System.Text.Json.JsonSerializerOptions o)`;

        parameters.fileWriter.writeLine(0, converterAttr);
        parameters.fileWriter.writeLine(0, `public readonly record struct ${identifier}(${csharpType} ${scalarMemberName})`);
        parameters.fileWriter.writeLine(0, '{');
        if (validatorLines.length > 0) {
            validatorLines.forEach(line => parameters.fileWriter.writeLine(1, line));
            parameters.fileWriter.writeLine(1, `public ${csharpType} ${scalarMemberName} { get; init; } = ${scalarMemberName};`);
        }
        parameters.fileWriter.writeLine(1, `public static implicit operator ${csharpType}(${identifier} s) => s.${scalarMemberName};`);
        parameters.fileWriter.writeLine(1, `public static implicit operator ${identifier}(${csharpType} v) => new(v);`);
        parameters.fileWriter.writeLine(1, `public override string ToString() => ${scalarMemberName}.ToString();`);
        parameters.fileWriter.writeLine(0, '}');

        // Companion converter — one per scalar, flavoured by the active serializer
        let readExpr, writeExpr;
        if (csharpType === 'System.Guid') {
            readExpr = useNewtonsoft ? 'System.Guid.Parse((string)r.Value!)' : 'r.GetGuid()';
            writeExpr = useNewtonsoft ? `w.WriteValue(v.${scalarMemberName}.ToString())` : `w.WriteStringValue(v.${scalarMemberName}.ToString())`;
        } else if (csharpType === 'string') {
            readExpr = useNewtonsoft ? '(string)r.Value!' : 'r.GetString()!';
            writeExpr = useNewtonsoft ? `w.WriteValue(v.${scalarMemberName})` : `w.WriteStringValue(v.${scalarMemberName})`;
        } else if (csharpType === 'bool') {
            readExpr = useNewtonsoft ? '(bool)r.Value!' : 'r.GetBoolean()';
            writeExpr = useNewtonsoft ? `w.WriteValue(v.${scalarMemberName})` : `w.WriteBooleanValue(v.${scalarMemberName})`;
        } else if (csharpType === 'int') {
            readExpr = useNewtonsoft ? 'System.Convert.ToInt32(r.Value)' : 'r.GetInt32()';
            writeExpr = useNewtonsoft ? `w.WriteValue(v.${scalarMemberName})` : `w.WriteNumberValue(v.${scalarMemberName})`;
        } else if (csharpType === 'long') {
            readExpr = useNewtonsoft ? 'System.Convert.ToInt64(r.Value)' : 'r.GetInt64()';
            writeExpr = useNewtonsoft ? `w.WriteValue(v.${scalarMemberName})` : `w.WriteNumberValue(v.${scalarMemberName})`;
        } else if (csharpType === 'double') {
            readExpr = useNewtonsoft ? 'System.Convert.ToDouble(r.Value)' : 'r.GetDouble()';
            writeExpr = useNewtonsoft ? `w.WriteValue(v.${scalarMemberName})` : `w.WriteNumberValue(v.${scalarMemberName})`;
        } else {
            readExpr = useNewtonsoft
                ? `(${csharpType})System.Convert.ChangeType((string)r.Value!, typeof(${csharpType}))`
                : `(${csharpType})System.Convert.ChangeType(r.GetString()!, typeof(${csharpType}))`;
            writeExpr = useNewtonsoft ? `w.WriteValue(v.${scalarMemberName}.ToString()!)` : `w.WriteStringValue(v.${scalarMemberName}.ToString()!)`;
        }

        parameters.fileWriter.writeLine(0, `public class ${converterName} : ${converterBase}`);
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, readSig);
        parameters.fileWriter.writeLine(2, `=> new(${readExpr});`);
        parameters.fileWriter.writeLine(1, writeSig);
        parameters.fileWriter.writeLine(2, `=> ${writeExpr};`);
        parameters.fileWriter.writeLine(0, '}');

        return null;
    }

    /**
     * Build the DataAnnotations attribute lines for a scalar declaration's validator.
     * @param {ScalarDeclaration} scalarDeclaration - the scalar declaration
     * @returns {string[]} attribute lines, empty if no validator
     * @private
     */
    buildScalarValidatorLines(scalarDeclaration) {
        const validator = scalarDeclaration.getValidator();
        if (!validator) {return [];}
        const lines = [];
        const type = scalarDeclaration.getType();
        if (type === 'String') {
            if (validator.getMinLength()) {
                lines.push(`[System.ComponentModel.DataAnnotations.MinLength(${validator.getMinLength()})]`);
            }
            if (validator.getMaxLength()) {
                lines.push(`[System.ComponentModel.DataAnnotations.MaxLength(${validator.getMaxLength()})]`);
            }
            if (validator.getRegex()) {
                lines.push(`[System.ComponentModel.DataAnnotations.RegularExpression(@"${validator.getRegex().source}", ErrorMessage = "Invalid characters")]`);
            }
        } else if (['Integer', 'Long', 'Double'].includes(type)) {
            const lower = validator.getLowerBound();
            const upper = validator.getUpperBound();
            if (lower != null || upper != null) {
                const csTypeMap = { Integer: 'int', Long: 'long', Double: 'double' };
                const defaultMin = { Integer: '-2147483648', Long: '-9223372036854775808', Double: '-1.7976931348623157E+308' };
                const defaultMax = { Integer: '2147483647', Long: '9223372036854775807', Double: '1.7976931348623157E+308' };
                const csType = csTypeMap[type];
                const lo = lower != null ? String(lower) : defaultMin[type];
                const hi = upper != null ? String(upper) : defaultMax[type];
                lines.push(`[System.ComponentModel.DataAnnotations.Range(typeof(${csType}), "${lo}", "${hi}")]`);
            }
        }
        return lines;
    }

    /**
     * Visitor design pattern
     * @param {MapDeclaration} mapDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitMapDeclaration(mapDeclaration, parameters) {
        const identifier = this.toCSharpIdentifier(undefined, mapDeclaration.getName(), parameters);
        const { keyType, valueType } = this.resolveMapTypes(mapDeclaration, parameters);
        parameters.fileWriter.writeLine(0, `public class ${identifier} : Dictionary<${keyType}, ${valueType}> {}`);
        return null;
    }

    /**
     * Resolve the C# key and value types for a MapDeclaration.
     * Handles primitives, scalars (via global using aliases and special UUID mapping),
     * and concept types.
     * @param {MapDeclaration} mapDeclaration - the map declaration to resolve types for
     * @param {Object} parameters - the visitor parameters (used for PascalCase conversion)
     * @returns {{ keyType: string, valueType: string }} the resolved C# key and value type strings
     * @private
     */
    resolveMapTypes(mapDeclaration, parameters) {
        const modelFile = mapDeclaration.getModelFile();
        const keyType = this.resolveMapSide(mapDeclaration.getKey(), modelFile, parameters);
        const valueType = this.resolveMapSide(mapDeclaration.getValue(), modelFile, parameters);
        return { keyType, valueType };
    }

    /**
     * Resolve a single map key or value side to a C# type string.
     * @param {MapKeyType|MapValueType} side - key or value side of the map
     * @param {ModelFile} modelFile - the model file containing the map declaration
     * @param {Object} parameters - the visitor parameters
     * @returns {string} - the resolved type string for the map side
     * @private
     */
    resolveMapSide(side, modelFile, parameters) {
        const typeName = side.getType();
        if (ModelUtil.isPrimitiveType(typeName)) {
            return this.toCSharpType(typeName);
        }
        if (ModelUtil.isScalar(side)) {
            const scalarDecl = modelFile.getType(typeName);
            const fqn = ModelUtil.removeNamespaceVersionFromFullyQualifiedName(scalarDecl.getFullyQualifiedName());
            return fqn === 'concerto.scalar.UUID' ? 'System.Guid' : this.toCSharpIdentifier(undefined, scalarDecl.getName(), parameters);
        }
        // concept or relationship — reuse getDotNetNamespaceOfType which returns '' for
        // same-namespace types and 'Some.Ns.' for cross-namespace types.
        const typeFqn = modelFile.getType(typeName)?.getFullyQualifiedName();
        const canonicalName = typeFqn ? ModelUtil.getShortName(typeFqn) : typeName;
        const ns = this.getDotNetNamespaceOfType(typeFqn, side.getParent(), parameters);
        return `${ns}${this.toCSharpIdentifier(undefined, canonicalName, parameters)}`;
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitScalarField(field, parameters) {
        const fqn = ModelUtil.removeNamespaceVersionFromFullyQualifiedName(field.getFullyQualifiedTypeName());
        // For concerto.scalar.UUID, the alias resolves to System.Guid; use 'UUID' (the alias name).
        // For all other scalars, use the scalar's short name — it's a global using alias.
        const scalarTypeName = field.getType();
        // Field-level default takes precedence over the scalar declaration's default.
        const rawDefault = field.getDefaultValue() ?? field.getScalarField().getDefaultValue();
        // UUID scalars wrap System.Guid — the struct constructor requires a Guid, not a string.
        // Wrap the default in a pre-computed C# literal so formatDefaultLiteral emits the right code.
        const defaultValue = (fqn === 'concerto.scalar.UUID' && rawDefault != null)
            ? { __csharpLiteral: `new(System.Guid.Parse("${rawDefault}"))` }
            : rawDefault;
        return this.writeField(field.getScalarField(), parameters, scalarTypeName, field.isOptional(), defaultValue);
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitField(field, parameters) {
        return this.writeField(field, parameters);
    }

    /**
     * Write a field
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @param {string} [externalFieldType] - the external field type like UUID (optional)
     * @param {bool} [isOptional] - the bool value indicating if external field type like UUID is optional (optional)
     * @param {*} [scalarDefaultValue] - pre-resolved default value for scalar-typed fields (optional)
     * @return {Object} the result of visiting or null
     * @private
     */
    writeField(field, parameters, externalFieldType, isOptional = false, scalarDefaultValue = undefined) {
        // write Map field
        if (ModelUtil.isMap?.(field)) {
            const mapDeclaration = field.getModelFile().getType(field.getType());
            const { keyType, valueType } = this.resolveMapTypes(mapDeclaration, parameters);
            const nullable = field.isOptional() ? '?' : '';
            const resolvedType = `Dictionary<${keyType}, ${valueType}>`;
            const emitRequired = !!parameters.useRequiredForNonOptionalReferenceTypes && !field.isOptional();
            const lines = this.toCSharpProperty('public', field.getParent()?.getName(), field.getName(), null, '', nullable, '{ get; set; }', parameters, resolvedType, emitRequired);
            lines.forEach(line => parameters.fileWriter.writeLine(1, line));
            return null;
        }

        // If no serlialization library is specified we default to the .NET one.
        // However, we also allow both options to be specified
        if (!parameters.useSystemTextJson && !parameters.useNewtonsoftJson){
            parameters.useSystemTextJson = true;
        }

        let array = '';

        if (field.isArray()) {
            array = '[]';
        }

        let isIdentifier = field.getName() === field.getParent()?.getIdentifierFieldName();
        if (isIdentifier) {
            if (this.useConcertoRuntime(parameters)) {
                parameters.fileWriter.writeLine(1, '[AccordProject.Concerto.Identifier()]');
            }
            parameters.fileWriter.writeLine(1, '[System.ComponentModel.DataAnnotations.Key]');
        }

        let fieldType = externalFieldType ? externalFieldType : this.getFieldType(field);

        // Check the underlying field type for validator applicability (handles scalar aliases)
        const rawFieldType = this.getFieldType(field);
        // Only emit DataAnnotation validators for raw primitive-typed properties.
        // Scalar-typed properties (externalFieldType set) already carry their validators
        // on the scalar struct's Value property — emitting them here would produce
        // attributes like [MinLength] on a struct type, which throws at runtime.
        if (!externalFieldType) {
            if (rawFieldType === 'String') {
                const validator = field.getValidator();

                if(validator) {
                    if(validator.getMinLength()) {
                        parameters.fileWriter.writeLine(1, `[System.ComponentModel.DataAnnotations.MinLength(${validator.getMinLength()})]`);
                    }
                    if(validator.getMaxLength()) {
                        parameters.fileWriter.writeLine(1, `[System.ComponentModel.DataAnnotations.MaxLength(${validator.getMaxLength()})]`);
                    }
                    if (validator.getRegex()) {
                        let regexVal = validator.getRegex().source;
                        parameters.fileWriter.writeLine(1, `[System.ComponentModel.DataAnnotations.RegularExpression(@"${regexVal}", ErrorMessage = "Invalid characters")]`);
                    }
                }
            } else if (['Integer', 'Long', 'Double'].includes(rawFieldType)) {
                const validator = field.getValidator();
                if (validator) {
                    const lower = validator.getLowerBound();
                    const upper = validator.getUpperBound();
                    if (lower != null || upper != null) {
                        const csTypeMap = { Integer: 'int', Long: 'long', Double: 'double' };
                        const defaultMin = { Integer: '-2147483648', Long: '-9223372036854775808', Double: '-1.7976931348623157E+308' };
                        const defaultMax = { Integer: '2147483647', Long: '9223372036854775807', Double: '1.7976931348623157E+308' };
                        const csType = csTypeMap[rawFieldType];
                        const lo = lower != null ? String(lower) : defaultMin[rawFieldType];
                        const hi = upper != null ? String(upper) : defaultMax[rawFieldType];
                        parameters.fileWriter.writeLine(1, `[System.ComponentModel.DataAnnotations.Range(typeof(${csType}), "${lo}", "${hi}")]`);
                    }
                }
            } else if (!field.isPrimitive()) {
                const fqn = this.getDotNetNamespaceOfType(field.getFullyQualifiedTypeName(), field.getParent(), parameters);
                fieldType = `${fqn}${ModelUtil.getShortName(field.getFullyQualifiedTypeName())}`;
            }
        }

        let nullableType = '';
        if(field.isOptional() || isOptional){
            nullableType = '?';
        }

        // Arrays have no per-element default initializer; scalar defaults must not bleed into T[] = new(x).
        const rawDefault = field.isArray()
            ? null
            : (externalFieldType !== undefined ? scalarDefaultValue : field.getDefaultValue());
        const csDefault = this.formatDefaultLiteral(rawDefault, rawFieldType, !!externalFieldType, field, fieldType, parameters);
        const getset = csDefault != null ? `{ get; set; } = ${csDefault};` : '{ get; set; }';
        const csharpType = this.toCSharpType(fieldType, parameters);
        let isEnum = false;
        try {
            isEnum = field.getModelFile().getType(field.getType())?.isEnum?.() || false;
        } catch (e) {
            // Keep false when declaration cannot be resolved.
        }
        const emitRequired = this.shouldEmitRequired(parameters, {
            nullableType,
            hasDefault: csDefault != null,
            isArray: field.isArray(),
            isScalarAlias: externalFieldType !== undefined,
            isPrimitive: field.isPrimitive(),
            isEnum,
            csharpType
        });

        const lines = this.toCSharpProperty(
            'public',
            field.getParent()?.getName(),
            field.getName(),
            fieldType,
            array,
            nullableType,
            getset,
            parameters,
            undefined,
            emitRequired
        );
        lines.forEach(line => parameters.fileWriter.writeLine(1, line));
        return null;
    }

    /**
     * Determines if a property should emit the C# `required` modifier.
     * This centralizes required-emission decisions for fields and relationships.
     * @param {Object} parameters - visitor parameters
     * @param {Object} options - decision options
     * @param {string} [options.nullableType] - nullable marker (`?`) when present
     * @param {boolean} [options.hasDefault] - true when a default initializer is emitted
     * @param {boolean} [options.isArray] - true when property is an array type
     * @param {boolean} [options.isScalarAlias] - true for scalar alias value-type wrappers
     * @param {boolean} [options.isPrimitive] - true for Concerto primitive fields
     * @param {boolean} [options.isEnum] - true for enum fields
     * @param {string} [options.csharpType] - resolved C# type string
     * @returns {boolean} true if `required` should be emitted
     * @private
     */
    shouldEmitRequired(parameters, options = {}) {
        if (!parameters.useRequiredForNonOptionalReferenceTypes) {return false;}
        if (options.nullableType) {return false;}
        if (options.hasDefault) {return false;}
        if (options.isArray) {return true;}
        // Scalar aliases are generated as record structs (value types), not reference types.
        if (options.isScalarAlias) {return false;}
        if (options.isEnum) {return false;}
        if (!options.csharpType) {return false;}
        return this.isCSharpReferenceType(options.csharpType, false);
    }

    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitEnumValueDeclaration(enumValueDeclaration, parameters) {
        const name = enumValueDeclaration.getName();
        const identifier = this.toCSharpIdentifier(undefined, name, parameters);
        const acceptedValue = this.getDecoratorValue(enumValueDeclaration, enumValueDecoratorName);
        if (acceptedValue) {
            parameters.fileWriter.writeLine(1, `[System.Runtime.Serialization.EnumMember(Value = "${acceptedValue}")]`);
        } else if (identifier !== name) {
            parameters.fileWriter.writeLine(1, `[System.Runtime.Serialization.EnumMember(Value = "${name}")]`);
        }
        parameters.fileWriter.writeLine(2, `${identifier},`);
        return null;
    }

    /**
     * Visitor design pattern
     * @param {Relationship} relationship - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitRelationship(relationship, parameters) {
        // If no serlialization library is specified we default to the .NET one.
        // However, we also allow both options to be specified
        if (!parameters.useSystemTextJson && !parameters.useNewtonsoftJson){
            parameters.useSystemTextJson = true;
        }

        let array = '';

        if (relationship.isArray()) {
            array = '[]';
        }

        let optional = '';

        if (relationship.isOptional()) {
            optional = '?';
        }

        let type = relationship.getType();
        if (parameters.enableReferenceType) {
            const relationshipTypeDecl = relationship.getModelFile().getModelManager().getType(relationship.getFullyQualifiedTypeName());
            const idPropertyName = relationshipTypeDecl.getIdentifierFieldName();
            // If id property exists then get type of that field
            if (idPropertyName) {
                const qualifiedType = relationshipTypeDecl.getProperty(idPropertyName).getFullyQualifiedTypeName();
                // if it's scalar type, remove namespace and version from fqn
                type = ModelUtil.removeNamespaceVersionFromFullyQualifiedName(qualifiedType);
            }
        } else {
            // Qualify the type when the relationship target is in a different namespace
            const fqn = this.getDotNetNamespaceOfType(
                relationship.getFullyQualifiedTypeName(),
                relationship.getParent(),
                parameters
            );
            type = `${fqn}${ModelUtil.getShortName(relationship.getFullyQualifiedTypeName())}`;
        }

        const csharpType = this.toCSharpType(type, parameters);
        const emitRequired = this.shouldEmitRequired(parameters, {
            nullableType: optional,
            hasDefault: false,
            isArray: !!array,
            isScalarAlias: false,
            isPrimitive: false,
            isEnum: false,
            csharpType
        });

        // we export all relationships
        const lines = this.toCSharpProperty(
            'public',
            relationship.getParent()?.getName(),
            relationship.getName(),
            type,
            array,
            optional,
            '{ get; set; }',
            parameters,
            undefined,
            emitRequired
        );
        lines.forEach(line => parameters.fileWriter.writeLine(1, line));
        return null;
    }

    /**
     * Determines whether a generated C# property type is a reference type.
     * @param {string} csharpType - resolved C# type name
     * @param {boolean} isArray - whether the property is an array
     * @returns {boolean} true if reference type
     * @private
     */
    isCSharpReferenceType(csharpType, isArray) {
        if (isArray) {return true;}
        if (csharpType === 'string') {return true;}
        if (csharpType === 'System.Guid' || csharpType === 'System.DateTime') {return false;}
        return !csharpBuiltInTypes.includes(csharpType);
    }

    /**
     * Format a Concerto default value as a C# literal suitable for a property initializer.
     * String values are quoted; scalar-typed fields wrap the literal in `new(...)`.
     * @param {*} value - the raw default value from getDefaultValue()
     * @param {string} concertoType - the underlying Concerto primitive type
     * @param {boolean} isScalar - true when the property type is a scalar struct
     * @param {Field} [field] - the field for context when handling enum defaults (optional)
     * @param {string} [resolvedFieldType] - resolved C# property type used for enum qualification
     * @param {object} [parameters] - visitor parameters
     * @returns {string|null} C# literal string, or null if no default
     * @private
     */
    formatDefaultLiteral(value, concertoType, isScalar, field, resolvedFieldType, parameters) {
        if (value == null) {return null;}
        // Pre-computed C# literal (e.g. UUID default needs System.Guid.Parse, not a bare string)
        if (value?.__csharpLiteral) {return value.__csharpLiteral;}

        // Handle enum types: emit the enum member access expression (e.g. PartySide.External) rather than a raw literal (e.g. "EXTERNAL")
        if (field && !isScalar) {
            try {
                const fieldType = field.getModelFile().getType(field.getType());
                if (fieldType?.isEnum?.()) {
                    const enumMemberName = this.toCSharpIdentifier(undefined, String(value), parameters);
                    const enumTypeName = resolvedFieldType || this.toCSharpIdentifier(undefined, field.getType(), parameters);
                    return `${enumTypeName}.${enumMemberName}`;
                }
            } catch (e) {
                // Type resolution failed; fall through to default handling
            }
        }

        if (concertoType === 'DateTime') {
            const literal = isScalar ? `new(System.DateTime.Parse("${value}"))` : `System.DateTime.Parse("${value}")`;
            return literal;
        }

        const rawLiteral = concertoType === 'String' ? `"${value}"` : String(value);
        return isScalar ? `new(${rawLiteral})` : rawLiteral;
    }

    /**
     * Ensures that a concerto property name is valid in CSharp
     * @param {string} access the CSharp field access
     * @param {string|undefined} parentName the Concerto parent name
     * @param {string} propertyName the Concerto property name
     * @param {string} propertyType the Concerto property type
     * @param {string} array the array declaration
     * @param {string} nullableType the nullable expression ?
     * @param {string} getset the getter and setter declaration
     * @param {Object} [parameters]  - the parameter
     * @param {string} [resolvedType] - pre-built C# type string; when provided, skips toCSharpType
     * @param {boolean} [emitRequired] - true to emit the C# `required` modifier
     * @returns {string} the property declaration
     */
    toCSharpProperty(access, parentName, propertyName, propertyType, array, nullableType, getset, parameters, resolvedType = undefined, emitRequired = false) {
        const identifier = this.toCSharpIdentifier(parentName, propertyName, parameters);
        const type = resolvedType ?? this.toCSharpType(propertyType, parameters);

        let lines = [];

        if (identifier !== propertyName){
            if (parameters?.useSystemTextJson){
                lines.push(`[System.Text.Json.Serialization.JsonPropertyName("${propertyName}")]`);
            }
            if (parameters?.useNewtonsoftJson){
                lines.push(`[Newtonsoft.Json.JsonProperty("${propertyName}")]`);
            }
        }

        lines.push(`${access} ${emitRequired ? 'required ' : ''}${type}${array}${nullableType} ${identifier} ${getset}`);
        return lines;
    }

    /**
     * Converts a Concerto namespace to a CSharp namespace. If pascal casing is enabled,
     * each component of the namespace is pascal cased - for example org.example will
     * become Org.Example, not OrgExample.
     * @param {string} ns the Concerto namespace
     * @param {object} [parameters] true to enable pascal casing
     * @param {boolean} [parameters.pascalCase] true to enable pascal casing
     * @return {string} the CSharp identifier
     * @private
     */
    toCSharpNamespace(ns, parameters) {
        return this.toCase(ns, parameters?.pascalCase);
    }

    /**
     * Converts a Concerto name to a CSharp identifier. Internal names such
     * as $class, $identifier are prefixed with "_". Names matching C# keywords
     * such as class, namespace are prefixed with "_". If pascal casing is enabled,
     * the name is pascal cased.
     * @param {string|undefined} parentName the Concerto name of the parent type
     * @param {string} name the Concerto name
     * @param {object} [parameters] true to enable pascal casing
     * @param {boolean} [parameters.pascalCase] true to enable pascal casing
     * @return {string} the CSharp identifier
     * @private
     */
    toCSharpIdentifier(parentName, name, parameters) {
        // Replace the $ in internal names with an underscore.
        let underscore = false;
        if(name.startsWith('$')) {
            name = name.substring(1);
            underscore = true;
        }

        // Apply pascal casing.
        if(parameters?.pascalCase) {
            name = this.toCase(name, true);
        // Ensure name isn't a reserved keyword.
        } else if(reservedKeywords.includes(name)) {
            underscore = true;
        }

        // Ensure it is not the same as the parent name.
        if (parentName) {
            const parentIdentifier = this.toCSharpIdentifier(undefined, parentName, parameters);
            if (name === parentIdentifier) {
                underscore = true;
            }
        }

        if (underscore) {
            return '_' + name;
        } else {
            return name;
        }
    }

    /**
     * Converts a Concerto type to a CSharp type. Primitive types are converted
     * everything else is passed through unchanged.
     * @param {string} type  - the concerto type
     * @param {object} [parameters] true to enable pascal casing
     * @param {boolean} [parameters.pascalCase] true to enable pascal casing
     * @return {string} the corresponding type in CSharp
     * @private
     */
    toCSharpType(type, parameters) {
        switch (type) {
        case 'DateTime':
            return 'System.DateTime';
        case 'Boolean':
            return 'bool';
        case 'String':
            return 'string';
        case 'Double':
            return 'double';
        case 'Long':
            return 'long';
        case 'Integer':
            return 'int';
        case 'concerto.scalar.UUID':
            return 'System.Guid';
        default:
            if(csharpBuiltInTypes.includes(type)) {
                return type;
            }
            return this.toCSharpIdentifier(undefined, type, parameters);
        }
    }

    /**
     * Get the .NET namespace for a given model file.
     * @private
     * @param {ModelFile} modelFile the model file
     * @param {object} [parameters] the parameters
     * @param {string} [parameters.namespacePrefix] the optional namespace prefix
     * @param {boolean} [parameters.pascalCase] the optional namespace prefix
     * @return {string} the .NET namespace for the model file
     */
    getDotNetNamespace(modelFile, parameters) {
        if (this.useConcertoRuntime(parameters)) {
            const decorator = modelFile.getDecorator('DotNetNamespace');
            if (decorator) {
                const args = decorator.getArguments();
                if (args.length !== 1) {
                    throw new Error('Malformed @DotNetNamespace decorator');
                }
                return args[0];
            }
        }
        const { name: namespace } = ModelUtil.parseNamespace(modelFile.getNamespace());
        const result = this.toCSharpNamespace(namespace, parameters);
        const { namespacePrefix } = parameters;
        if (namespacePrefix) {
            return `${namespacePrefix}${result}`;
        }
        return result;
    }

    /**
     * Whether generated C# should reference the AccordProject.Concerto runtime package.
     * Defaults to true unless useConcertoRuntime is false or CSHARP_USE_CONCERTO_RUNTIME=false.
     * @param {object} parameters visitor parameters
     * @returns {boolean} true when Concerto runtime attributes and namespaces should be emitted
     * @private
     */
    useConcertoRuntime(parameters) {
        if (parameters.useConcertoRuntime !== undefined) {
            return !!parameters.useConcertoRuntime;
        }
        return process.env.CSHARP_USE_CONCERTO_RUNTIME !== 'false';
    }

    /**
     * Get the field type for a given field.
     * @private
     * @param {Field} field - the object being visited
     * @return {string} the type for the field
     */
    getFieldType(field) {
        const dotnetType = this.getDecoratorValue(field, dotnetTypeDecoratorName);
        if (dotnetType) {
            if (!csharpBuiltInTypes.includes(dotnetType)) {
                throw new Error('Malformed @DotNetType decorator');
            }
            return dotnetType;
        }
        return field.getType();
    }

    /**
     * Get the decorator value for a given object.
     * @private
     * @param {Object} thing - the object being visited
     * @param {string} decoratorName - name of the decorator
     * @returns {String} - value of decorator or null
     */
    getDecoratorValue(thing, decoratorName) {
        const decorator = thing.getDecorator(decoratorName);
        if (decorator) {
            const args = decorator.getArguments();
            if (args.length !== 1) {
                throw new Error(`Malformed @${decoratorName} decorator`);
            }
            return args[0];
        }
        return null;
    }

    /**
     * Apply proper casing to the string value
     * @param {string} string value
     * @param {boolean} isPascalCase flag to convert to pascalCase
     * @returns {String} properly cased string value
     * @private
     */
    toCase(string, isPascalCase) {
        const components = string.split('.');
        return components.map(component => {
            if (isPascalCase) {
                return camelCase(component, { pascalCase: true });
            }
            if (reservedKeywords.includes(component)) {
                return '_' + component;
            }
            return component;
        }).join('.');
    }
}

module.exports = CSharpVisitor;
