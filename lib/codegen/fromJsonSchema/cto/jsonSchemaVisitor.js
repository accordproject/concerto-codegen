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

const Ajv2019 = require('ajv/dist/2019');
const Ajv2020 = require('ajv/dist/2020');
const draft6MetaSchema = require('ajv/dist/refs/json-schema-draft-06.json');
const draft7MetaSchema = require('ajv/dist/refs/json-schema-draft-07.json');
const addFormats = require('ajv-formats');
const getValue = require('get-value');
const { Identifiers } = require('@accordproject/concerto-util');

const {
    LocalReference,
    Reference,
    FixedElementsArrayProperty,
    ArrayProperty,
    Property,
    Properties,
    NonEnumDefinition,
    EnumDefinition,
    Definition,
    Definitions,
    JsonSchemaModel,
} = require('./jsonSchemaClasses');

/**
 * Convert the contents of a JSON Schema file to a Concerto JSON model.
 * Set the following parameters to use:
 * - metaModelNamespace: the current metamodel namespace.
 * - namespace: the desired namespace of the generated model.
 *
 * @private
 * @class
 */
class JsonSchemaVisitor {
    /**
     * Returns "true" if the property maps to the Concerto DateTime type.
     * @param {Object} property - a JSON Schema model property.
     *
     * @return {Boolean} "true" if the property maps to the Concerto DateTime
     * type.
     * @private
     */
    isDateTimeProperty(property) {
        return property.body.format &&
            (
                property.body.format === 'date-time' ||
                property.body.format === 'date'
            );
    }
    /**
     * Returns "true" if the object contains an "anyOf" or a "oneOf" element.
     * @param {Object} property - a JSON Schema model property.
     *
     * @return {Boolean} "true" if the object contains an "anyOf" or a
     * "oneOf" element.
     * @private
     */
    doesObjectContainAlternation(property) {
        return !!(property.body?.anyOf || property.body?.oneOf);
    }
    /**
     * Process a JSON Schema alternation object containing "anyOf" or a "oneOf"
     * elements. Currently the first element of the alternation is returned and
     * @param {Object} alternation - an object containing a JSON Schema
     * alternation.
     *
     * @return {Object} a processed JSON Schema alternation object.
     * @private
     */
    processAlternation(alternation) {
        // eslint-disable-next-line no-console
        console.warn(
            `Keyword '${
                alternation.body.anyOf ? 'anyOf' : 'oneOf'
            }' in definition '${
                alternation.path[alternation.path.length - 1]
            }' is not fully supported. Defaulting to first alternative.`
        );

        return (
            alternation.body.anyOf ||
            alternation.body.oneOf
        )[0];
    }
    /**
     * Flatten a property containing an "anyOf" or a "oneOf" element.
     * @param {Object} property - a JSON Schema model property.
     *
     * @return {Object} a JSON Schema model property with the "anyOf" or
     * "oneOf" elements resolved.
     * @private
     */
    flattenAlternationInProperty(property) {
        const processedAlternation = this.processAlternation(property);

        const propertyWithoutAlternations = Object.fromEntries(
            Object.entries(property.body)
                .filter(
                    property => ![
                        'anyOf', 'oneOf'
                    ].includes(property[0])
                )
        );

        return {
            ...propertyWithoutAlternations,
            ...processedAlternation,
        };
    }
    /**
     * Returns "true" if the property contains a JSON Schema model reference.
     * @param {Object} property - a JSON Schema model property.
     *
     * @return {Boolean} "true" if the property contains a JSON Schema model
     * reference.
     * @private
     */
    isReference(property) {
        return typeof property.body.$ref === 'string';
    }
    /**
     * Returns "true" if the string is a JSON Schema model local
     * reference one.
     * @param {String} potentialReferenceString - a JSON Schema model local
     * reference string.
     *
     * @return {Boolean} "true" if the string is a JSON Schema model local
     * reference one.
     * @private
     */
    isStringLocalReference(potentialReferenceString) {
        return potentialReferenceString.charAt(0) === '#';
    }
    /**
     * Parses a local reference string.
     * @param {Object} referenceString - a JSON Schema model local reference
     * string.
     *
     * @return {String[]} the path to the reffered object.
     * @private
     */
    parseLocalReferenceString(referenceString) {
        return referenceString
            .slice(1, referenceString.length)
            .split('/')
            .filter(pathSegment => pathSegment.length > 0)
            .map(
                pathSegment => decodeURI(pathSegment).replace(/%2C/ig, ',')
            );
    }
    /**
     * Parse a $id URL to use it as a namespace and root type.
     * @param {string} id - the $id value from a JSON schema.
     *
     * @returns {object} A namespace and type pair.
     * @private
     */
    parseIdUri(id) {
        if (!id) { return; }

        // TODO (MCR) - support non-URL URI $id values
        // https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-9.2
        const url = new URL(id);
        let namespace = url.hostname.split('.').reverse().join('.');
        const path = url.pathname.split('/');
        const type = Identifiers.normalizeIdentifier(
            // @ts-ignore
            path.pop()
                .replace(/\.json$/, '') // Convention is to add .schema.json to $id
                .replace(/\.schema$/, '')
        );

        namespace += path.length > 0 ? path.join('.') : '';

        return { namespace, type };
    }
    /**
     * Infers a primitive Concerto type from a JSON Schema model property.
     * @param {Object} property - a JSON Schema model property.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the primitive Concerto type inferred from the JSON
     * Schema model property.
     * @private
     */
    inferPrimitiveConcertoType(property, parameters) {
        if (property.body.type && typeof property.body.type === 'string') {
            switch (property.body.type) {
            case 'string':
                if (
                    this.isDateTimeProperty(property)
                ) {
                    return `${parameters.metaModelNamespace}.DateTimeProperty`;
                }

                if (property.body.format) {
                    // eslint-disable-next-line no-console
                    console.warn(
                        `Format '${property.body.format}' in '${
                            property.path[property.path.length - 1]
                        }' is not supported. It has been ignored.`
                    );
                }

                return `${parameters.metaModelNamespace}.StringProperty`;
            case 'boolean':
                return `${parameters.metaModelNamespace}.BooleanProperty`;
            case 'number':
                return `${parameters.metaModelNamespace}.DoubleProperty`;
            case 'integer':
                // Could also be Long?
                return `${parameters.metaModelNamespace}.IntegerProperty`;
            default:
            }
        }

        throw new Error(
            `Type keyword '${property.body.type}' in '${
                property.path[property.path.length - 1]
            }' is not supported.`
        );
    }
    /**
     * Normalizes a name by replacing forbidden characters with "$_".
     * @param {String} name - a name.
     *
     * @return {Object} a normalized name.
     * @private
     */
    normalizeName(name) {
        return typeof name === 'string'
            ? Identifiers.normalizeIdentifier(
                name.replace(/\/|{|}/ig, '$_')
            )
            : undefined;
    }
    /**
     * Infers a Concerto concept name from a JSON Schema model inline property
     * path.
     * @param {Object} propertyPath - a JSON Schema model property path.
     *
     * @return {Object} the Concerto concept name inferred from the JSON Schema
     * model inline object property path.
     * @private
     */
    inferInlineObjectConceptName(propertyPath) {
        return propertyPath.join('$_');
    }
    /**
     * Infers a type-specific validator, appropriate to a Concerto primitive.
     * @param {Object} property - a JSON Schema model property.
     * @param {Object} metaModelNamespace - the Concerto meta model namespace.
     *
     * @return {Object} the Concerto field validator inferred from the JSON
     * Schema model property.
     * @private
     */
    inferTypeSpecificValidator(property, metaModelNamespace) {
        if (
            (
                property.body.type === 'integer' ||
                property.body.type === 'number'
            ) &&
            (property.body.minimum || property.body.exclusiveMaximum)
        ) {
            return {
                validator: {
                    $class: `${metaModelNamespace}.${
                        property.body.type === 'number'
                            ? 'DoubleDomainValidator'
                            : 'IntegerDomainValidator'
                    }`,
                    // Note: Concerto does not provide syntax for exclusive minimum or inclusive maximum
                    // https://json-schema.org/understanding-json-schema/reference/numeric.html#range
                    ...(
                        property.body.minimum
                            ? { lower: property.body.minimum }
                            : {}
                    ),
                    ...(
                        property.body.exclusiveMaximum
                            ? { upper: property.body.exclusiveMaximum }
                            : {}
                    ),
                }
            };
        }

        if (
            property.body.type === 'string' &&
            !this.isDateTimeProperty(property) &&
            property.body.pattern
        ) {
            return {
                validator: {
                    $class: `${metaModelNamespace}.StringRegexValidator`,
                    pattern: property.body.pattern,
                    flags: '',
                }
            };
        }

        return {};
    }
    /**
     * Infers a type-specific property, mapping to a Concerto primitive.
     * @param {Object} property - a JSON Schema model property.
     * @param {Object} metaModelNamespace - the Concerto meta model namespace.
     *
     * @return {Object} the Concerto field inferred from the JSON Schema model
     * property.
     * @private
     */
    inferTypeSpecificProperties(property, metaModelNamespace) {
        if (
            ['boolean', 'integer', 'number', 'string']
                .includes(property.body.type)
        ) {
            return {
                // Warning: The semantics of this default property differs between JSON Schema and Concerto
                // JSON Schema does not fill in missing values during validation, whereas Concerto does
                // https://json-schema.org/understanding-json-schema/reference/generic.html#id2
                ...(
                    ['boolean', 'number', 'string']
                        .includes(typeof property.body.default) &&
                        { defaultValue: property.body.default }
                ),
                ...this.inferTypeSpecificValidator(property, metaModelNamespace)
            };
        }
    }
    /**
     * Deduplicate a list of declarations by name. Duplicated declarations often
     * occur when we're traversing through multiple definitions that are
     * ultimately referencing the same object.
     * @param {Array<Object>} declarations - list of declarations with possible
     * duplicates.
     *
     * @return {Array<Object>} list of declarations without duplicates.
     * @private
     */
    deduplicateDeclarations(declarations) {
        const uniqueDeclarationsNames = [
            ...new Set(
                declarations.map(
                    declaration => declaration.name
                )
            )
        ];

        return uniqueDeclarationsNames.map(
            uniqueDeclarationsName => declarations.find(
                declaration => declaration.name === uniqueDeclarationsName
            )
        );
    }
    /**
     * Returns "true" if the JSON Schema object is freeform, i.e.
     * could contain data in any shape.
     * @param {Object} object - a JSON Schema model object.
     *
     * @return {Boolean} "true" if the object is freeform.
     * @private
     */
    isObjectFreeform(object) {
        return (
            // Freeform objects can be identified by either having
            // empty object as their body
            JSON.stringify(object) === JSON.stringify({}) ||
            (
                // or by being of type object
                object.type === 'object' &&
                (
                    // with a valid additionalProperties field
                    typeof object.additionalProperties === 'object' ||
                    object.additionalProperties === true ||
                    // or not containing properties.
                    typeof object.properties !== 'object'
                )
            )
        );
    }
    /**
     * Returns "true" if the property is an array one.
     * @param {Object} property - a JSON Schema object property.
     *
     * @return {Boolean} "true" if the object property is an array.
     * @private
     */
    isArrayProperty(property) {
        return property.body.type === 'array' &&
            typeof property.body.items === 'object';
    }
    /**
     * Returns "true" if the JSON Schema propetry is a fixed element array one
     * i.e. it has a list of predefined elements, without room for more.
     * @param {Object} property - a JSON Schema object property.
     *
     * @return {Boolean} "true" if the object property is a fixed element
     * array one.
     * @private
     */
    isFixedElementsArrayProperty(property) {
        return this.isArrayProperty(property) &&
            Array.isArray(property.body.items) &&
            (
                // The requirement for minimum and maximum elements of the array
                // to be equal to or less to the defined ones, satisfies the
                // requirement to have an array solely comprising of elements
                // with predefined hapes.
                property.body.minItems <= property.body.items.length &&
                property.body.maxItems <= property.body.items.length
            );
    }
    /**
     * Local reference property visitor.
     * @param {Object} reference - a JSON Schema model local reference property.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto fields and declarations inferred from
     * the JSON Schema model local reference property. A property can spawn
     * declarations as well, if it contains inline objects.
     * @private
     */
    visitLocalReference(reference, parameters) {
        const traversedReferences = parameters.traversedReferences ?? [];
        const pathToDefinition = this.parseLocalReferenceString(reference.body);

        if (!traversedReferences.includes(reference.body)) { // Break out of circular refences.
            const pathToDefinitions = parameters.pathToDefinitions ||
                ['definitions'];

            if (pathToDefinition.length === 0) {
                return new Definition(
                    parameters.jsonSchemaModel, ['Root']
                );
            }

            if (
                pathToDefinition.slice(0, -1).toString() ===
                pathToDefinitions.toString()
            ) {
                const definitionName = pathToDefinition[
                    pathToDefinition.length - 1
                ];
                const definition = getValue(
                    parameters.jsonSchemaModel,
                    [
                        ...(
                            parameters.pathToDefinitions ||
                                ['definitions']
                        ),
                        definitionName
                    ],
                );

                return (
                    new Definition(definition, pathToDefinition)
                ).accept(
                    this, {
                        ...parameters, traversedReferences: [
                            ...traversedReferences,
                            reference.body
                        ]
                    }
                );
            }
        }

        return { name: this.inferInlineObjectConceptName(pathToDefinition) };
    }
    /**
     * Reference property visitor.
     * @param {Object} reference - a JSON Schema model reference property.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto fields and declarations inferred from
     * the JSON Schema model reference property. A property can spawn
     * declarations as well, if it contains inline objects.
     * @private
     */
    visitReference(reference, parameters) {
        if (this.isStringLocalReference(reference.body)) {
            return (new LocalReference(reference.body, reference.path))
                .accept(this, parameters);
        }
        // TODO: Handle remote reference.
        // TODO: Handle URL reference.
    }
    /**
     * Fixed elements array property visitor.
     * @param {Object} arrayProperty - a JSON Schema model array property
     *  containing fixed elements.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} a Concerto definition with the fixed array elements
     * as the fields.
     * @private
     */
    visitFixedElementsArrayProperty(arrayProperty, parameters) {
        // Turn the fixed elements array into a Concerto concept.
        const fixedElementsArrayDerivedObject = {
            type: 'object',
            properties: Object.fromEntries(
                arrayProperty.body.items
                    // Limit fixed properties to maxItems.
                    .slice(0, arrayProperty.body.maxItems)
                    // Translate array elements of fixed properties to
                    // Concerto fields in a definition, named after the
                    // index of the element in the array.
                    .map(
                        (fixedArrayElement, index) => ([
                            `${index}`,
                            fixedArrayElement
                        ])
                    )
            ),
            required: arrayProperty.body.items
                // Limit required fixed properties to minItems.
                .slice(0, arrayProperty.body.minItems)
                // Enumerate the required array properties by their
                // name, derived from the array index.
                .map((fixedArrayElement, index) => `${index}`)
        };

        return (
            new Property(
                fixedElementsArrayDerivedObject, arrayProperty.path
            )
        ).accept(this, parameters);
    }
    /**
     * Array property visitor.
     * @param {Object} arrayProperty - a JSON Schema model array property.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto fields and declarations inferred from
     * the JSON Schema model array property. A property can spawn declarations
     * as well, if it contains inline objects.
     * @private
     */
    visitArrayProperty(arrayProperty, parameters) {
        if (Array.isArray(arrayProperty.body.items)) {
            const propertyName = arrayProperty.path[
                arrayProperty.path.length - 1
            ];
            if (this.isFixedElementsArrayProperty(arrayProperty)) {
                console.warn(
                    `"${propertyName}" in an array containing a set of fixed elements. Converting to a Concerto concept containing the fixed array elements as fields.`
                );

                return (new FixedElementsArrayProperty(
                    arrayProperty.body, arrayProperty.path
                )).accept(this, parameters);
            }

            // When we don't have a fixed elements array property i.e. we have
            // a fixed elements array, allowing for extra unknown properties
            // we'd like to convert the property to a freeform JSON stringified
            // one. This stems from Concerto not being to describe an array
            // with a number of fixed elements and addtitional unknown ones.
            console.warn(
                `"${propertyName}" is an array containing a mix of predefined and unknown elements. Converting to a stringified JSON string.`
            );
            return (new Property({ type: 'object'}, arrayProperty.path))
                .accept(this, parameters);
        }

        parameters.assignableFields = {
            ...parameters.assignableFields,
            isArray: true
        };

        return (new Property(arrayProperty.body.items, arrayProperty.path))
            .accept(this, parameters);
    }
    /**
     * Property visitor.
     * @param {Object} property - a JSON Schema model property.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto fields and declarations inferred from
     * the JSON Schema model property. A property can spawn declarations as
     * well, if it contains inline objects.
     * @private
     */
    visitProperty(property, parameters) {
        const propertyName = property.path[
            property.path.length - 1
        ];

        const assignableFields = parameters.assignableFields;
        delete parameters.assignableFields;
        const propertyProperties = {
            name: propertyName,
            isArray: false,
            isOptional: !parameters.required
                ?.includes(propertyName),
            ...assignableFields
        };

        // Handle reserved properties.
        if (['$identifier', '$class', '$timestamp'].includes(propertyName)) {
            return;
        }

        // Handle an enum.
        if (
            typeof property.body.enum === 'object' &&
            typeof property.body.enum.length === 'number'
        ) {
            const inlineObjectDerivedConceptName = this.normalizeName(
                this.inferInlineObjectConceptName(property.path)
            );

            const properties = property.body.enum
                .filter(enumName => enumName)
                .map(
                    enumName => ({
                        $class: `${parameters.metaModelNamespace}.EnumProperty`,
                        name: Identifiers.normalizeIdentifier(
                            enumName.toString()
                        ),
                    })
                );

            const enumDeclaration = {
                $class: `${parameters.metaModelNamespace}.EnumDeclaration`,
                name: inlineObjectDerivedConceptName,
                properties,
            };

            return [
                {
                    $class: `${parameters.metaModelNamespace}.ObjectProperty`,
                    ...propertyProperties,
                    type: {
                        $class: `${parameters.metaModelNamespace}.TypeIdentifier`,
                        name: inlineObjectDerivedConceptName,
                    }
                },
                enumDeclaration,
            ];
        }

        // Handle anyOf or oneOf.
        if (this.doesObjectContainAlternation(property)) {
            return (
                new Property(
                    this.flattenAlternationInProperty(
                        property
                    ),
                    property.path
                )
            ).accept(this, parameters);
        }

        // Handle a reference.
        if (this.isReference(property)) {
            const referenced = (
                new Reference(property.body.$ref, property.path)
            ).accept(this, parameters);

            if (referenced.isProperty) {
                // If the reference is not meant to spawn a Concerto concept,
                // then preserve its name from the property definition.
                const parametersWithPropertyName = {
                    ...parameters,
                    assignableFields: {
                        ...parameters.assignableFields,
                        name: propertyName
                    }
                };

                return referenced.accept(this, parametersWithPropertyName);
            }

            return [{
                $class: `${parameters.metaModelNamespace}.ObjectProperty`,
                ...propertyProperties,
                type: {
                    $class: `${parameters.metaModelNamespace}.TypeIdentifier`,
                    name: typeof referenced.path === 'object' &&
                        referenced.path.length === 1 &&
                        referenced.path[0] === 'Root'
                        ? 'Root'
                        : referenced.name
                            ? this.normalizeName(referenced.name)
                            : this.normalizeName(referenced[0].name),
                }
            }];
        }

        // Handle an array.
        if (this.isArrayProperty(property)) {
            return (new ArrayProperty(property.body, property.path))
                .accept(this, { ...parameters, assignableFields });
        }

        // Handle a union type.
        if (Array.isArray(property.body.type)) {
            console.warn(
                `"${propertyName}" is union type property. This feature is not supported by Concerto. Defaulting to a "string" type.`
            );

            // If the property is a union type one, this is indicated using the
            // StringifiedUnionType decorator, containing the union types as a
            // string argument.
            const parametersWithDecorator = {
                ...parameters,
                assignableFields: {
                    ...parameters.assignableFields,
                    decorators: [
                        {
                            $class: 'concerto.metamodel@1.0.0.Decorator',
                            name: 'StringifiedUnionType',
                            arguments: [
                                {
                                    $class: 'concerto.metamodel@1.0.0.DecoratorString',
                                    value: `[${property.body.type.toString()}]`
                                }
                            ]
                        }
                    ]
                }
            };

            return (
                new Property(
                    // If the property is a union type one, then it defaults to
                    // a string typed one.
                    { ...property.body, type: 'string' }, property.path
                )
            ).accept(this, parametersWithDecorator);
        }

        // Handle an undefined type.
        if (
            this.isObjectFreeform(property.body) ||
            property.body.isFreeformObjectDefinition
        ) {
            return {
                $class: `${parameters.metaModelNamespace}.StringProperty`,
                ...propertyProperties,
                decorators: [
                    {
                        $class: 'concerto.metamodel@1.0.0.Decorator',
                        name: 'StringifiedJson',
                    }
                ]
            };
        }

        // Handle an inline object.
        if (
            property.body.type === 'object' &&
            typeof property.body.properties === 'object'
        ) {
            const inlineObjectDerivedConceptName = this.inferInlineObjectConceptName(property.path);

            const inlineObjectDerivedConcept = (
                new Definition(
                    property.body,
                    [inlineObjectDerivedConceptName],
                )
            ).accept(this, parameters);

            return [
                {
                    $class: `${parameters.metaModelNamespace}.ObjectProperty`,
                    ...propertyProperties,
                    type: {
                        $class: `${parameters.metaModelNamespace}.TypeIdentifier`,
                        name: this.normalizeName(
                            inlineObjectDerivedConceptName
                        ),
                    }
                },
                inlineObjectDerivedConcept
            ];
        }

        // Handle primitive types.
        return {
            $class: this.inferPrimitiveConcertoType(
                property, parameters
            ),
            ...propertyProperties,
            ...this.inferTypeSpecificProperties(
                property, parameters.metaModelNamespace
            )
        };
    }
    /**
     * Property visitor.
     * @param {Object} properties - the JSON Schema model properties.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto fields and declarations inferred from
     * the JSON Schema model properties. A property can spawn declarations as
     * well, if it contains inline objects.
     * @private
     */
    visitProperties(properties, parameters) {
        const propertyClasses = Object.entries(properties.body)
            .map(
                ([propertyName, propertyBody]) => new Property(
                    propertyBody,
                    [...properties.path, propertyName]
                )
            );

        return propertyClasses
            .map(
                propertyClass => propertyClass.accept(this, parameters)
            )
            .flat(Infinity)
            .filter(field => field);
    }
    /**
     * Non-enum definition visitor.
     * @param {Object} nonEnumDefinition - a JSON Schema model non-enum
     * definition.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto declaration or declarations inferred from
     * the JSON Schema model non-enum definition. A definition can spawn more
     * than one Concerto declarations if it contains inline objects.
     * @private
     */
    visitNonEnumDefinition(nonEnumDefinition, parameters) {
        const nameOfDefinition = this.normalizeName(
            nonEnumDefinition.path[
                nonEnumDefinition.path.length - 1
            ]
        );

        // Handle a freeform definition body.
        if (this.isObjectFreeform(nonEnumDefinition.body)) {
            return {
                $class: `${parameters.metaModelNamespace}.StringScalar`,
                name: nameOfDefinition,
                decorators: [
                    {
                        $class: 'concerto.metamodel@1.0.0.Decorator',
                        name: 'StringifiedJson',
                    }
                ]
            };
        }

        // Handle an array definition body.
        if (nonEnumDefinition.body?.type === 'array') {
            return new Property(
                nonEnumDefinition.body, nonEnumDefinition.path
            );
        }

        // Handle an definition body containing an alternation.
        if (this.doesObjectContainAlternation(nonEnumDefinition)) {
            return new Definition(
                this.processAlternation(
                    nonEnumDefinition
                ),
                nonEnumDefinition.path
            ).accept(this, parameters);
        }

        // Handle an definition body containing a reference.
        if (this.isReference(nonEnumDefinition)) {
            return (
                new Reference(
                    nonEnumDefinition.body.$ref, nonEnumDefinition.path
                )
            ).accept(this, parameters);
        }

        if (
            nonEnumDefinition?.path.length !== 1 &&
            nonEnumDefinition?.path[0] !== 'Root' &&
            !['object'].includes(nonEnumDefinition.body.type) &&
            !(
                typeof nonEnumDefinition.body.type === 'undefined' &&
                typeof nonEnumDefinition.body.anyOf === 'object'
            )
        ) {
            throw new Error(
                `Type keyword '${nonEnumDefinition.body.type}' in definition '${nameOfDefinition}' is not supported.`
            );
        }

        const conceptWithoutProperties = {
            $class: `${parameters.metaModelNamespace}.ConceptDeclaration`,
            name: nameOfDefinition,
            isAbstract: false,
        };

        if (
            nonEnumDefinition.body.properties !== undefined &&
            nonEnumDefinition.body.properties !== null
        ) {
            const propertiesAndInlineObjectDerived = (
                new Properties(
                    nonEnumDefinition.body.properties,
                    [...nonEnumDefinition.path, 'properties']
                )
            ).accept(this, {
                ...parameters,
                required: nonEnumDefinition.body.required,
            });

            const inlineObjectDerived = [
                `${parameters.metaModelNamespace}.ConceptDeclaration`,
                `${parameters.metaModelNamespace}.EnumDeclaration`,
            ];

            const properties = propertiesAndInlineObjectDerived
                .filter(
                    propertyOrInlineDerivedConcept =>
                        !inlineObjectDerived
                            .includes(propertyOrInlineDerivedConcept.$class)
                );

            const inlineObjectConcepts = propertiesAndInlineObjectDerived
                .filter(
                    propertyOrInlineDerivedConcept =>
                        inlineObjectDerived
                            .includes(propertyOrInlineDerivedConcept.$class)
                );

            const conceptDeclaration = {
                ...conceptWithoutProperties,
                properties
            };

            if (inlineObjectConcepts.length > 0) {
                return [conceptDeclaration, ...inlineObjectConcepts];
            }

            return conceptDeclaration;
        }

        return;
    }
    /**
     * Enum definition visitor.
     * @param {Object} enumDefinition - a JSON Schema model enum definition.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto enum declaration inferred from
     * the JSON Schema model enum definition.
     * @private
     */
    visitEnumDefinition(enumDefinition, parameters) {
        const properties = enumDefinition.body.enum.map(
            enumName => ({
                $class: `${parameters.metaModelNamespace}.EnumProperty`,
                name: enumName,
            })
        );

        const enumDeclaration = {
            $class: `${parameters.metaModelNamespace}.EnumDeclaration`,
            name: this.normalizeName(
                enumDefinition.path[enumDefinition.path.length - 1]
            ),
            properties,
        };

        return enumDeclaration;
    }
    /**
     * Definition visitor.
     * @param {Object} definition - a JSON Schema model definition.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto declaration or declarations inferred from
     * the JSON Schema model definition. A definition can spawn more than one
     * Concerto declarations if it contains inline objects.
     * @private
     */
    visitDefinition(definition, parameters) {
        if (typeof definition.body?.enum === 'object') {
            return (
                new EnumDefinition(definition.body, definition.path)
            ).accept(this, parameters);
        } else {
            return (
                new NonEnumDefinition(definition.body, definition.path)
            ).accept(this, parameters);
        }
    }
    /**
     * Definitions visitor.
     * @param {Object} definitions - the JSON Schema model definitions.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto declarations inferred from the JSON Schema
     * model definitions.
     */
    visitDefinitions(definitions, parameters) {
        const definitionClasses = Object.entries(definitions.body)
            .map(
                ([definitionName, definitionBody]) => new Definition(
                    definitionBody,
                    [...definitions.path, definitionName]
                )
            );

        return definitionClasses.map(
            definitionClass => definitionClass.accept(this, parameters)
        ).flat();
    }
    /**
     * JSON Schema model visitor.
     * @param {Object} jsonSchemaModel - the JSON Schema model.
     * @param {Object} parameters - the visitor parameters.
     *
     * @return {Object} the Concerto JSON model.
     * @private
     */
    visitJsonSchemaModel(jsonSchemaModel, parameters) {
        const schemaVersion = jsonSchemaModel.body.$schema;

        // @ts-ignore
        let ajv = new Ajv2019({ strict: false })
            .addMetaSchema(draft6MetaSchema)
            .addMetaSchema(draft7MetaSchema);

        if (
            schemaVersion &&
            schemaVersion.startsWith(
                'https://json-schema.org/draft/2020-12/schema'
            )
        ) {
            // @ts-ignore
            ajv = new Ajv2020({ strict: false });
        }

        const rootName = this.parseIdUri(jsonSchemaModel.body.$id)?.type ||
            jsonSchemaModel.body.title ||
            'Root';

        ajv.addSchema(jsonSchemaModel.body, rootName);
        // @ts-ignore
        addFormats(ajv);

        // Will throw an error for bad schemas
        ajv.compile(jsonSchemaModel.body);

        const pathToDefinitions = parameters.pathToDefinitions || (
            typeof jsonSchemaModel.body.definitions === 'object'
                ? ['definitions']
                : typeof jsonSchemaModel.body.$defs === 'object'
                    ? ['$defs']
                    : typeof jsonSchemaModel.body.schema?.components?.schemas === 'object'
                        ? ['schema', 'components', 'schemas']
                        : []
        );

        const definitions = getValue(
            jsonSchemaModel.body,
            pathToDefinitions,
        );

        const parametersWithJsonSchemaModel = {
            ...parameters, jsonSchemaModel: jsonSchemaModel.body
        };

        const declarationsFromRootDefinitions = new Definition(
            jsonSchemaModel.body,
            [rootName]
        ).accept(
            this, parametersWithJsonSchemaModel
        ) ?? [];

        const declarationsFromDefinitions = definitions
            ? new Definitions(
                definitions,
                pathToDefinitions,
            ).accept(
                this, parametersWithJsonSchemaModel
            )
            : [];

        const declarations = [
            ...declarationsFromRootDefinitions.length
                ? declarationsFromRootDefinitions
                : [declarationsFromRootDefinitions],
            ...declarationsFromDefinitions,
        ].filter(declaration => typeof declaration?.$class === 'string');

        const convertedModel = {
            $class: `${parameters.metaModelNamespace}.Model`,
            decorators: [],
            namespace: parameters.namespace,
            imports: [],
            declarations: this.deduplicateDeclarations(declarations),
        };

        const concertoJsonModel = {
            $class: `${parameters.metaModelNamespace}.Models`,
            models: [
                convertedModel
            ],
        };

        return concertoJsonModel;
    }
    /**
     * Visitor dispatch i.e. main entry point to this visitor.
     * @param {Object} thing - the visited entity.
     * @param {Object} parameters - the visitor parameters.
     * Set the following parameters to use:
     * - metaModelNamespace: the current metamodel namespace.
     * - namespace: the desired namespace of the generated model.
     *
     * @return {Object} the result of visiting or undefined.
     * @public
     */
    visit(thing, parameters) {
        if (thing.isLocalReference) {
            return this.visitLocalReference(thing, parameters);
        }
        if (thing.isReference) {
            return this.visitReference(thing, parameters);
        }
        if (thing.isFixedElementsArrayProperty) {
            return this.visitFixedElementsArrayProperty(thing, parameters);
        }
        if (thing.isArrayProperty) {
            return this.visitArrayProperty(thing, parameters);
        }
        if (thing.isProperty) {
            return this.visitProperty(thing, parameters);
        }
        if (thing.isProperties) {
            return this.visitProperties(thing, parameters);
        }
        if (thing.isNonEnumDefinition) {
            return this.visitNonEnumDefinition(thing, parameters);
        }
        if (thing.isEnumDefinition) {
            return this.visitEnumDefinition(thing, parameters);
        }
        if (thing.isDefinition) {
            return this.visitDefinition(thing, parameters);
        }
        if (thing.isDefinitions) {
            return this.visitDefinitions(thing, parameters);
        }
        if (thing.isJsonSchemaModel) {
            return this.visitJsonSchemaModel(thing, parameters);
        }
    }
    /**
     * Create a JSON Schema model class, used to start the inference into
     * Concerto JSON.
     * @param {Object} jsonSchemaModel - the JSON Schema Model.
     *
     * @return {Object} the result of visiting or undefined.
     * @public
     */
    static parse(jsonSchemaModel) {
        return new JsonSchemaModel(jsonSchemaModel);
    }
}

module.exports = JsonSchemaVisitor;


