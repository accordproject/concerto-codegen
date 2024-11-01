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
const BaseVisitor = require('./basevisitor');

// Types needed for TypeScript generation.
/* eslint-disable no-unused-vars */
/* istanbul ignore next */
if (global === undefined) {
    const { ModelManager, ModelFile, ClassDeclaration, ScalarDeclaration, Field, EnumValueDeclaration, RelationshipDeclaration, Decorator} = require('@accordproject/concerto-core');
}
/* eslint-enable no-unused-vars */

/**
 * Convert the contents of a ModelManager a diagram format (such as PlantUML or Mermaid)
 * Set a fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @protected
 * @class
 */
class DiagramVisitor extends BaseVisitor {


    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitField(field, parameters) {
        let array = '';

        if(field.isArray()) {
            array = '[]';
        }
        super.visitField(field, parameters);
        if(parameters.fileWriter) {
            parameters.fileWriter.writeLine(1, '+ ' + field.getType() + array + ' ' + field.getName());
        }
    }

    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitEnumValueDeclaration(enumValueDeclaration, parameters) {
        super.visitEnumValueDeclaration(enumValueDeclaration, parameters);
        if(parameters.fileWriter) {
            parameters.fileWriter.writeLine(1, '+ ' + enumValueDeclaration.getName());
        }
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    writeDeclarationSupertype(classDeclaration, parameters) {
        if(classDeclaration.getSuperType()) {
            const namespace = ModelUtil.getNamespace(classDeclaration.getSuperType());
            const isBaseModel = ModelUtil.parseNamespace(namespace).name === 'concerto';
            if (parameters.hideBaseModel && isBaseModel){
                return;
            }
            if(parameters.fileWriter) {
                const source = this.escapeString(classDeclaration.getFullyQualifiedName());
                const target = this.escapeString(classDeclaration.getSuperType());
                parameters.fileWriter.writeLine(0, `${source} ${DiagramVisitor.INHERITANCE} ${target}`);
            }
        }
    }
}

DiagramVisitor.COMPOSITION = '*--';
DiagramVisitor.AGGREGATION = 'o--';
DiagramVisitor.INHERITANCE = '--|>';

module.exports = DiagramVisitor;
