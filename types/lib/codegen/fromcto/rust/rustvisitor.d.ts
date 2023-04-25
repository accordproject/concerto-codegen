export = RustVisitor;
/**
 * Convert the contents of a ModelManager to Rust code.
 * All generated code is placed into the 'main' package. Set a
 * fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @private
 * @class
 * @memberof module:concerto-codegen
 */
declare class RustVisitor {
    /**
     * Visitor design pattern
     * @param {Object} thing - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @public
     */
    public visit(thing: any, parameters: any): any;
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
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    private visitField;
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
    private visitRelationshipDeclaration;
    /**
     * Converts a Concerto type to a Rust  type. Primitive types are converted
     * everything else is passed through unchanged.
     * @param {string} type  - the concerto type
     * @return {string} the corresponding type in Rust
     * @private
     */
    private toRustType;

    /**
     * Converts a Concerto field name to a Rust field name.
     * everything else is passed through unchanged.
     * @param {string} name  - the concerto field name
     * @return {string} the corresponding name in Rust
     * @private
     */
    private toValidRustName;

    /**
     * Generates utils file to handle date serialize and de-serialize.
     * everything else is passed through unchanged.
     * @param {Object} parameters  - the parameter
     * @private
     */
    private addUtilsModelFile;
}
