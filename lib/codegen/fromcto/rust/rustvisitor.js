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
const { throwUnrecognizedType } = require('../../../common/util');

// Rust keywords
const keywords = [
    'abstract',
    'as',
    'async',
    'await',
    'become',
    'box',
    'break',
    'const',
    'continue',
    'crate',
    'do',
    'dyn',
    'else',
    'enum',
    'extern',
    'false',
    'final',
    'fn',
    'for',
    'if',
    'impl',
    'in',
    'let',
    'loop',
    'macro',
    'match',
    'mod',
    'move',
    'mut',
    'override',
    'priv',
    'pub',
    'ref',
    'return',
    'self',
    'static',
    'struct',
    'super',
    'trait',
    'true',
    'try',
    'type',
    'typeof',
    'unsafe',
    'unsized',
    'use',
    'virtual',
    'where',
    'while',
    'yield',
];

// Valid characters for Rust names.
const validChars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';

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
     * Convert a string to a valid Rust identifier name in snake_case
     * @param {String} input - the input string to convert
     * @return {String} - a valid Rust identifier in snake_case
     * @private
     */
    toValidRustName(input) {
        if (!input || input.length === 0) {
            return input;
        }

        // Replace any invalid characters with an underscore.
        let result = Array.from(input, (c) =>
            validChars.includes(c) ? c : '_'
        ).join('');

        // Convert to snake_case with proper handling of acronyms and consecutive uppercase letters
        result = this.toSnakeCase(result);

        // Add an underscore to the beginning if the first character is invalid (digit)
        if (result.length > 0 && /^[0-9]/.test(result)) {
            result = `_${result}`;
        }

        // Handle Rust keywords by appending underscore
        while (keywords.includes(result)) {
            result += '_';
        }

        return result;
    }

    /**
     * Convert a string to snake_case with proper handling of acronyms and consecutive uppercase letters
     * @param {String} input - the input string
     * @return {String} - the snake_case version
     * @private
     */
    toSnakeCase(input) {
        if (!input || input.length === 0) {
            return input;
        }

        // Handle the conversion step by step:
        // 1. Insert underscores before uppercase letters that follow lowercase letters or digits
        // 2. Insert underscores before the last uppercase letter in a sequence of uppercase letters
        //    when followed by a lowercase letter
        // 3. Convert everything to lowercase

        let result = '';

        for (let i = 0; i < input.length; i++) {
            const current = input[i];
            const prev = i > 0 ? input[i - 1] : null;
            const next = i < input.length - 1 ? input[i + 1] : null;

            // Check if we need to insert an underscore before this character
            let needsUnderscore = false;

            if (current.match(/[A-Z]/)) {
                // Current character is uppercase
                if (prev && prev.match(/[a-z0-9]/)) {
                    // Previous char is lowercase or digit -> insert underscore
                    // Example: "fieldName" -> "field_Name"
                    needsUnderscore = true;
                } else if (
                    prev &&
                    prev.match(/[A-Z]/) &&
                    next &&
                    next.match(/[a-z]/)
                ) {
                    // Previous char is uppercase, next is lowercase -> insert underscore
                    // Example: "XMLHttp" -> "XML_Http" (before the H)
                    needsUnderscore = true;
                }
            }

            if (needsUnderscore && result.length > 0) {
                result += '_';
            }

            result += current.toLowerCase();
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
        } else if (thing.isMapDeclaration?.()) {
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
            throwUnrecognizedType(thing);
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
        parameters.fileWriter.writeLine(
            0,
            'use serde::{ Deserialize, Serialize };'
        );
        parameters.fileWriter.writeLine(
            0,
            'use chrono::{ DateTime, TimeZone, Utc };'
        );
        parameters.fileWriter.writeLine(1, '');

        const relationshipImports = modelFile
            .getAllDeclarations()
            .filter((classDeclaration) => classDeclaration.getProperties?.())
            .map((classDeclaration) =>
                classDeclaration
                    .getProperties()
                    .filter((property) => property.isRelationship?.())
            )
            .flatMap((property) => property)
            .map((property) => property.getFullyQualifiedTypeName?.());

        const imports = [
            ...new Set([...modelFile.getImports(), ...relationshipImports]),
        ];
        imports
            .map((importString) => ModelUtil.getNamespace(importString))
            .filter((namespace) => namespace !== modelFile.getNamespace()) // Skip own namespace.
            .filter((v, i, a) => a.indexOf(v) === i) // Remove any duplicates from direct imports
            .forEach((namespace) => {
                parameters.fileWriter.writeLine(
                    0,
                    `use crate::${this.toValidRustName(namespace)}::*;`
                );
            });

        const hasMapDeclaration = modelFile
            .getAllDeclarations()
            .find((declaration) => declaration.isMapDeclaration?.());

        if (hasMapDeclaration) {
            parameters.fileWriter.writeLine(
                0,
                'use std::collections::HashMap;'
            );
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
        parameters.fileWriter.writeLine(
            0,
            '#[derive(Debug, Serialize, Deserialize)]'
        );
        parameters.fileWriter.writeLine(
            0,
            `pub struct ${classDeclaration.getName()} {`
        );

        this.visitField(
            {
                name: '$class',
                type: 'String',
            },
            parameters
        );

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

        // Handle HashMap fields separately with full DateTime serialization support
        if (!ModelUtil.isPrimitiveType(field.type) && ModelUtil.isMap(field)) {
            const mapDeclaration = field
                .getModelFile()
                .getType(field.getType());
            const mapKeyType = mapDeclaration.getKey().getType();
            const mapValueType = mapDeclaration.getValue().getType();

            let rustKeyType;
            let rustValueType;

            // Key
            if (ModelUtil.isPrimitiveType(mapKeyType)) {
                rustKeyType = this.toRustType(mapKeyType);
            } else if (ModelUtil.isScalar(mapDeclaration.getKey())) {
                const scalarDeclaration = mapDeclaration
                    .getModelFile()
                    .getType(mapDeclaration.getKey().getType());
                const scalarType = scalarDeclaration.getType();
                rustKeyType = this.toRustType(scalarType);
            } else {
                rustKeyType = mapKeyType;
            }

            // Value
            if (ModelUtil.isPrimitiveType(mapValueType)) {
                rustValueType = this.toRustType(mapValueType);
            } else if (ModelUtil.isScalar(mapDeclaration.getValue())) {
                const scalarDeclaration = mapDeclaration
                    .getModelFile()
                    .getType(mapDeclaration.getValue().getType());
                const scalarType = scalarDeclaration.getType();
                rustValueType = this.toRustType(scalarType);
            } else {
                rustValueType = mapValueType;
            }

            // Determine HashMap type
            let hashMapType = `HashMap<${rustKeyType}, ${rustValueType}>`;
            if (field.isOptional?.()) {
                hashMapType = this.wrapAsOption(hashMapType);
            }

            // Generate serde attributes for HashMap with DateTime serialization support
            parameters.fileWriter.writeLine(1, '#[serde(');
            parameters.fileWriter.writeLine(2, `rename = "${field.name}",`);

            // Add skip_serializing_if for optional HashMap fields
            if (field.isOptional?.()) {
                parameters.fileWriter.writeLine(
                    2,
                    'skip_serializing_if = "Option::is_none",'
                );
            }

            // Add custom serializers for DateTime keys/values in HashMap
            const isKeyDateTime = this.isDateField(mapKeyType);
            const isValueDateTime = this.isDateField(mapValueType);

            if (isKeyDateTime && isValueDateTime) {
                // Both key and value are DateTime
                if (field.isOptional?.()) {
                    parameters.fileWriter.writeLine(
                        2,
                        'serialize_with = "serialize_hashmap_datetime_both_option",'
                    );
                    parameters.fileWriter.writeLine(
                        2,
                        'deserialize_with = "deserialize_hashmap_datetime_both_option",'
                    );
                } else {
                    parameters.fileWriter.writeLine(
                        2,
                        'serialize_with = "serialize_hashmap_datetime_both",'
                    );
                    parameters.fileWriter.writeLine(
                        2,
                        'deserialize_with = "deserialize_hashmap_datetime_both",'
                    );
                }
            } else if (isKeyDateTime) {
                // Only key is DateTime
                if (field.isOptional?.()) {
                    parameters.fileWriter.writeLine(
                        2,
                        'serialize_with = "serialize_hashmap_datetime_key_option",'
                    );
                    parameters.fileWriter.writeLine(
                        2,
                        'deserialize_with = "deserialize_hashmap_datetime_key_option",'
                    );
                } else {
                    parameters.fileWriter.writeLine(
                        2,
                        'serialize_with = "serialize_hashmap_datetime_key",'
                    );
                    parameters.fileWriter.writeLine(
                        2,
                        'deserialize_with = "deserialize_hashmap_datetime_key",'
                    );
                }
            } else if (isValueDateTime) {
                // Only value is DateTime
                if (field.isOptional?.()) {
                    parameters.fileWriter.writeLine(
                        2,
                        'serialize_with = "serialize_hashmap_datetime_value_option",'
                    );
                    parameters.fileWriter.writeLine(
                        2,
                        'deserialize_with = "deserialize_hashmap_datetime_value_option",'
                    );
                } else {
                    parameters.fileWriter.writeLine(
                        2,
                        'serialize_with = "serialize_hashmap_datetime_value",'
                    );
                    parameters.fileWriter.writeLine(
                        2,
                        'deserialize_with = "deserialize_hashmap_datetime_value",'
                    );
                }
            }

            parameters.fileWriter.writeLine(1, ')]');

            // Write the field declaration
            parameters.fileWriter.writeLine(
                1,
                `pub ${this.toValidRustName(field.getName())}: ${hashMapType},`
            );

            return null;
        }

        // Handle regular (non-HashMap) fields
        parameters.fileWriter.writeLine(1, '#[serde(');
        parameters.fileWriter.writeLine(2, `rename = "${field.name}",`);
        if (field.isOptional?.()) {
            parameters.fileWriter.writeLine(
                2,
                'skip_serializing_if = "Option::is_none",'
            );
            type = this.wrapAsOption(type);
        }
        if (this.isDateField(field.type)) {
            if (field.isArray?.() && field.isOptional?.()) {
                // Option<Vec<DateTime<Utc>>>
                parameters.fileWriter.writeLine(
                    2,
                    'serialize_with = "serialize_datetime_array_option",'
                );
                parameters.fileWriter.writeLine(
                    2,
                    'deserialize_with = "deserialize_datetime_array_option",'
                );
            } else if (field.isArray?.()) {
                // Vec<DateTime<Utc>>
                parameters.fileWriter.writeLine(
                    2,
                    'serialize_with = "serialize_datetime_array",'
                );
                parameters.fileWriter.writeLine(
                    2,
                    'deserialize_with = "deserialize_datetime_array",'
                );
            } else if (field.isOptional?.()) {
                // Option<DateTime<Utc>>
                parameters.fileWriter.writeLine(
                    2,
                    'serialize_with = "serialize_datetime_option",'
                );
                parameters.fileWriter.writeLine(
                    2,
                    'deserialize_with = "deserialize_datetime_option",'
                );
            } else {
                // DateTime<Utc>
                parameters.fileWriter.writeLine(
                    2,
                    'serialize_with = "serialize_datetime",'
                );
                parameters.fileWriter.writeLine(
                    2,
                    'deserialize_with = "deserialize_datetime",'
                );
            }
        }
        parameters.fileWriter.writeLine(1, ')]');

        parameters.fileWriter.writeLine(
            1,
            `pub ${this.toValidRustName(field.name)}: ${type},`
        );
        return null;
    }

    /**
     * @param {String} type - the type to be wrapped as option
     * @return {String} - the wrapped type
     * @private
     */
    wrapAsOption(type) {
        return `Option<${type}>`;
    }

    /**
     * Visitor design pattern
     * @param {EnumDeclaration} enumDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    visitEnumDeclaration(enumDeclaration, parameters) {
        parameters.fileWriter.writeLine(
            0,
            '#[derive(Debug, Serialize, Deserialize)]'
        );
        parameters.fileWriter.writeLine(
            0,
            'pub enum ' + enumDeclaration.getName() + ' {'
        );
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

        // Start serde attribute block
        parameters.fileWriter.writeLine(1, '#[serde(');
        parameters.fileWriter.writeLine(
            2,
            `rename = "${relationshipDeclaration.name}",`
        );

        // Add skip_serializing_if for optional relationships (consistent with visitField)
        if (relationshipDeclaration.isOptional?.()) {
            parameters.fileWriter.writeLine(
                2,
                'skip_serializing_if = "Option::is_none",'
            );
        }

        // Close serde attribute block
        parameters.fileWriter.writeLine(1, ')]');

        parameters.fileWriter.writeLine(
            1,
            `pub ${this.toValidRustName(
                relationshipDeclaration.name.replace('$', '')
            )}: ${type},`
        );
        return null;
    }

    /**
     * Converts a Concerto type to a Rust type. Primitive types are converted
     * everything else is passed through unchanged after validation.
     * @param {string} type - the concerto type
     * @return {string} the corresponding type in Rust
     * @private
     */
    toRustType(type) {
        // Validate input
        if (!type || typeof type !== 'string') {
            throwUnrecognizedType(type);
        }

        // Handle primitive types
        switch (type) {
        case 'DateTime':
            return 'DateTime<Utc>';
        case 'Boolean':
            return 'bool';
        case 'Long':
            return 'i64';
        case 'Integer':
            return 'i32';
        case 'Double':
            return 'f64';
        case 'String':
            return 'String';
        default: {
            // For non-primitive types, validate that they are valid identifiers
            // Valid identifiers should:
            // 1. Not be empty
            // 2. Start with a letter or underscore
            // 3. Contain only letters, numbers, underscores, and dots (for namespaced types)
            // 4. Not end with a dot
            // 5. Not contain invalid characters like spaces, hyphens, or special symbols
            const validIdentifierPattern =
                    /^[a-zA-Z_][a-zA-Z0-9_.]*[a-zA-Z0-9_]$|^[a-zA-Z_]$/;

            if (!validIdentifierPattern.test(type)) {
                throwUnrecognizedType(type);
            }

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
        parameters.fileWriter.writeLine(
            0,
            'use chrono::{ DateTime, TimeZone, Utc };'
        );
        parameters.fileWriter.writeLine(
            0,
            'use serde::{ Deserialize, Serialize, Deserializer, Serializer };'
        );
        parameters.fileWriter.writeLine(1, '');
        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_datetime_option<S>(datetime: &Option<chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, 'match datetime {');
        parameters.fileWriter.writeLine(2, 'Some(dt) => {');
        parameters.fileWriter.writeLine(
            3,
            'serialize_datetime(&dt, serializer)'
        );
        parameters.fileWriter.writeLine(2, '},');
        parameters.fileWriter.writeLine(2, '_ => unreachable!(),');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');
        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_datetime_option<\'de, D>(deserializer: D) -> Result<Option<chrono::DateTime<Utc>>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'match deserialize_datetime(deserializer) {'
        );
        parameters.fileWriter.writeLine(2, 'Ok(result)=>Ok(Some(result)),');
        parameters.fileWriter.writeLine(2, 'Err(error) => Err(error),');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');
        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_datetime<\'de, D>(deserializer: D) -> Result<chrono::DateTime<Utc>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let datetime_str = String::deserialize(deserializer)?;'
        );
        parameters.fileWriter.writeLine(
            1,
            'Utc.datetime_from_str(&datetime_str, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)'
        );
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(1, '');
        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_datetime<S>(datetime: &chrono::DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let datetime_str = datetime.format("%+").to_string();'
        );
        parameters.fileWriter.writeLine(
            1,
            'serializer.serialize_str(&datetime_str)'
        );
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        // Add DateTime array serializers
        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_datetime_array<S>(datetime_array: &Vec<chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let datetime_strings: Vec<String> = datetime_array'
        );
        parameters.fileWriter.writeLine(2, '.iter()');
        parameters.fileWriter.writeLine(
            2,
            '.map(|dt| dt.format("%+").to_string())'
        );
        parameters.fileWriter.writeLine(2, '.collect();');
        parameters.fileWriter.writeLine(
            1,
            'datetime_strings.serialize(serializer)'
        );
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_datetime_array<\'de, D>(deserializer: D) -> Result<Vec<chrono::DateTime<Utc>>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let datetime_strings = Vec::<String>::deserialize(deserializer)?;'
        );
        parameters.fileWriter.writeLine(1, 'datetime_strings');
        parameters.fileWriter.writeLine(2, '.iter()');
        parameters.fileWriter.writeLine(
            2,
            '.map(|s| Utc.datetime_from_str(s, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom))'
        );
        parameters.fileWriter.writeLine(2, '.collect()');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_datetime_array_option<S>(datetime_array: &Option<Vec<chrono::DateTime<Utc>>>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, 'match datetime_array {');
        parameters.fileWriter.writeLine(2, 'Some(arr) => {');
        parameters.fileWriter.writeLine(
            3,
            'serialize_datetime_array(&arr, serializer)'
        );
        parameters.fileWriter.writeLine(2, '},');
        parameters.fileWriter.writeLine(
            2,
            'None => serializer.serialize_none(),'
        );
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_datetime_array_option<\'de, D>(deserializer: D) -> Result<Option<Vec<chrono::DateTime<Utc>>>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'match Option::<Vec<String>>::deserialize(deserializer)? {'
        );
        parameters.fileWriter.writeLine(2, 'Some(datetime_strings) => {');
        parameters.fileWriter.writeLine(
            3,
            'let result: Result<Vec<_>, _> = datetime_strings'
        );
        parameters.fileWriter.writeLine(4, '.iter()');
        parameters.fileWriter.writeLine(
            4,
            '.map(|s| Utc.datetime_from_str(s, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom))'
        );
        parameters.fileWriter.writeLine(4, '.collect();');
        parameters.fileWriter.writeLine(3, 'result.map(Some)');
        parameters.fileWriter.writeLine(2, '},');
        parameters.fileWriter.writeLine(2, 'None => Ok(None),');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');

        // Add HashMap DateTime serializers
        parameters.fileWriter.writeLine(0, '');
        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_hashmap_datetime_key<S>(hashmap: &std::collections::HashMap<chrono::DateTime<Utc>, String>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let string_map: std::collections::HashMap<String, String> = hashmap'
        );
        parameters.fileWriter.writeLine(2, '.iter()');
        parameters.fileWriter.writeLine(
            2,
            '.map(|(k, v)| (k.format("%+").to_string(), v.clone()))'
        );
        parameters.fileWriter.writeLine(2, '.collect();');
        parameters.fileWriter.writeLine(1, 'string_map.serialize(serializer)');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_hashmap_datetime_key<\'de, D>(deserializer: D) -> Result<std::collections::HashMap<chrono::DateTime<Utc>, String>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let string_map = std::collections::HashMap::<String, String>::deserialize(deserializer)?;'
        );
        parameters.fileWriter.writeLine(
            1,
            'let mut result = std::collections::HashMap::new();'
        );
        parameters.fileWriter.writeLine(1, 'for (k, v) in string_map {');
        parameters.fileWriter.writeLine(
            2,
            'let datetime_key = Utc.datetime_from_str(&k, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)?;'
        );
        parameters.fileWriter.writeLine(2, 'result.insert(datetime_key, v);');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(1, 'Ok(result)');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_hashmap_datetime_value<S>(hashmap: &std::collections::HashMap<String, chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let string_map: std::collections::HashMap<String, String> = hashmap'
        );
        parameters.fileWriter.writeLine(2, '.iter()');
        parameters.fileWriter.writeLine(
            2,
            '.map(|(k, v)| (k.clone(), v.format("%+").to_string()))'
        );
        parameters.fileWriter.writeLine(2, '.collect();');
        parameters.fileWriter.writeLine(1, 'string_map.serialize(serializer)');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_hashmap_datetime_value<\'de, D>(deserializer: D) -> Result<std::collections::HashMap<String, chrono::DateTime<Utc>>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let string_map = std::collections::HashMap::<String, String>::deserialize(deserializer)?;'
        );
        parameters.fileWriter.writeLine(
            1,
            'let mut result = std::collections::HashMap::new();'
        );
        parameters.fileWriter.writeLine(1, 'for (k, v) in string_map {');
        parameters.fileWriter.writeLine(
            2,
            'let datetime_value = Utc.datetime_from_str(&v, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)?;'
        );
        parameters.fileWriter.writeLine(2, 'result.insert(k, datetime_value);');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(1, 'Ok(result)');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_hashmap_datetime_both<S>(hashmap: &std::collections::HashMap<chrono::DateTime<Utc>, chrono::DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let string_map: std::collections::HashMap<String, String> = hashmap'
        );
        parameters.fileWriter.writeLine(2, '.iter()');
        parameters.fileWriter.writeLine(
            2,
            '.map(|(k, v)| (k.format("%+").to_string(), v.format("%+").to_string()))'
        );
        parameters.fileWriter.writeLine(2, '.collect();');
        parameters.fileWriter.writeLine(1, 'string_map.serialize(serializer)');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_hashmap_datetime_both<\'de, D>(deserializer: D) -> Result<std::collections::HashMap<chrono::DateTime<Utc>, chrono::DateTime<Utc>>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'let string_map = std::collections::HashMap::<String, String>::deserialize(deserializer)?;'
        );
        parameters.fileWriter.writeLine(
            1,
            'let mut result = std::collections::HashMap::new();'
        );
        parameters.fileWriter.writeLine(1, 'for (k, v) in string_map {');
        parameters.fileWriter.writeLine(
            2,
            'let datetime_key = Utc.datetime_from_str(&k, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)?;'
        );
        parameters.fileWriter.writeLine(
            2,
            'let datetime_value = Utc.datetime_from_str(&v, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)?;'
        );
        parameters.fileWriter.writeLine(
            2,
            'result.insert(datetime_key, datetime_value);'
        );
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(1, 'Ok(result)');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        // Add optional HashMap DateTime serializers
        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_hashmap_datetime_key_option<S>(hashmap: &Option<std::collections::HashMap<chrono::DateTime<Utc>, String>>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, 'match hashmap {');
        parameters.fileWriter.writeLine(
            2,
            'Some(map) => serialize_hashmap_datetime_key(map, serializer),'
        );
        parameters.fileWriter.writeLine(
            2,
            'None => serializer.serialize_none(),'
        );
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_hashmap_datetime_key_option<\'de, D>(deserializer: D) -> Result<Option<std::collections::HashMap<chrono::DateTime<Utc>, String>>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'match Option::<std::collections::HashMap<String, String>>::deserialize(deserializer)? {'
        );
        parameters.fileWriter.writeLine(2, 'Some(string_map) => {');
        parameters.fileWriter.writeLine(
            3,
            'let mut result = std::collections::HashMap::new();'
        );
        parameters.fileWriter.writeLine(3, 'for (k, v) in string_map {');
        parameters.fileWriter.writeLine(
            4,
            'let datetime_key = Utc.datetime_from_str(&k, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)?;'
        );
        parameters.fileWriter.writeLine(4, 'result.insert(datetime_key, v);');
        parameters.fileWriter.writeLine(3, '}');
        parameters.fileWriter.writeLine(3, 'Ok(Some(result))');
        parameters.fileWriter.writeLine(2, '},');
        parameters.fileWriter.writeLine(2, 'None => Ok(None),');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_hashmap_datetime_value_option<S>(hashmap: &Option<std::collections::HashMap<String, chrono::DateTime<Utc>>>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, 'match hashmap {');
        parameters.fileWriter.writeLine(
            2,
            'Some(map) => serialize_hashmap_datetime_value(map, serializer),'
        );
        parameters.fileWriter.writeLine(
            2,
            'None => serializer.serialize_none(),'
        );
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_hashmap_datetime_value_option<\'de, D>(deserializer: D) -> Result<Option<std::collections::HashMap<String, chrono::DateTime<Utc>>>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'match Option::<std::collections::HashMap<String, String>>::deserialize(deserializer)? {'
        );
        parameters.fileWriter.writeLine(2, 'Some(string_map) => {');
        parameters.fileWriter.writeLine(
            3,
            'let mut result = std::collections::HashMap::new();'
        );
        parameters.fileWriter.writeLine(3, 'for (k, v) in string_map {');
        parameters.fileWriter.writeLine(
            4,
            'let datetime_value = Utc.datetime_from_str(&v, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)?;'
        );
        parameters.fileWriter.writeLine(4, 'result.insert(k, datetime_value);');
        parameters.fileWriter.writeLine(3, '}');
        parameters.fileWriter.writeLine(3, 'Ok(Some(result))');
        parameters.fileWriter.writeLine(2, '},');
        parameters.fileWriter.writeLine(2, 'None => Ok(None),');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn serialize_hashmap_datetime_both_option<S>(hashmap: &Option<std::collections::HashMap<chrono::DateTime<Utc>, chrono::DateTime<Utc>>>, serializer: S) -> Result<S::Ok, S::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'S: Serializer,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(1, 'match hashmap {');
        parameters.fileWriter.writeLine(
            2,
            'Some(map) => serialize_hashmap_datetime_both(map, serializer),'
        );
        parameters.fileWriter.writeLine(
            2,
            'None => serializer.serialize_none(),'
        );
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');
        parameters.fileWriter.writeLine(0, '');

        parameters.fileWriter.writeLine(
            0,
            'pub fn deserialize_hashmap_datetime_both_option<\'de, D>(deserializer: D) -> Result<Option<std::collections::HashMap<chrono::DateTime<Utc>, chrono::DateTime<Utc>>>, D::Error>'
        );
        parameters.fileWriter.writeLine(0, 'where');
        parameters.fileWriter.writeLine(1, 'D: Deserializer<\'de>,');
        parameters.fileWriter.writeLine(0, '{');
        parameters.fileWriter.writeLine(
            1,
            'match Option::<std::collections::HashMap<String, String>>::deserialize(deserializer)? {'
        );
        parameters.fileWriter.writeLine(2, 'Some(string_map) => {');
        parameters.fileWriter.writeLine(
            3,
            'let mut result = std::collections::HashMap::new();'
        );
        parameters.fileWriter.writeLine(3, 'for (k, v) in string_map {');
        parameters.fileWriter.writeLine(
            4,
            'let datetime_key = Utc.datetime_from_str(&k, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)?;'
        );
        parameters.fileWriter.writeLine(
            4,
            'let datetime_value = Utc.datetime_from_str(&v, "%Y-%m-%dT%H:%M:%S%.3f%Z").map_err(serde::de::Error::custom)?;'
        );
        parameters.fileWriter.writeLine(
            4,
            'result.insert(datetime_key, datetime_value);'
        );
        parameters.fileWriter.writeLine(3, '}');
        parameters.fileWriter.writeLine(3, 'Ok(Some(result))');
        parameters.fileWriter.writeLine(2, '},');
        parameters.fileWriter.writeLine(2, 'None => Ok(None),');
        parameters.fileWriter.writeLine(1, '}');
        parameters.fileWriter.writeLine(0, '}');

        parameters.fileWriter.closeFile();
    }
}

module.exports = RustVisitor;
