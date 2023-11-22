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

const VocabularyManager  = require('@accordproject/concerto-vocabulary').VocabularyManager;
const util = require('util');

/**
 * Convert the contents of a ModelManager to Vocabulary YAML.
 * All generated code is placed into the 'main' package. Set a
 * fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @private
 * @class
 * @memberof module:concerto-codegen
 */
class VocabularyVisitor {
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
            return this.visitDeclaration(thing, parameters);
        } else if (thing.isClassDeclaration?.()) {
            return this.visitDeclaration(thing, parameters);
        } else if (thing.isMapDeclaration?.()) {
            return this.visitMapDeclaration(thing, parameters);
        }  else if (thing.isScalarDeclaration?.()) {
            return this.visitScalarDeclaration(thing, parameters);
        } else if (thing.isField?.()) {
            return this.visitProperty(thing, parameters);
        } else if (thing.isRelationship?.()) {
            return this.visitProperty(thing, parameters);
        } else if (thing.isEnumValue?.()) {
            return this.visitProperty(thing, parameters);
        } else if (thing.isKey?.()) {
            return this.visitMapKey(thing, parameters);
        } else if (thing.isValue?.()) {
            return this.visitMapValue(thing, parameters);
        }
        else {
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
        modelManager.getModelFiles().forEach((modelFile) => {
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
        parameters.fileWriter.openFile(modelFile.getNamespace() + '_en.voc');
        parameters.fileWriter.writeLine(0, `#Generated vocabulary for namespace: ${modelFile.getNamespace()}`);
        parameters.fileWriter.writeLine(0, 'locale: en');
        parameters.fileWriter.writeLine(0, `namespace: ${modelFile.getNamespace()}`);
        parameters.fileWriter.writeLine(0, 'declarations:');

        modelFile.getAllDeclarations()
            .forEach((decl) => {
                decl.accept(this, parameters);
            });

        parameters.fileWriter.closeFile();

        return null;
    }

    /**
     * Visitor design pattern
     * @param {Declaration} declaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitDeclaration(declaration, parameters) {
        const declarationName = declaration.getName();
        const declarationVocabulary = VocabularyManager.englishMissingTermGenerator(null, null, declarationName);

        parameters.fileWriter.writeLine(0, `  - ${declarationName}: ${declarationVocabulary}`);


        if (declaration.getOwnProperties().length) {
            parameters.fileWriter.writeLine(0, '    properties:');
        }
        declaration.getOwnProperties().forEach((property) => {
            property.accept(this, parameters);
        });

        return null;
    }

    /**
     * Visitor design pattern
     * @param {ScalarDeclaration} scalarDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitScalarDeclaration(scalarDeclaration, parameters) {
        const scalarDeclarationName = scalarDeclaration.getName();
        const scalarDeclarationNameVocabulary = VocabularyManager.englishMissingTermGenerator(null, null, scalarDeclarationName);

        parameters.fileWriter.writeLine(0, `  - ${scalarDeclarationName}: ${scalarDeclarationNameVocabulary}`);

        return null;
    }

    /**
     * Visitor design pattern
     * @param {MapDeclaration} mapDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitMapDeclaration(mapDeclaration, parameters) {
        const mapDeclarationName = mapDeclaration.getName();
        const mapDeclarationVocabulary = VocabularyManager.englishMissingTermGenerator(null, null, mapDeclarationName);

        parameters.fileWriter.writeLine(0, `  - ${mapDeclarationName}: ${mapDeclarationVocabulary}`);

        parameters.fileWriter.writeLine(0, '    properties:');

        const mapKey = mapDeclaration.getKey();
        const mapValue = mapDeclaration.getValue();

        mapKey.accept(this, parameters);
        mapValue.accept(this, parameters);

        return null;
    }

    /**
     * Visitor design pattern
     * @param {Property} property - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitProperty(property, parameters) {
        const declarationName = property.getParent().getName();
        const propertyName = property.getName();
        const propertyVocabulary = VocabularyManager.englishMissingTermGenerator(null, null, declarationName, propertyName);

        parameters.fileWriter.writeLine(0, `      - ${propertyName}: ${propertyVocabulary}`);

        return null;
    }

    /**
     * Visitor design pattern
     * @param {MapKeyType} mapKey - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitMapKey(mapKey, parameters) {
        const mapDeclarationName = mapKey.getParent().getName();
        const mapKeyVocabulary = VocabularyManager.englishMissingTermGenerator(null, null, mapDeclarationName, 'KEY');

        parameters.fileWriter.writeLine(0, `      - KEY: ${mapKeyVocabulary}`);

        return null;
    }

    /**
     * Visitor design pattern
     * @param {MapValueType} mapValue - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitMapValue(mapValue, parameters) {
        const mapDeclarationName = mapValue.getParent().getName();
        const mapValueVocabulary = VocabularyManager.englishMissingTermGenerator(null, null, mapDeclarationName, 'VALUE');

        parameters.fileWriter.writeLine(0, `      - VALUE: ${mapValueVocabulary}`);

        return null;
    }
}

module.exports = VocabularyVisitor;
