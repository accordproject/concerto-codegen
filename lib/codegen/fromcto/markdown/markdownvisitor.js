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

const MermaidVisitor = require('../mermaid/mermaidvisitor');
const BaseVisitor = require('../../../common/basevisitor');
const { ModelUtil } = require('@accordproject/concerto-core');
const InMemoryWriter = require('@accordproject/concerto-util').InMemoryWriter;

/**
 * Convert the contents of a ModelManager
 * to markdown file, containing Mermaid files for the diagrams.
 * Set a fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @private
 * @class
 */
class MarkdownVisitor extends BaseVisitor {
    /**
     * Visitor design pattern
     * @param {ModelManager} modelManager - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitModelManager(modelManager, parameters) {
        parameters.stack ??= [];

        parameters.fileWriter.openFile('models.md');

        modelManager.getModelFiles().forEach((decl) => {
            decl.accept(this, parameters);
        });

        parameters.fileWriter.closeFile();

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
        parameters.stack ??= [];

        parameters.fileWriter.writeLine(0, `# Namespace ${modelFile.getNamespace()}`);

        parameters.fileWriter.writeLine(0, '');
        parameters.fileWriter.writeLine(0, '## Overview');
        parameters.fileWriter.writeLine(0, `- ${modelFile.getConceptDeclarations().length} concepts`);
        parameters.fileWriter.writeLine(0, `- ${modelFile.getEnumDeclarations().length} enumerations`);
        parameters.fileWriter.writeLine(0, `- ${modelFile.getMapDeclarations().length} maps`);
        parameters.fileWriter.writeLine(0, `- ${modelFile.getScalarDeclarations().length} scalars`);
        parameters.fileWriter.writeLine(0, `- ${modelFile.getAssetDeclarations().length} assets`);
        parameters.fileWriter.writeLine(0, `- ${modelFile.getParticipantDeclarations().length} participants`);
        parameters.fileWriter.writeLine(0, `- ${modelFile.getTransactionDeclarations().length} transactions`);
        parameters.fileWriter.writeLine(0, `- ${modelFile.getEventDeclarations().length} events`);
        parameters.fileWriter.writeLine(0, `- ${modelFile.getAllDeclarations().length} total declarations`);

        parameters.fileWriter.writeLine(0, '');
        parameters.fileWriter.writeLine(0, '## Imports');
        modelFile.getImports().forEach( imp => {
            parameters.fileWriter.writeLine(0, `- ${imp}`);
        });

        parameters.fileWriter.writeLine(0, '## Classes');
        super.visitModelFile(modelFile, parameters);

        const visitor = new MermaidVisitor();
        const writer = new InMemoryWriter();
        writer.openFile('model.mmd');
        writer.writeLine(0, '```mermaid');
        writer.writeLine(0, 'classDiagram');

        const childParameters = {
            fileWriter: writer,
            hideBaseModel: true,
            showCompositionRelationships: true
        };
        modelFile.accept(visitor, childParameters);
        writer.writeLine(0, '```');
        writer.closeFile();

        const files = writer.getFilesInMemory();

        const diagram = files.get('model.mmd');

        if (diagram) {
            parameters.fileWriter.writeLine(0, '');
            parameters.fileWriter.writeLine(0, '## Diagram');
            parameters.fileWriter.writeLine(0, diagram);
        }

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
        parameters.stack.push(classDeclaration.getFullyQualifiedName());

        parameters.fileWriter.writeLine(0, '');
        parameters.fileWriter.writeLine(0, `### ${classDeclaration.getName()} (Concept)`);
        parameters.fileWriter.writeLine(0, '');

        const descriptionDecorator = classDeclaration.getDecorator('description');
        if (descriptionDecorator && descriptionDecorator.getArguments().length > 0) {
            parameters.fileWriter.writeLine(0, descriptionDecorator?.getArguments()[0] || '');
        }

        if(classDeclaration.isAbstract()){
            parameters.fileWriter.writeLine(0, ' - Is abstract and cannot be instantiated');
        }

        if(classDeclaration.getSuperType() &&
            !classDeclaration.getModelFile().getModelManager().getType(classDeclaration.getSuperType()).getModelFile().isSystemModelFile()){
            parameters.fileWriter.writeLine(0, ` - Inherits fields from <code>${classDeclaration.getSuperType()}</code>`);
        }
        parameters.fileWriter.writeLine(0, '');

        if (classDeclaration.getProperties().length > 0) {
            parameters.fileWriter.writeLine(0, '| Field | Type | Required | Identifier | Reference | Inherited | Description | Contraints | ');
            parameters.fileWriter.writeLine(0, '| ------ | ------------------- | --- | --- | --- | --- |------------ | --------- |');
            classDeclaration.getProperties().forEach((property) => {
                property.accept(this, parameters);
            });
        } else {
            parameters.fileWriter.writeLine(0, 'No fields.');
        }
        parameters.fileWriter.writeLine(0, '');

        classDeclaration.getDecorators().forEach(decorator => decorator.accept(this, parameters));

        parameters.stack.pop();
        return null;
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitEnumDeclaration(classDeclaration, parameters) {
        parameters.stack.push(classDeclaration.getFullyQualifiedName());

        parameters.fileWriter.writeLine(0, '');
        parameters.fileWriter.writeLine(0, `### ${classDeclaration.getName()} (Enumeration)`);
        parameters.fileWriter.writeLine(0, '');

        const descriptionDecorator = classDeclaration.getDecorator('description');
        if (descriptionDecorator && descriptionDecorator.getArguments().length > 0) {
            parameters.fileWriter.writeLine(0, descriptionDecorator?.getArguments()[0] || '');
        }

        if (classDeclaration.getProperties().length > 0) {
            parameters.fileWriter.writeLine(0, '| Value | Description | ');
            parameters.fileWriter.writeLine(0, '| ------ | ------------------- |');
            classDeclaration.getOwnProperties().forEach((property) => {
                property.accept(this, parameters);
            });
        } else {
            parameters.fileWriter.writeLine(0, 'No values.');
        }
        parameters.fileWriter.writeLine(0, '');

        classDeclaration.getDecorators().forEach(decorator => decorator.accept(this, parameters));

        parameters.stack.pop();
        return null;
    }

    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitEnumValueDeclaration(enumValueDeclaration, parameters) {
        const descriptionDecorator = enumValueDeclaration.getDecorator('description');
        parameters.fileWriter.writeLine(0, `| ${enumValueDeclaration.getName()} |${descriptionDecorator?.getArguments()[0] || ''} |`);
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitScalarField(field, parameters) {
        // Do NOT unbox the scalar!
        this.visitField(field, parameters);
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitField(field, parameters) {
        // Ignore system fields
        if (field.getModelFile().isSystemModelFile()) {
            return;
        }

        const descriptionDecorator = field.getDecorator('description');

        let type = field.getFullyQualifiedTypeName();
        if (field.isArray()) {
            type += '[]';
        }

        const isIdentifier = field.getName() === field.getParent()?.getIdentifierFieldName();

        const validator = field.getValidator?.();

        let contraints = [];
        if(validator) {
            if(validator.getMinLength?.() !== undefined && typeof validator.getMinLength() === 'number') {
                contraints.push(`Minimum Length: ${validator.getMinLength()}`);
            }
            if(validator.getMaxLength?.() !== undefined && typeof validator.getMaxLength() === 'number') {
                contraints.push(`Maximum Length: ${validator.getMaxLength()}`);
            }
            if (validator.getRegex?.()) {
                contraints.push(`Matches Regular Expression: \`${validator.getRegex()}\``);
            }
            if(validator.getLowerBound?.() !== undefined && typeof validator.getLowerBound() === 'number') {
                contraints.push(`Minimum Value: ${validator.getLowerBound()}`);
            }
            if(validator.getUpperBound?.() !== undefined && typeof validator.getUpperBound() === 'number') {
                contraints.push(`Maximum Value: ${validator.getUpperBound()}`);
            }
        }

        const isInherited = field.getParent().getFullyQualifiedName() !== parameters.stack[parameters.stack.length-1];

        parameters.fileWriter.writeLine(0, `| ${field.getName()} | <code>${type}</code> | ${!field.isOptional() ? '✔️' : ''} | ${isIdentifier ? '✔️' : ''} | ${field.isRelationship?.() ? '✔️' : ''} | ${isInherited ? '✔️' : ''} | ${descriptionDecorator?.getArguments()[0] || ''} | ${contraints.join('<br>')} |`);
    }

    /**
     * Visitor design pattern
     * @param {Decorator} decorator - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitDecorator(decorator, parameters) {

        switch(decorator.getName()) {
        case 'example':
            parameters.fileWriter.writeLine(0, '#### Example Usage');
            parameters.fileWriter.writeLine(0, '```cs');
            parameters.fileWriter.writeLine(0, decorator.getArguments()[0]);
            parameters.fileWriter.writeLine(0, '```');
            parameters.fileWriter.writeLine(0, '');
            return;
        case 'usedBy':
            parameters.fileWriter.writeLine(0, '#### Used By');
            parameters.fileWriter.writeLine(0, '| |');
            parameters.fileWriter.writeLine(0, '| - |');
            for (const system of decorator.getArguments()) {
                parameters.fileWriter.writeLine(0, `|${system}|`);
            }
            parameters.fileWriter.writeLine(0, '');
            return;
        default:
            return;
        }
    }
}

module.exports = MarkdownVisitor;
