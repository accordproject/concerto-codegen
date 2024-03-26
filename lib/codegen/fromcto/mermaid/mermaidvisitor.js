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
const DiagramVisitor = require('../../../common/diagramvisitor');

/**
 * Convert the contents of a ModelManager
 * to Mermaid format file.
 * Set a fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @protected
 * @class
 */
class MermaidVisitor extends DiagramVisitor {
    /**
     * Visitor design pattern
     * @param {ModelManager} modelManager - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitModelManager(modelManager, parameters) {
        parameters.fileWriter.openFile('model.mmd');
        parameters.fileWriter.writeLine(0, 'classDiagram');

        super.visitModelManager(modelManager, parameters);

        parameters.fileWriter.closeFile();
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @param {string} type  - the type of the declaration
     * @protected
     */
    visitClassDeclaration(classDeclaration, parameters, type = 'concept') {
        if (classDeclaration.getOwnProperties().length > 0) {
            parameters.fileWriter.writeLine(0, 'class `' + classDeclaration.getFullyQualifiedName() + '` {');
            parameters.fileWriter.writeLine(0, '<< ' + type + '>>');

            super.visitClassDeclaration(classDeclaration, parameters, type);

            parameters.fileWriter.writeLine(0, '}\n');
        } else {
            parameters.fileWriter.writeLine(0, 'class `' + classDeclaration.getFullyQualifiedName() + '`');
            parameters.fileWriter.writeLine(0, '<< ' + type + '>>' + ' `' + classDeclaration.getFullyQualifiedName() + '`\n');
        }

        if (!classDeclaration.isEnum()) {
            classDeclaration.getOwnProperties().forEach((property) => {
                if (property.isRelationship?.()) {
                    this.writeRelationshipAggregation(property, parameters);
                } else if (parameters.showCompositionRelationships && !property.isPrimitive()) {
                    const source = this.escapeString(classDeclaration.getFullyQualifiedName());
                    const target = this.escapeString(property.getFullyQualifiedTypeName());
                    const type = `"1" ${DiagramVisitor.COMPOSITION} ${property.isArray() ? '"*"':'"1"'}`;
                    parameters.fileWriter.writeLine(0, `${source} ${type} ${target}`);
                }
            });
        }

        super.writeDeclarationSupertype(classDeclaration, parameters);
    }

    /**
     * Visitor design pattern
     * @param {MapDeclaration} mapDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @param {string} type  - the type of the declaration
     * @protected
     */
    visitMapDeclaration(mapDeclaration, parameters) {
        let keyType = mapDeclaration.getKey().getType();
        let valueType = mapDeclaration.getValue().getType();

        if (!ModelUtil.isPrimitiveType(keyType)) {
            keyType = mapDeclaration.getModelFile().getFullyQualifiedTypeName(keyType);
        }

        if (!ModelUtil.isPrimitiveType(valueType)) {
            valueType = mapDeclaration.getModelFile().getFullyQualifiedTypeName(valueType);
        }

        parameters.fileWriter.writeLine(0, 'class ' + this.escapeString(mapDeclaration.getFullyQualifiedName()) + ' {');
        parameters.fileWriter.writeLine(0, '<< map >>');
        parameters.fileWriter.writeLine(1, '+ Key:' + this.escapeString(keyType));
        parameters.fileWriter.writeLine(1, '+ Value: ' + this.escapeString(valueType));
        parameters.fileWriter.writeLine(0, '}\n');
    }

    /**
     * Visitor design pattern
     * @param {RelationshipDeclaration} relationship - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    writeRelationshipAggregation(relationship, parameters) {
        let array = '"1"';
        if (relationship.isArray()) {
            array = '"*"';
        }
        const source = this.escapeString(relationship.getParent().getFullyQualifiedName());
        const target = this.escapeString(relationship.getFullyQualifiedTypeName());
        const label = relationship.getName();
        const type = `"1" ${DiagramVisitor.AGGREGATION} ${array}`;
        parameters.fileWriter.writeLine(0, `${source} ${type} ${target} : ${label}`);
    }

    /**
     * Escape versions and periods.
     * @param {String} string - the object being visited
     * @return {String} string  - the parameter
     * @protected
     */
    escapeString(string) {
        return `\`${string}\``;
    }
}

module.exports = MermaidVisitor;
