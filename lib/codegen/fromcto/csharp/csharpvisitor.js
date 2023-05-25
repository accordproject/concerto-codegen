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
const util = require('util');

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
        } else if (thing.isEnum?.()) {
            return this.visitEnumDeclaration(thing, parameters);
        } else if (thing.isClassDeclaration?.()) {
            return this.visitClassDeclaration(thing, parameters);
        } else if (thing.isTypeScalar?.()) {
            return this.visitScalarField(thing, parameters);
        } else if (thing.isField?.()) {
            return this.visitField(thing, parameters);
        } else if (thing.isRelationship?.()) {
            return this.visitRelationship(thing, parameters);
        } else if (thing.isEnumValue?.()) {
            return this.visitEnumValueDeclaration(thing, parameters);
        } else if (thing.isScalarDeclaration?.()) {
            return this.visitScalarDeclarationField(thing, parameters);
        } else {
            throw new Error('Unrecognised type: ' + typeof thing + ', value: ' + util.inspect(thing, {
                showHidden: true,
                depth: 2
            }));
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

        modelFile.getImports()
            .map(importString => ModelUtil.getNamespace(importString))
            .filter(namespace => namespace !== modelFile.getNamespace()) // Skip own namespace.
            .filter((v, i, a) => a.indexOf(v) === i) // Remove any duplicates from direct imports
            .forEach(namespace => {
                const otherModelFile = modelFile.getModelManager()?.getModelFile(namespace);
                if (!otherModelFile) {
                    // Couldn't resolve the other model file.
                    parameters.fileWriter.writeLine(0, `using ${namespacePrefix}${namespace};`);
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
        parameters.fileWriter.writeLine(0, `[AccordProject.Concerto.Type(Namespace = "${namespace}", Version = ${version ? `"${version}"` : 'null'}, Name = "${name}")]`);

        // classDeclaration has any other subtypes
        if (parameters.useSystemTextJson) {
            parameters.fileWriter.writeLine(0, '[System.Text.Json.Serialization.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterFactorySystem))]');
        }
        if (parameters.useNewtonsoftJson) {
            parameters.fileWriter.writeLine(0, '[Newtonsoft.Json.JsonConverter(typeof(AccordProject.Concerto.ConcertoConverterNewtonsoft))]');
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
        // Resolve to dotnet namespace only if its a non system type
        if (type &&  ModelUtil.parseNamespace(ModelUtil.getNamespace(type)).name !== 'concerto') {
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
    visitScalarDeclarationField(scalarDeclaration, parameters) {
        parameters.fileWriter.writeLine(0, '//Dummy implementation of the scalar declaration to avoid compilation errors.');
        parameters.fileWriter.writeLine(0, `class ${scalarDeclaration.getName()}_Dummy {}`);
        return null;
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitScalarField(field, parameters) {
        const fieldType = ModelUtil.removeNamespaceVersionFromFullyQualifiedName(field.getFullyQualifiedTypeName());
        return this.writeField(field.getScalarField(), parameters, fieldType === 'concerto.scalar.UUID' ? fieldType : null , field.isOptional());
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
     * @return {Object} the result of visiting or null
     * @private
     */
    writeField(field, parameters, externalFieldType, isOptional = false) {
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
            parameters.fileWriter.writeLine(1, '[AccordProject.Concerto.Identifier()]');
        }

        let fieldType = externalFieldType ? externalFieldType : this.getFieldType(field);

        if (fieldType === 'String') {
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
        } else if (!field.isPrimitive()) {
            let fqn = this.getDotNetNamespaceOfType(field.getFullyQualifiedTypeName(), field.getParent(), parameters);
            fieldType = `${fqn}${fieldType}`;
        }

        let nullableType = '';
        if(field.isOptional() || isOptional){
            nullableType = '?';
        }

        const lines = this.toCSharpProperty(
            'public',
            field.getParent()?.getName(),
            field.getName(),
            fieldType,
            nullableType,
            array,
            '{ get; set; }',
            parameters
        );
        lines.forEach(line => parameters.fileWriter.writeLine(1, line));
        return null;
    }

    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitEnumValueDeclaration(enumValueDeclaration, parameters) {
        const acceptedValue = this.getDecoratorValue(enumValueDeclaration, enumValueDecoratorName);
        if (acceptedValue) {
            parameters.fileWriter.writeLine(1, `[System.Runtime.Serialization.EnumMember(Value = "${acceptedValue}")]`);
        }
        parameters.fileWriter.writeLine(2, `${enumValueDeclaration.getName()},`);
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
        }

        // we export all relationships
        const lines = this.toCSharpProperty(
            'public',
            relationship.getParent()?.getName(),
            relationship.getName(),
            type,
            '',
            array,
            '{ get; set; }',
            parameters
        );
        lines.forEach(line => parameters.fileWriter.writeLine(1, line));
        return null;
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
     * @returns {string} the property declaration
     */
    toCSharpProperty(access, parentName, propertyName, propertyType, array, nullableType, getset, parameters) {
        const identifier = this.toCSharpIdentifier(parentName, propertyName, parameters);
        const type = this.toCSharpType(propertyType, parameters);

        let lines = [];

        if (identifier !== propertyName){
            if (parameters?.useSystemTextJson){
                lines.push(`[System.Text.Json.Serialization.JsonPropertyName("${propertyName}")]`);
            }
            if (parameters?.useNewtonsoftJson){
                lines.push(`[Newtonsoft.Json.JsonProperty("${propertyName}")]`);
            }
        }

        lines.push(`${access} ${type}${array}${nullableType} ${identifier} ${getset}`);
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
        const components = ns.split('.');
        return components.map(component => {
            if (parameters?.pascalCase) {
                return camelCase(component, { pascalCase: true });
            } else {
                return component;
            }
        }).join('.');
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
            name = camelCase(name, { pascalCase: true });
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
            return 'float';
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
        const decorator = modelFile.getDecorator('DotNetNamespace');
        if (!decorator) {
            const { name: namespace } = ModelUtil.parseNamespace(modelFile.getNamespace());
            const result = this.toCSharpNamespace(namespace, parameters);
            const { namespacePrefix } = parameters;
            if (namespacePrefix) {
                return `${namespacePrefix}${result}`;
            } else {
                return result;
            }
        }
        const args = decorator.getArguments();
        if (args.length !== 1) {
            throw new Error('Malformed @DotNetNamespace decorator');
        }
        return args[0];
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
}

module.exports = CSharpVisitor;
