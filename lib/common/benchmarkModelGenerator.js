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

const { Blob } = require('buffer');

const DEFAULT_CONCERTO_METAMODEL_VERSION = '1.0.0';
const DEFAULT_MODEL_NAMESPACE = 'generated.model';
const DEFAULT_MODEL_VERSION = '1.0.0';

/**
 * Generate a benchmark model.
 *
 * @class
 */
class BenchmarkModelGenerator {
    /**
     * Formats the given byte size into a human-readable string.
     * @param {number} bytes The number of bytes.
     * @param {number} [decimals=2] The number of decimal places to include.
     * @returns {string} A formatted string representing the byte size.
     */
    formatBytes(bytes, decimals = 2) {
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    /**
     * Calculates the size of a JSON object in bytes.
     * @param {Object} json The JSON object to measure.
     * @returns {number} The size of the JSON object in bytes.
     */
    jsonSize(json) {
        return new Blob(
            [JSON.stringify(json)]
        ).size;
    }

    /**
     * Gathers statistics about the number of properties in declarations.
     * @param {Array} declarations An array of declaration objects.
     * @returns {Object} An object containing statistics about the properties.
     */
    gatherPropertiesNStats(declarations) {
        const propertiesNInDeclarations = declarations.map(
            declaration => declaration.properties.length
        );

        return {
            propertiesNInSmallestDeclaration: Math.min(...propertiesNInDeclarations),
            propertiesNInLargestDeclaration: Math.max(...propertiesNInDeclarations),
        };
    }

    /**
     * Generates a unique name based on a seed value.
     * @param {Object} params The indexes of the generated components.
     * @returns {string} A unique name.
     */
    generateName({
        modelI,
        declarationI,
        propertyI,
    }) {
        return `Model${modelI}Declaration${declarationI}${
            typeof propertyI === 'number' ? `Property${propertyI}` : ''
        }`;
    }

    /**
     * Generates a property object.
     * @param {Object} params An object containing indices for model, declaration, and property.
     * @returns {Object} A property object.
     */
    generateProperty({
        modelI,
        declarationI,
        propertyI,
    }) {
        return {
            $class: 'concerto.metamodel@1.0.0.StringProperty',
            name: this.generateName({ modelI, declarationI, propertyI }),
            isArray: false,
            isOptional: false,
        };
    }

    /**
     * Generates multiple property objects.
     * @param {Object} params An object containing model index, declaration index, and the number of properties.
     * @returns {Array<Object>} An array of property objects.
     */
    generateNProperties({
        modelI,
        declarationI,
        nProperties,
    }) {
        let properties = [];

        for (let propertyI = 0; propertyI < nProperties; propertyI++) {
            properties = [
                ...properties,
                this.generateProperty({
                    modelI,
                    declarationI,
                    propertyI,
                })
            ];
        }

        return properties;
    }

    /**
     * Generates property objects up to a specified size.
     * @param {Object} params An object containing model index, declaration index, and a size budget for properties.
     * @returns {Array<Object>} An array of property objects within the specified size budget.
     */
    generatePropertiesUpToSize({
        modelI,
        declarationI,
        propertiesSizeBudget,
    }) {
        let properties = [];
        let oversized = false;
        let propertyI = 0;

        while (!oversized) {
            const propertiesWithNewAddition = [
                ...properties,
                this.generateProperty({
                    modelI,
                    declarationI,
                    propertyI,
                })
            ];

            if (this.jsonSize(propertiesWithNewAddition) <= propertiesSizeBudget) {
                propertyI++;
                properties = propertiesWithNewAddition;
            } else {
                oversized = true;
            }
        }

        return properties;
    }

    /**
     * Generates a declaration object with a specified number of properties.
     * @param {Object} params An object containing model index, declaration index, and the number of properties.
     * @returns {Object} A declaration object.
     */
    generateDeclarationWithNProperties({
        modelI,
        declarationI,
        nProperties,
    }) {
        return {
            $class: 'concerto.metamodel@1.0.0.ConceptDeclaration',
            name: this.generateName({ modelI, declarationI }),
            isAbstract: false,
            properties: this.generateNProperties({
                modelI,
                declarationI,
                nProperties,
            })
        };
    }

    /**
     * Generates a declaration object to a specified size.
     * @param {Object} params An object containing model index, declaration index, and a size budget for the declaration.
     * @returns {Object} A declaration object within the specified size budget.
     */
    generateDeclarationToSize({
        modelI,
        declarationI,
        declarationSizeBudget,
    }) {
        let declaration = {
            $class: 'concerto.metamodel@1.0.0.ConceptDeclaration',
            name: this.generateName({ modelI, declarationI }),
            isAbstract: false,
            properties: [],
        };

        declaration.properties = this.generatePropertiesUpToSize({
            modelI,
            declarationI,
            propertiesSizeBudget: declarationSizeBudget - this.jsonSize(declaration),
        });

        return declaration;
    }

    /**
     * Generates multiple declarations with properties, aiming to fit within a size budget by adding declarations.
     * @param {Object} params An object containing model index, a size budget for declarations, and the number of properties per declaration.
     * @returns {Array<Object>} An array of declaration objects.
     */
    generateDeclarationsToSizeGrowByDeclarations({
        modelI,
        declarationsSizeBudget,
        nProperties,
    }) {
        let declarations = [];
        let oversized = false;
        let declarationI = 0;

        while (!oversized) {
            const declarationsWithNewAddition = [
                ...declarations,
                this.generateDeclarationWithNProperties({
                    modelI,
                    declarationI,
                    nProperties,
                })
            ];

            if (this.jsonSize(declarationsWithNewAddition) <= declarationsSizeBudget) {
                declarationI++;
                declarations = declarationsWithNewAddition;
            } else {
                oversized = true;
            }
        }

        return declarations;
    }

    /**
     * Generates multiple declarations with properties, distributing the size budget across properties within declarations.
     * @param {Object} params An object containing model index, a size budget for declarations, and the number of declarations.
     * @returns {Array<Object>} An array of declaration objects.
     */
    generateDeclarationsToSizeGrowByProperties({
        modelI,
        declarationsSizeBudget,
        nDeclarations,
    }) {
        let declarations = [];
        let remainingDeclarationSizeBudget;
        let declarationI = 0;

        while (nDeclarations - declarationI > 0) {
            remainingDeclarationSizeBudget = (
                declarationsSizeBudget - this.jsonSize(declarations)
            ) / (nDeclarations - declarationI);

            const declaration = this.generateDeclarationToSize({
                modelI,
                declarationI,
                declarationSizeBudget: remainingDeclarationSizeBudget,
            });
            declarationI++;
            declarations = [ ...declarations, declaration ];
        }

        return declarations;
    }

    /**
     * Generates declarations according to a specified size budget and growth strategy.
     * @param {Object} params An object containing model index, size budget, number of declarations, number of properties, and growth strategy.
     * @returns {Array<Object>} An array of declaration objects according to the specified growth strategy.
     */
    generateDeclarationsToSize({
        modelI,
        declarationsSizeBudget,
        nDeclarations,
        nProperties,
        growBy,
    }) {
        switch(growBy) {
        case 'declarations':
            return this.generateDeclarationsToSizeGrowByDeclarations({
                modelI,
                declarationsSizeBudget,
                nProperties,
            });
        case 'properties':
            return this.generateDeclarationsToSizeGrowByProperties({
                modelI,
                declarationsSizeBudget,
                nDeclarations,
            });
        default:
            throw new Error('growBy can be either set to "declarations" or "properties".');
        }
    }

    /**
     * Generates a specified number of declarations, each with a fixed number of properties.
     * @param {Object} params An object containing model index, the number of declarations, and the number of properties per declaration.
     * @returns {Array<Object>} An array of declaration objects.
     */
    generateNDeclarations({
        modelI,
        nDeclarations,
        nProperties,
    }) {
        let declarations = [];

        for (let declarationI = 0; declarationI < nDeclarations; declarationI++) {
            declarations = [
                ...declarations,
                this.generateDeclarationWithNProperties({
                    modelI,
                    declarationI,
                    nProperties,
                })
            ];
        }

        return declarations;
    }

    /**
     * Generates a Concerto model with specified parameters, optionally generating up to a size limit.
     * @param {Object} params An object containing parameters for the model generation, such as metamodel version, namespace, version, indices, and size constraints.
     * @returns {Object} An object containing the generated model and metadata about the generation process.
     * @public
     */
    generateConcertoModels({
        concertoMetamodelVersion = DEFAULT_CONCERTO_METAMODEL_VERSION,
        modelNamespace = DEFAULT_MODEL_NAMESPACE,
        modelVersion = DEFAULT_MODEL_VERSION,
        modelI = 0,
        generateUpToSize,
        growBy = 'declarations',
        nDeclarations = 1,
        nProperties = 1,
    }) {
        const model = {
            $class: `concerto.metamodel@${concertoMetamodelVersion}.Model`,
            decorators: [],
            namespace: `${modelNamespace}@${modelVersion}`,
            imports: [],
            declarations: []
        };

        if (generateUpToSize) {
            const modelSizeWithoutDeclarations = this.jsonSize(model);

            if (modelSizeWithoutDeclarations < generateUpToSize) {
                model.declarations = this.generateDeclarationsToSize({
                    modelI,
                    declarationsSizeBudget: generateUpToSize - modelSizeWithoutDeclarations,
                    nDeclarations,
                    nProperties,
                    growBy,
                });
            }
        } else {
            model.declarations = this.generateNDeclarations({
                modelI,
                nDeclarations,
                nProperties,
            });
        }

        const generatedModelSizeInBytes = this.jsonSize(model);

        this.gatherPropertiesNStats(model.declarations);
        const {
            propertiesNInSmallestDeclaration,
            propertiesNInLargestDeclaration,
        } = this.gatherPropertiesNStats(model.declarations);

        return {
            models: [model],
            metadata: {
                ...(generateUpToSize ? {
                    requestedModelSizeInBytes: generateUpToSize,
                    humanReadableRequestedModelSize: this.formatBytes(generateUpToSize, 2),
                } : {}),
                generatedModelSizeInBytes,
                humanReadableGeneratedModelSize: this.formatBytes(generatedModelSizeInBytes, 2),
                declarationsN: model.declarations.length,
                propertiesNInSmallestDeclaration,
                propertiesNInLargestDeclaration,
            }
        };
    }
}

module.exports = BenchmarkModelGenerator;
