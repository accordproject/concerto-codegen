export = inferModel;
/**
 * Infers a Concerto model from a JSON instance.
 * @param {string} namespace the namespace to use for the model
 * @param {*} rootTypeName the name for the root concept
 * @param {*} input the input json object
 * @returns {string} the Concerto model
 */
declare function inferModel(namespace: string, rootTypeName: any, input: any): string;
