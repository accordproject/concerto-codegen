export = RustVisitor;
/**
 * Convert the contents of a ModelManager to Rust code.
 * All generated modules are referenced from the 'lib' package
 * with all generated modules in the same file system folder.
 *
 * @private
 * @class
 * @memberof module:concerto-codegen
 */
declare class RustVisitor {
    /**
     * Convert a string to a valid Rust identifier name in snake_case
     * @param {String} input - the input string to convert
     * @return {String} - a valid Rust identifier in snake_case
     * @private
     */
    private toValidRustName;
    /**
     * Convert a string to snake_case with proper handling of acronyms and consecutive uppercase letters
     * @param {String} input - the input string
     * @return {String} - the snake_case version
     * @private
     */
    private toSnakeCase;
    /**
     * Visitor design pattern
     * @param {Object} thing - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @public
     */
    public visit(thing: any, parameters: any): any;
    /**
     * Visitor design pattern
     * @param {ModelManager} modelManager - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitModelManager;
    /**
     * Visitor design pattern
     * @param {ModelFile} modelFile - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitModelFile;
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitClassDeclaration;
    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitField;
    /**
     * @param {String} type - the type to be wrapped as option
     * @return {String} - the wrapped type
     * @private
     */
    private wrapAsOption;
    /**
     * Visitor design pattern
     * @param {EnumDeclaration} enumDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitEnumDeclaration;
    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitEnumValueDeclaration;
    /**
     * Visitor design pattern
     * @param {MapDeclaration} mapDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitMapDeclaration;
    /**
     * Visitor design pattern
     * @param {RelationshipDeclaration} relationshipDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitRelationshipDeclaration;
    /**
     * Converts a Concerto type to a Rust type. Primitive types are converted
     * everything else is passed through unchanged after validation.
     * @param {string} type - the concerto type
     * @param {boolean} useUnion - whether to use a union type (append 'Union' suffix)
     * @return {string} the corresponding type in Rust
     * @private
     */
    private toRustType;
    /**
     * Visitor design pattern
     * @param {String} type - the data type type to be checked
     * @return {Boolean} the result as boolean
     * @private
     */
    private isDateField;
    /**
     * Visitor design pattern
     * @param {Object} parameters - the parameter
     * @private
     */
    private addUtilsModelFile;
}
