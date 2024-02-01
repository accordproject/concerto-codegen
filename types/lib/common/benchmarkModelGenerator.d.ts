export = BenchmarkModelGenerator;
/**
 * Generate a benchmark model.
 *
 * @class
 */
declare class BenchmarkModelGenerator {
    /**
     * Formats the given byte size into a human-readable string.
     * @param {number} bytes The number of bytes.
     * @param {number} [decimals=2] The number of decimal places to include.
     * @returns {string} A formatted string representing the byte size.
     */
    formatBytes(bytes: number, decimals?: number): string;
    /**
     * Calculates the size of a JSON object in bytes.
     * @param {Object} json The JSON object to measure.
     * @returns {number} The size of the JSON object in bytes.
     */
    jsonSize(json: any): number;
    /**
     * Gathers statistics about the number of properties in declarations.
     * @param {Array} declarations An array of declaration objects.
     * @returns {Object} An object containing statistics about the properties.
     */
    gatherPropertiesNStats(declarations: any[]): any;
    /**
     * Generates a unique name based on a seed value.
     * @param {Object} params The indexes of the generated components.
     * @returns {string} A unique name.
     */
    generateName({ modelI, declarationI, propertyI, }: any): string;
    /**
     * Generates a property object.
     * @param {Object} params An object containing indices for model, declaration, and property.
     * @returns {Object} A property object.
     */
    generateProperty({ modelI, declarationI, propertyI, }: any): any;
    /**
     * Generates multiple property objects.
     * @param {Object} params An object containing model index, declaration index, and the number of properties.
     * @returns {Array<Object>} An array of property objects.
     */
    generateNProperties({ modelI, declarationI, nProperties, }: any): Array<any>;
    /**
     * Generates property objects up to a specified size.
     * @param {Object} params An object containing model index, declaration index, and a size budget for properties.
     * @returns {Array<Object>} An array of property objects within the specified size budget.
     */
    generatePropertiesUpToSize({ modelI, declarationI, propertiesSizeBudget, }: any): Array<any>;
    /**
     * Generates a declaration object with a specified number of properties.
     * @param {Object} params An object containing model index, declaration index, and the number of properties.
     * @returns {Object} A declaration object.
     */
    generateDeclarationWithNProperties({ modelI, declarationI, nProperties, }: any): any;
    /**
     * Generates a declaration object to a specified size.
     * @param {Object} params An object containing model index, declaration index, and a size budget for the declaration.
     * @returns {Object} A declaration object within the specified size budget.
     */
    generateDeclarationToSize({ modelI, declarationI, declarationSizeBudget, }: any): any;
    /**
     * Generates multiple declarations with properties, aiming to fit within a size budget by adding declarations.
     * @param {Object} params An object containing model index, a size budget for declarations, and the number of properties per declaration.
     * @returns {Array<Object>} An array of declaration objects.
     */
    generateDeclarationsToSizeGrowByDeclarations({ modelI, declarationsSizeBudget, nProperties, }: any): Array<any>;
    /**
     * Generates multiple declarations with properties, distributing the size budget across properties within declarations.
     * @param {Object} params An object containing model index, a size budget for declarations, and the number of declarations.
     * @returns {Array<Object>} An array of declaration objects.
     */
    generateDeclarationsToSizeGrowByProperties({ modelI, declarationsSizeBudget, nDeclarations, }: any): Array<any>;
    /**
     * Generates declarations according to a specified size budget and growth strategy.
     * @param {Object} params An object containing model index, size budget, number of declarations, number of properties, and growth strategy.
     * @returns {Array<Object>} An array of declaration objects according to the specified growth strategy.
     */
    generateDeclarationsToSize({ modelI, declarationsSizeBudget, nDeclarations, nProperties, growBy, }: any): Array<any>;
    /**
     * Generates a specified number of declarations, each with a fixed number of properties.
     * @param {Object} params An object containing model index, the number of declarations, and the number of properties per declaration.
     * @returns {Array<Object>} An array of declaration objects.
     */
    generateNDeclarations({ modelI, nDeclarations, nProperties, }: any): Array<any>;
    /**
     * Generates a Concerto model with specified parameters, optionally generating up to a size limit.
     * @param {Object} params An object containing parameters for the model generation, such as metamodel version, namespace, version, indices, and size constraints.
     * @returns {Object} An object containing the generated model and metadata about the generation process.
     * @public
     */
    public generateConcertoModels({ concertoMetamodelVersion, modelNamespace, modelVersion, modelI, generateUpToSize, growBy, nDeclarations, nProperties, }: any): any;
}
