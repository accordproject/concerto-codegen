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

// Types needed for TypeScript generation.
/* eslint-disable no-unused-vars */
/* istanbul ignore next */
if (global === undefined) {
    const { ModelManager, ModelFile, ClassDeclaration, ScalarDeclaration, Field, EnumValueDeclaration, RelationshipDeclaration, Decorator} = require('@accordproject/concerto-core');
}
/* eslint-enable no-unused-vars */

/**
 * Visitor class that traverses various model elements
 *
 * @protected
 * @class
 */
class BaseVisitor {

    /**
     * Visitor design pattern
     * @param {Object} thing - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @protected
     */
    visit(thing, parameters) {
        if (thing.isModelManager?.()) {
            return this.visitModelManager(thing, parameters);
        } else if (thing.isModelFile?.()) {
            return this.visitModelFile(thing, parameters);
        } else if (thing.isParticipant?.()) {
            return this.visitParticipantDeclaration(thing, parameters);
        } else if (thing.isTransaction?.()) {
            return this.visitTransactionDeclaration(thing, parameters);
        } else if (thing.isEvent?.()) {
            return this.visitEventDeclaration(thing, parameters);
        } else if (thing.isAsset?.()) {
            return this.visitAssetDeclaration(thing, parameters);
        } else if (thing.isMapDeclaration?.()) {
            return this.visitMapDeclaration(thing, parameters);
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
            return this.visitScalarDeclaration(thing, parameters);
        } else if (thing.isDecorator?.()) {
            return this.visitDecorator(thing, parameters);
        } else {
            throw new Error('Unrecognised ' + JSON.stringify(thing) );
        }
    }

    /**
     * Visitor design pattern
     * @param {ModelManager} modelManager - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitModelManager(modelManager, parameters) {
        modelManager.getModelFiles().forEach((decl) => {
            decl.accept(this, parameters);
        });
    }

    /**
     * Visitor design pattern
     * @param {ModelFile} modelFile - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitModelFile(modelFile, parameters) {
        modelFile.getAllDeclarations().forEach((decl) => {
            decl.accept(this, parameters);
        });
        modelFile.getDecorators().forEach(decorator => decorator.accept(this, parameters));
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitAssetDeclaration(classDeclaration, parameters) {
        this.visitClassDeclaration(classDeclaration, parameters, 'asset');
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitEnumDeclaration(classDeclaration, parameters) {
        this.visitClassDeclaration(classDeclaration, parameters, 'enumeration');
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitEventDeclaration(classDeclaration, parameters) {
        this.visitClassDeclaration(classDeclaration, parameters, 'event');
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitParticipantDeclaration(classDeclaration, parameters) {
        this.visitClassDeclaration(classDeclaration, parameters, 'participant');
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitTransactionDeclaration(classDeclaration, parameters) {
        this.visitClassDeclaration(classDeclaration, parameters, 'transaction');
    }


    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @param {string} type  - the type of the declaration
     * @protected
     */
    visitClassDeclaration(classDeclaration, parameters, type = 'concept') {
        classDeclaration.getOwnProperties().forEach((property) => {
            property.accept(this, parameters);
        });
        classDeclaration.getDecorators().forEach(decorator => decorator.accept(this, parameters));
    }

    /**
     * Visitor design pattern
     * @param {ScalarDeclaration} scalarDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitScalarDeclaration(scalarDeclaration, parameters) {
        scalarDeclaration.getDecorators().forEach(decorator => decorator.accept(this, parameters));
        return;
    }

    /**
     * Visitor design pattern
     * @param {MapDeclaration} mapDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitMapDeclaration(mapDeclaration, parameters) {
        mapDeclaration.getDecorators().forEach(decorator => decorator.accept(this, parameters));
        mapDeclaration.getKey().getDecorators().forEach(decorator => decorator.accept(this, parameters));
        mapDeclaration.getValue().getDecorators().forEach(decorator => decorator.accept(this, parameters));
        return;
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitScalarField(field, parameters) {
        field.getDecorators().forEach(decorator => decorator.accept(this, parameters));
        this.visitField(field.getScalarField(), parameters);
    }

    /**
     * Visitor design pattern
     * @param {RelationshipDeclaration} relationship - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitRelationship(relationship, parameters) {
        this.visitField(relationship, parameters);
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitField(field, parameters) {
        field.getDecorators().forEach(decorator => decorator.accept(this, parameters));
    }

    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitEnumValueDeclaration(enumValueDeclaration, parameters) {
        enumValueDeclaration.getDecorators().forEach(decorator => decorator.accept(this, parameters));
    }

    /**
     * Visitor design pattern
     * @param {Decorator} decorator - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitDecorator(decorator, parameters) {
        return;
    }
}

module.exports = BaseVisitor;
