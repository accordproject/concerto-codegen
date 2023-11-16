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

// Rust keywords
const keywords = [
    'abstract', 'as', 'async', 'await', 'become', 'box', 'break', 'const', 'continue', 'crate', 'do', 'dyn',
    'else', 'enum', 'extern', 'false', 'final', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'macro',
    'match', 'mod', 'move', 'mut', 'override', 'priv', 'pub', 'ref', 'return', 'self', 'static', 'struct',
    'super', 'trait', 'true', 'try', 'type', 'typeof', 'unsafe', 'unsized', 'use', 'virtual', 'where',
    'while', 'yield',
];

// Valid characters for Rust names.
const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';

/**
 * Convert the contents of a ModelManager to Rust code.
 * All generated modules are referenced from the 'lib' package
 * with all generated modules in the same file system folder.
 *
 * @private
 * @class
 * @memberof module:concerto-codegen
 */
class RustVisitor {
    /**
     * Helper method: Convert any string into a valid Rust name.
     * @param {string} input - the field name
     * @returns {string} - the validated rust name
     */
    toValidRustName(input) {

        // Replace any invalid characters with an underscore.
        let result = Array.from(input, c => validChars.includes(c) ? c : '_').join('');

        // Convert the string to snake case.
        result = result.replace(/[A-Z]/g, (match, offset) => {
            if (offset === 0) {
                return match.toLowerCase();
            }
            return `_${match.toLowerCase()}`;
        });

        // Add an underscore to the beginning if the first character is invalid.
        if (!validChars.includes(result.charAt(0))) {
            result = `_${result}`;
        }

        while (keywords.includes(result)) {
            result += '_';
        }

        return result;
    }


    /**
     * Visitor design pattern
     * @param {Object} thing - the object being visited
     * @param {Object} parameters - the parameter
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
        }  else if (thing.isMapDeclaration?.()) {
            return;
        } else if (thing.isTypeScalar?.()) {
            return this.visitField(thing.getScalarField(), parameters);
        } else if (thing.isField?.()) {
            return this.visitField(thing, parameters);
        } else if (thing.isRelationship?.()) {
            return this.visitRelationshipDeclaration(thing, parameters);
        } else if (thing.isEnumValue?.()) {
            return this.visitEnumValueDeclaration(thing, parameters);
        } else if (thing.isScalarDeclaration?.()) {
            return;
        } else {
            throw new Error('Unrecognised type: ' + typeof thing + ', value: ' + util.inspect(thing, { showHidden: true, depth: null }));
        }
    }

    /**
     * Visitor design pattern
     * @param {ModelManager} modelManager - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitModelManager(modelManager, parameters) {
        // Create the 'lib.rs' file containing the module references.
        const fileName = 'mod.rs';
        parameters.fileWriter.openFile(fileName);
        for (const namespace of modelManager.getNamespaces()) {
            const namespaceFileName = this.toValidRustName(namespace);
            parameters.fileWriter.writeLine(0, '#[allow(unused_imports)]');
            parameters.fileWriter.writeLine(0, `pub mod ${namespaceFileName};`);
        }
        parameters.fileWriter.writeLine(0, '#[allow(unused_imports)]');
        parameters.fileWriter.writeLine(0, 'pub mod utils;');
        parameters.fileWriter.closeFile();

        this.addUtilsModelFile(parameters);

        // Create the files for each namespace.
        modelManager.getModelFiles(true).forEach((modelFile) => {
            modelFile.accept(this, parameters);
        });

        return null;
    }

    /**
     * Visitor design pattern
     * @param {ModelFile} modelFile - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitModelFile(modelFile, parameters) {
        const fileName = this.toValidRustName(modelFile.getNamespace());
        parameters.fileWriter.openFile(`${fileName}.rs`);
        parameters.fileWriter.writeLine(0, 'use serde::{ Deserialize, Serialize };');
        parameters.fileWriter.writeLine(0, 'use chrono::{ DateTime, TimeZone, Utc };');
        parameters.fileWriter.writeLine(1, '');

        const relationshipImports = modelFile.getAllDeclarations()
            .filter(classDeclaration => classDeclaration.getProperties?.())
            .map(classDeclaration =>
                classDeclaration.getProperties().filter(property => property.isRelationship?.())
            ).flatMap(property => property).map(property => property.getFullyQualifiedTypeName?.());

        const imports = [...new Set([...modelFile.getImports(), ...relationshipImports])];
        imports.map(importString =>
            ModelUtil.getNamespace(importString))
            .filter(namespace => namespace !== modelFile.getNamespace()) // Skip own namespace.
            .filter((v, i, a) => a.indexOf(v) === i) // Remove any duplicates from direct imports
            .forEach(namespace => {
                parameters.fileWriter.writeLine(0, `use crate::${this.toValidRustName(namespace)}::*;`);
            });

        const hasMapDeclaration = modelFile.getAllDeclarations()
            .find(declaration => declaration.isMapDeclaration?.());

        if (hasMapDeclaration) {
            parameters.fileWriter.writeLine(0, 'use std::collections::HashMap;');
        }

        parameters.fileWriter.writeLine(0, 'use crate::utils::*;');
        parameters.fileWriter.writeLine(1, '');
        modelFile.getAllDeclarations().forEach((declaration) => {
            declaration.accept(this, parameters);
        });
        parameters.fileWriter.closeFile();
        return null;
    }

    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitClassDeclaration(classDeclaration, parameters) {
        parameters.fileWriter.writeLine(0, '#[derive(Debug, Serialize, Deserialize)]');
        parameters.fileWriter.writeLine(0, `pub struct ${classDeclaration.getName()} {`);

        this.visitField({
            name: '$class',
            type: 'String'
        }, parameters);

        classDeclaration.getProperties().forEach((property) => {
            parameters.fileWriter.writeLine(1, '');
            property.accept(this, parameters);
        });

        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');
        return null;
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitField(field, parameters) {
        let type = this.toRustType(field.type);
        if (field.isArray?.()) {
            type = `Vec<${type}>`;
        }

        parameters.fileWriter.writeLine(1, '#[serde(');
        parameters.fileWriter.writeLine(2, `rename = "${field.name}",`);
        if (field.isOptional?.()) {
            parameters.fileWriter.writeLine(2, 'skip_serializing_if = "Option::is_none",');
            type = `Option<${type}>`;
        }
        if (this.isDateField(field.type)) {
            if (field.isOptional?.()) {
                parameters.fileWriter.writeLine(2, 'serialize_with = "serialize_datetime_option",');
                parameters.fileWriter.writeLine(2, 'deserialize_with = "deserialize_datetime_option",');
            } else {
                parameters.fileWriter.writeLine(2, 'serialize_with = "serialize_datetime",');
                parameters.fileWriter.writeLine(2, 'deserialize_with = "deserialize_datetime",');

            }
        }
        parameters.fileWriter.writeLine(1, ')]');

        if (!ModelUtil.isPrimitiveType(field.type) && ModelUtil.isMap(field)) {
            const mapDeclaration = field.getModelFile().getType(field.getType());
            const mapKeyType     = mapDeclaration.getKey().getType();
            const mapValueType   = mapDeclaration.getValue().getType();

            let rustKeyType;
            let rustValueType;

            // Key
            if (ModelUtil.isPrimitiveType(mapKeyType)) {
                rustKeyType = this.toRustType(mapKeyType);
            } else if (ModelUtil.isScalar(mapDeclaration.getKey())) {
                const scalarDeclaration = mapDeclaration.getModelFile().getType(mapDeclaration.getKey().getType());
                const scalarType = scalarDeclaration.getType();
                rustKeyType = this.toRustType(scalarType);
            }
            // Value
            if (ModelUtil.isPrimitiveType(mapValueType)) {
                rustValueType = this.toRustType(mapValueType);
            } else if (ModelUtil.isScalar(mapDeclaration.getValue())) {
                const scalarDeclaration = mapDeclaration.getModelFile().getType(mapDeclaration.getValue().getType());
                const scalarType = scalarDeclaration.getType();
                rustValueType = this.toRustType(scalarType);
            } else {
                rustValueType = mapValueType;
            }

            parameters.fileWriter.writeLine(1, `pub mut ${this.toValidRustName(field.getName())}: HashMap<${rustKeyType}, ${rustValueType}> = HashMap::new();`);

            return null;
        }

        parameters.fileWriter.writeLine(1, `pub ${this.toValidRustName(field.name)}: ${type},`);
        return null;
    }

    /**
     * Visitor design pattern
     * @param {EnumDeclaration} enumDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitEnumDeclaration(enumDeclaration, parameters) {
        parameters.fileWriter.writeLine(0, '#[derive(Debug, Serialize, Deserialize)]');
        parameters.fileWriter.writeLine(0, 'pub enum ' + enumDeclaration.getName() + ' {');
        enumDeclaration.getOwnProperties().forEach((property) => {
            property.accept(this, parameters);
        });
        parameters.fileWriter.writeLine(0, '}\n');
        return null;
    }

    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitEnumValueDeclaration(enumValueDeclaration, parameters) {
        const name = enumValueDeclaration.getName();
        parameters.fileWriter.writeLine(1, '#[allow(non_camel_case_types)]');
        parameters.fileWriter.writeLine(1, `${name},`);
        return null;
    }

    /**
     * Visitor design pattern
     * @param {RelationshipDeclaration} relationshipDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitRelationshipDeclaration(relationshipDeclaration, parameters) {
        let type = relationshipDeclaration.type;
        if (relationshipDeclaration.isArray?.()) {
            type = `Vec<${type}>`;
        }
        if (relationshipDeclaration.isOptional?.()) {
            type = `Option<${type}>`;
        }
        parameters.fileWriter.writeLine(1, `#[serde(rename = "${relationshipDeclaration.name}")]`);
        parameters.fileWriter.writeLine(1, `pub ${this.toValidRustName(relationshipDeclaration.name.replace('$', ''))}: ${type},`);
        return null;
    }

    /**
     * Visitor design pattern
     * @param {String} type - the data type type to be converted
     * @return {String} - the equivalent data type in rust
     * @private
     */
    toRustType(type) {
        switch (type) {
        case 'DateTime':
            return 'DateTime<Utc>';
        case 'Boolean':
            return 'bool';
        case 'Long':
            return 'u64';
        case 'Double':
            return 'f64';
        default: {
            return type;
        }
        }
    }

    /**
     * Visitor design pattern
     * @param {String} type - the data type type to be checked
     * @return {Boolean} the result as boolean
     * @private
     */
    isDateField(type) {
        return type === 'DateTime';
    }

    /**
     * Visitor design pattern
     * @param {Object} parameters - the parameter
     * @private
     */
    addUtilsModelFile(parameters) {
        parameters.fileWriter.openFile('utils.rs');
        parameters.fileWriter.writeLine(0, 'use chrono::{ DateTime, TimeZone, Utc };');
        parameters.fileWriter.writeLine(0, 'use serde::{ Deserialize, Serialize, Deserializer, Serializer };');
        parameters.fileWriter.writeLine(1, '');
        parameters.fileWriter.writeLine(0, 'pub fn serialize_datetime_option<S>(datetime: &Option<chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>');
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, 'match datetime {');
        parameters.fileWriter.writeLine(2, 'Some(dt) => {');
        parameters.fileWriter.writeLine(3, 'serialize_datetime(&dt, serializer)');
        parameters.fileWriter.writeLine(2, '},');
        parameters.fileWriter.writeLine(2, '_ => unreachable!(),');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');
        parameters.fileWriter.writeLine(0, 'pub fn deserialize_datetime_option<\'de, D>(deserializer: D) -> Result<Option<chrono::DateTime<Utc>>, D::Error>');
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, 'match deserialize_datetime(deserializer) {');
        parameters.fileWriter.writeLine(2, 'Ok(result)=>Ok(Some(result)),');
        parameters.fileWriter.writeLine(2, 'Err(error) => Err(error),');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');
        parameters.fileWriter.writeLine(0, 'pub fn deserialize_datetime<\'de, D>(deserializer: D) -> Result<chrono::DateTime<Utc>, D::Error>');
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, 'let datetime_str = String::deserialize(deserializer)?;');
        parameters.fileWriter.writeLine(1, 'Utc.datetime_from_str(&datetime_str, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(1, '');
        parameters.fileWriter.writeLine(0, 'pub fn serialize_datetime<S>(datetime: &chrono::DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>');
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, 'let datetime_str = datetime.format("%+").to_string();');
        parameters.fileWriter.writeLine(1, 'serializer.serialize_str(&datetime_str)');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.closeFile();
    }
}

module.exports = RustVisitor;
