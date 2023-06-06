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

const ModelUtil = require('@accordproject/concerto-core').ModelUtil;
const util = require('util');

/**
 * Convert the contents of a ModelManager to TypeScript code.
 * All generated code is placed into the 'main' package. Set a
 * fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @private
 * @class
 * @memberof module:concerto-codegen
 */
class TypescriptVisitor {
    /**
     * Visitor design pattern
     * @param {Object} thing - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @public
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
            return this.visitField(thing.getScalarField(), parameters);
        } else if (thing.isField?.()) {
            return this.visitField(thing, parameters);
        } else if (thing.isRelationship?.()) {
            return this.visitRelationship(thing, parameters);
        } else if (thing.isEnumValue?.()) {
            return this.visitEnumValueDeclaration(thing, parameters);
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
        parameters.fileWriter.openFile(modelFile.getNamespace() + '.ts');

        parameters.fileWriter.writeLine(0, '/* eslint-disable @typescript-eslint/no-empty-interface */');
        parameters.fileWriter.writeLine(0, `// Generated code for namespace: ${modelFile.getNamespace()}`);

        // Compute the types we need to import (based on all the types of the properites
        // as well as all the super types) for all the classes in this model file
        parameters.fileWriter.writeLine(0, '\n// imports');
        const properties = new Map();
        modelFile.getAllDeclarations()
            .filter(declaration => !declaration.isScalarDeclaration?.())
            .filter(v => !v.isEnum())
            .forEach(classDeclaration => {
                if (classDeclaration.getSuperType()) {
                    const typeNamespace = ModelUtil.getNamespace(classDeclaration.getSuperType());
                    const typeName = ModelUtil.getShortName(classDeclaration.getSuperType());
                    if (!properties.has(typeNamespace)) {
                        properties.set(typeNamespace, new Set());
                    }
                    properties.get(typeNamespace).add(`I${typeName}`);
                }

                classDeclaration.getProperties().forEach(property => {
                    if (!property.isPrimitive()) {
                        const typeNamespace = ModelUtil.getNamespace(property.getFullyQualifiedTypeName());
                        const typeName = ModelUtil.getShortName(property.getFullyQualifiedTypeName());
                        if (!properties.has(typeNamespace)) {
                            properties.set(typeNamespace, new Set());
                        }
                        properties.get(typeNamespace).add(property.isTypeEnum?.() ? typeName : `I${typeName}`);
                    }
                });

                const subclasses = classDeclaration.getDirectSubclasses();
                if (subclasses && subclasses.length > 0) {
                    parameters.fileWriter.writeLine(0, '\n// Warning: Beware of circular dependencies when modifying these imports');

                    // Group subclasses by namespace
                    const namespaceBuckets = {};
                    subclasses.map(subclass => {
                        const bucket = namespaceBuckets[subclass.getNamespace()];
                        if (bucket){
                            bucket.push(subclass);
                        } else {
                            namespaceBuckets[subclass.getNamespace()] = [subclass];
                        }
                    });
                    Object.entries(namespaceBuckets)
                        .filter(([namespace]) => namespace !== modelFile.getNamespace()) // Skip own namespace
                        .map(([namespace, bucket]) => {
                            parameters.fileWriter.writeLine(0, `import type {\n\t${bucket.map(subclass => `I${subclass.getName()}`).join(',\n\t') }\n} from './${namespace}';`);
                        });
                }

            });

        modelFile.getImports().map(importString => ModelUtil.getNamespace(importString)).filter(namespace => namespace !== modelFile.getNamespace()) // Skip own namespace.
            .filter((v, i, a) => a.indexOf(v) === i) // Remove any duplicates from direct imports
            .forEach(namespace => {
                const propertyTypeNames = properties.get(namespace);
                if (propertyTypeNames) {
                    const csvPropertyTypeNames = Array.from(propertyTypeNames).join();
                    parameters.fileWriter.writeLine(0, `import {${csvPropertyTypeNames}} from './${namespace}';`);
                }
            });

        parameters.fileWriter.writeLine(0, '\n// interfaces');
        modelFile.getAllDeclarations()
            .filter(declaration => !declaration.isScalarDeclaration?.()).forEach((decl) => {
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

        parameters.fileWriter.writeLine(0, 'export enum ' + enumDeclaration.getName() + ' {');

        enumDeclaration.getOwnProperties().forEach((property) => {
            property.accept(this, parameters);
        });

        parameters.fileWriter.writeLine(0, '}\n');
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

        let superType = ' ';
        if (classDeclaration.getSuperType()) {
            superType = ` extends I${ModelUtil.getShortName(classDeclaration.getSuperType())} `;
        }

        parameters.fileWriter.writeLine(0, 'export interface I' + classDeclaration.getName() + superType + '{');

        if(!classDeclaration.getSuperType()) {
            parameters.fileWriter.writeLine(1, '$class: string;');
        }

        classDeclaration.getOwnProperties().forEach((property) => {
            property.accept(this, parameters);
        });

        parameters.fileWriter.writeLine(0, '}\n');

        // If there exists direct subclasses for this declaration then generate a union for it
        const subclasses = classDeclaration.getDirectSubclasses();
        if (subclasses && subclasses.length > 0) {
            parameters.fileWriter.writeLine(0, 'export type ' + classDeclaration.getName() +
                'Union = ' + subclasses.filter(declaration => !declaration.isEnum()).map(subclass => `I${subclass.getName()}`).join(' | \n') + ';\n');
        }
        return null;
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitField(field, parameters) {
        let array = '';
        let optional = '';

        if (field.isArray()) {
            array = '[]';
        }

        if (field.isOptional()) {
            optional = '?';
        }

        const isEnumRef = field.isPrimitive() ? false
            : field.getParent().getModelFile().getModelManager().getType(field.getFullyQualifiedTypeName()).isEnum();

        const decorators = field.getDecorators();
        const hasUnion = decorators?.some(decorator => decorator.getName() === 'union');
        const hasLiteral = decorators?.some(decorator => decorator.getName() === 'literal');
        let literal = '';
        if (hasLiteral) {
            const decoratorArguments = decorators.find(decorator => decorator.getName() === 'literal').getArguments();
            decoratorArguments.length > 0 && (literal = ` = ${field.getType()}.${decoratorArguments}`);
        }

        const tsType = this.toTsType(field.getType(), !isEnumRef && !hasUnion, hasUnion);

        if (literal) {
            parameters.fileWriter.writeLine(1, field.getName() + literal + ';');
        } else {
            parameters.fileWriter.writeLine(1, field.getName() + optional + ': ' + tsType + array + literal + ';');
        }

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
        const name = enumValueDeclaration.getName();
        parameters.fileWriter.writeLine(1,`${name} = '${name}',`);
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
        let array = '';
        let optional='';

        if (relationship.isArray()) {
            array = '[]';
        }

        if (relationship.isOptional()) {
            optional = '?';
        }

        // we export all relationships
        parameters.fileWriter.writeLine(1, relationship.getName() + optional + ': ' + this.toTsType(relationship.getType(), true) + array + ';');
        return null;
    }

    /**
     * Converts a Concerto type to a Typescript  type. Primitive types are converted
     * everything else is passed through unchanged.
     * @param {string} type  - the concerto type
     * @param {boolean} useInterface  - whether to use an interface type
     * @param {boolean} useUnion  - whether to use a union type
     * @return {string} the corresponding type in Typescript
     * @private
     */
    toTsType(type, useInterface, useUnion) {
        switch (type) {
        case 'DateTime':
            return 'Date';
        case 'Boolean':
            return 'boolean';
        case 'String':
            return 'string';
        case 'Double':
            return 'number';
        case 'Long':
            return 'number';
        case 'Integer':
            return 'number';
        default: {
            let interfacePrefix = '';
            let union = '';
            if (useInterface) {
                interfacePrefix = 'I';
            }

            if (useUnion) {
                union = 'Union';
            }

            return `${interfacePrefix}${type}${union}`;
        }
        }
    }
}

module.exports = TypescriptVisitor;
