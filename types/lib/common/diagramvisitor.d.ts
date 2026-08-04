export = DiagramVisitor;
/**
 * Convert the contents of a ModelManager a diagram format (such as PlantUML or Mermaid)
 * Set a fileWriter property (instance of FileWriter) on the parameters
 * object to control where the generated code is written to disk.
 *
 * @protected
 * @class
 */
declare class DiagramVisitor extends BaseVisitor {
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    protected writeDeclarationSupertype(classDeclaration: ClassDeclaration, parameters: any): void;
}
declare namespace DiagramVisitor {
    let COMPOSITION: string;
    let AGGREGATION: string;
    let INHERITANCE: string;
}
import BaseVisitor = require("./basevisitor");
import { ClassDeclaration } from "@accordproject/concerto-core";
