export = PlantUMLVisitor;
/**
 * Convert the contents of a ModelManager
 * to PlantUML format files.
 * Set a fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @protected
 * @class
 * @memberof module:concerto-codegen
 */
declare class PlantUMLVisitor extends DiagramVisitor {
    /**
     * Visitor design pattern
     * @param {ModelManager} modelManager - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    protected visitModelManager(modelManager: ModelManager, parameters: any): void;
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    protected visitAssetDeclaration(classDeclaration: ClassDeclaration, parameters: any): void;
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    protected visitEnumDeclaration(classDeclaration: ClassDeclaration, parameters: any): void;
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    protected visitParticipantDeclaration(classDeclaration: ClassDeclaration, parameters: any): void;
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    protected visitTransactionDeclaration(classDeclaration: ClassDeclaration, parameters: any): void;
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    protected visitClassDeclaration(classDeclaration: ClassDeclaration, parameters: any): void;
    /**
     * Write a class declaration
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @param {string} [style] - the style for the prototype (optional)
     * @protected
     */
    protected writeDeclaration(classDeclaration: ClassDeclaration, parameters: any, style?: string): void;
    /**
     * Escape fully qualified names. We preserve the dots in the
     * package name, remove the '@' symbol because it is invalid
     * and remove the dots in the version (because otherwise packages get created).
     * We also replace all '-' characters with '_' because they are invalid in
     * PlantUML identifiers as '-' can appear in a semver string.
     * @param {String} input - the object being visited
     * @return {String} string  - the parameter
     * @protected
     */
    protected escapeString(input: string): string;
}
import DiagramVisitor = require("../../../common/diagramvisitor");
