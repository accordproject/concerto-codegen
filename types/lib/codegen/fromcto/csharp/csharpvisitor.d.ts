export = CSharpVisitor;
/**
 * Convert the contents of a ModelManager to C# code. Set a
 * fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @private
 * @class
 * @memberof module:concerto-codegen
 */
declare class CSharpVisitor {
    /**
     * Visitor design pattern
     * @param {Object} thing - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     */
    visit(thing: any, parameters: any): any;
    /**
     * Visitor design pattern
     * @param {ModelManager} modelManager - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitModelManager;
    /**
     * Visitor design pattern
     * @param {ModelFile} modelFile - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitModelFile;
    /**
     * Visitor design pattern
     * @param {EnumDeclaration} enumDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitEnumDeclaration;
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitClassDeclaration;
    /**
     * Get dotnet namespace of a given type if it belongs to different namespace from associated concept/class
     * @param {string} type name of the super type
     * @param {ClassDeclaration} classDeclaration of the class
     * @param {Object} parameters - the parameter
     * @returns {string} the dotnet namespace of given type
     * @private
     */
    private getDotNetNamespaceOfType;
    /**
     * Visitor design pattern
     * @param {ScalarDeclaration} scalarDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitScalarDeclaration;
    /**
     * Build the DataAnnotations attribute lines for a scalar declaration's validator.
     * @param {ScalarDeclaration} scalarDeclaration - the scalar declaration
     * @returns {string[]} attribute lines, empty if no validator
     * @private
     */
    private buildScalarValidatorLines;
    /**
     * Visitor design pattern
     * @param {MapDeclaration} mapDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitMapDeclaration;
    /**
     * Resolve the C# key and value types for a MapDeclaration.
     * Handles primitives, scalars (via global using aliases and special UUID mapping),
     * and concept types.
     * @param {MapDeclaration} mapDeclaration - the map declaration to resolve types for
     * @param {Object} parameters - the visitor parameters (used for PascalCase conversion)
     * @returns {{ keyType: string, valueType: string }} the resolved C# key and value type strings
     * @private
     */
    private resolveMapTypes;
    /**
     * Resolve a single map key or value side to a C# type string.
     * @param {MapKeyType|MapValueType} side - key or value side of the map
     * @param {ModelFile} modelFile - the model file containing the map declaration
     * @param {Object} parameters - the visitor parameters
     * @returns {string} - the resolved type string for the map side
     * @private
     */
    private resolveMapSide;
    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitScalarField;
    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitField;
    /**
     * Write a field
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @param {string} [externalFieldType] - the external field type like UUID (optional)
     * @param {bool} [isOptional] - the bool value indicating if external field type like UUID is optional (optional)
     * @param {*} [scalarDefaultValue] - pre-resolved default value for scalar-typed fields (optional)
     * @return {Object} the result of visiting or null
     * @private
     */
    private writeField;
    /**
     * Determines if a property should emit the C# `required` modifier.
     * This centralizes required-emission decisions for fields and relationships.
     * @param {Object} parameters - visitor parameters
     * @param {Object} options - decision options
     * @param {string} [options.nullableType] - nullable marker (`?`) when present
     * @param {boolean} [options.hasDefault] - true when a default initializer is emitted
     * @param {boolean} [options.isArray] - true when property is an array type
     * @param {boolean} [options.isScalarAlias] - true for scalar alias value-type wrappers
     * @param {boolean} [options.isPrimitive] - true for Concerto primitive fields
     * @param {boolean} [options.isEnum] - true for enum fields
     * @param {string} [options.csharpType] - resolved C# type string
     * @returns {boolean} true if `required` should be emitted
     * @private
     */
    private shouldEmitRequired;
    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitEnumValueDeclaration;
    /**
     * Visitor design pattern
     * @param {Relationship} relationship - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitRelationship;
    /**
     * Determines whether a generated C# property type is a reference type.
     * @param {string} csharpType - resolved C# type name
     * @param {boolean} isArray - whether the property is an array
     * @returns {boolean} true if reference type
     * @private
     */
    private isCSharpReferenceType;
    /**
     * Format a Concerto default value as a C# literal suitable for a property initializer.
     * String values are quoted; scalar-typed fields wrap the literal in `new(...)`.
     * @param {*} value - the raw default value from getDefaultValue()
     * @param {string} concertoType - the underlying Concerto primitive type
     * @param {boolean} isScalar - true when the property type is a scalar struct
     * @param {Field} [field] - the field for context when handling enum defaults (optional)
     * @param {string} [resolvedFieldType] - resolved C# property type used for enum qualification
     * @returns {string|null} C# literal string, or null if no default
     * @private
     */
    private formatDefaultLiteral;
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
     * @param {string} [resolvedType] - pre-built C# type string; when provided, skips toCSharpType
     * @param {boolean} [emitRequired] - true to emit the C# `required` modifier
     * @returns {string} the property declaration
     */
    toCSharpProperty(access: string, parentName: string | undefined, propertyName: string, propertyType: string, array: string, nullableType: string, getset: string, parameters?: any, resolvedType?: string, emitRequired?: boolean): string;
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
    private toCSharpNamespace;
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
    private toCSharpIdentifier;
    /**
     * Converts a Concerto type to a CSharp type. Primitive types are converted
     * everything else is passed through unchanged.
     * @param {string} type  - the concerto type
     * @param {object} [parameters] true to enable pascal casing
     * @param {boolean} [parameters.pascalCase] true to enable pascal casing
     * @return {string} the corresponding type in CSharp
     * @private
     */
    private toCSharpType;
    /**
     * Get the .NET namespace for a given model file.
     * @private
     * @param {ModelFile} modelFile the model file
     * @param {object} [parameters] the parameters
     * @param {string} [parameters.namespacePrefix] the optional namespace prefix
     * @param {boolean} [parameters.pascalCase] the optional namespace prefix
     * @return {string} the .NET namespace for the model file
     */
    private getDotNetNamespace;
    /**
     * Get the field type for a given field.
     * @private
     * @param {Field} field - the object being visited
     * @return {string} the type for the field
     */
    private getFieldType;
    /**
     * Get the decorator value for a given object.
     * @private
     * @param {Object} thing - the object being visited
     * @param {string} decoratorName - name of the decorator
     * @returns {String} - value of decorator or null
     */
    private getDecoratorValue;
    /**
     * Apply proper casing to the string value
     * @param {string} string value
     * @param {boolean} isPascalCase flag to convert to pascalCase
     * @returns {String} properly cased string value
     * @private
     */
    private toCase;
}
