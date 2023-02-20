export = JavaVisitor;
/**
 * Convert the contents of a ModelManager to Java code.
 * Set a fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @private
 * @class
 * @memberof module:concerto-codegen
 */
declare class JavaVisitor {
    plugin: EmptyPlugin;
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
     * Write a Java class file header. The class file will be created in
     * a file/folder based on the namespace of the class.
     * @param {ClassDeclaration} clazz - the clazz being visited
     * @param {Object} parameters  - the parameter
     * @private
     */
    private startClassFile;
    /**
     * Close a Java class file
     * @param {ClassDeclaration} clazz - the clazz being visited
     * @param {Object} parameters  - the parameter
     * @private
     */
    private endClassFile;
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
    private visitRelationship;
    /**
     * Converts a Concerto type to a Java type. Primitive types are converted
     * everything else is passed through unchanged.
     * @param {string} type  - the concerto type
     * @return {string} the corresponding type in Java
     * @private
     */
    private toJavaType;
    /**
     * Capitalize the first letter of a string
     * @param {string} s - the input string
     * @return {string} the same string with first letter capitalized
     * @private
     */
    private capitalizeFirstLetter;
}
import EmptyPlugin = require("./emptyplugin");
