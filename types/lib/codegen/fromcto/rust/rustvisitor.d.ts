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
     * Helper method: Convert any string into a valid Rust name.
     * @param {string} input - the field name
     * @returns {string} - the validated rust name
     */
    toValidRustName(input: string): string;
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
     * @param {RelationshipDeclaration} relationshipDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitRelationshipDeclaration;
    /**
     * Visitor design pattern
     * @param {String} type - the data type type to be converted
     * @return {String} - the equivalent data type in rust
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
