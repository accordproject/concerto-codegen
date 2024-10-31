/* eslint-disable require-jsdoc */
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

const { ModelUtil } = require('@accordproject/concerto-core');

const DiagramVisitor = require('./diagramvisitor');

// Types needed for TypeScript generation.
/* eslint-disable no-unused-vars */
/* istanbul ignore next */
if (global === undefined) {
    const { ClassDeclaration, MapDeclaration, ScalarDeclaration, Field, Decorator, EnumValueDeclaration, RelationshipDeclaration} = require('@accordproject/concerto-core');
    const { Writer } = require('@accordproject/concerto-util');
}
/* eslint-enable no-unused-vars */

/*
 * This class represents a directed graph using an
 * adjacency list representation.
 */
class DirectedGraph {

    /**
     * Construct a new graph from an adjacency map representation.
     *
     * Vertices are represented by strings.
     * Edges are a list of names of connected vertices
     *
     * @param {Object.<string, string[]>} adjacencyMap - initial graph
     */
    constructor(adjacencyMap = {}) {
        this.adjacencyMap = adjacencyMap;
    }

    /**
     * Checks if the graph has an edge from source to target
     * @param {string} source - the origin of the edge
     * @param {string} target - the destination of the edge
     * @return {boolean} - true, if the graph has the edge
     */
    hasEdge(source, target) {
        return this.adjacencyMap[source].includes(target);
    }

    /**
     * Adds an edge from `source` to `target`
     * @param {string} source - the origin of the edge
     * @param {string} target - the destination of the edge
     */
    addEdge(source, target) {
        this.adjacencyMap[source] ??= [];
        if (!this.adjacencyMap[source].includes(target)){
            this.adjacencyMap[source].push(target);
        }
    }

    /**
     * Checks if the graph has a named vertex
     * @param {string} vertex - the name of the new vertex
     * @return {boolean} - true, if the graph has the named vertex
     */
    hasVertex(vertex) {
        return !!this.adjacencyMap[vertex];
    }

    /**
     * Add a vertex to the graph
     * @param {string} vertex - the name of the new vertex
     */
    addVertex(vertex) {
        this.adjacencyMap[vertex] ??= [];
    }

    /**
     * A utility which traverses this directed graph from the `source` vertex
     * to visit all connected vertices to find the maximal subgraph.
     *
     * This is useful for finding disconnected subgraphs,
     * i.e. so-called "tree-shaking".
     *
     * Optionally supports a list of source vertices, to allow searching from
     * multiple start vertices.
     *
     * Returns a new DirectedGraph instance
     *
     * @param {string | string[]} source - The root vertex (or vertices) from
     * which to begin the search
     * @returns {DirectedGraph} - A maximal subgraph
     */
    findConnectedGraph(source) {
        // Normalize the source to an array, even if there's only one
        let sourceVertices = source;
        if (!Array.isArray(sourceVertices)){
            sourceVertices = [sourceVertices];
        }

        // Track our descent
        const visited = {};
        const queue = [...sourceVertices];

        // Initialize the state
        sourceVertices.forEach(v => { visited[v] = true; });

        // Perform a BFS search of the graph.
        let currentVertex;
        while (queue.length > 0) {
            currentVertex = queue[0];
            queue.shift();

            const edges = this.adjacencyMap[currentVertex] || [];

            edges.forEach(edge => {
                if (!visited[edge]) {
                    visited[edge] = true;
                    queue.push(edge);
                }
            });
        }

        return new DirectedGraph(Object.fromEntries(
            Object.entries(this.adjacencyMap)
                .filter(([vertex]) => visited[vertex])
        ));
    }

    /**
     * Visualizes the graph as a Mermaid Flowchart
     *
     * @param {Writer} writer - Buffer for text to be written
     */
    print(writer) {
        writer.writeLine(0, 'flowchart LR');
        const diagramNodeSet = new Set();
        Object.entries(this.adjacencyMap).forEach(([source, edges]) =>{
            diagramNodeSet.add( `\`${source}\``);
            (edges || []).forEach(target => {
                const setEntry = `\`${source}\` --> \`${target}\``;
                if(diagramNodeSet.has(`\`${target}\` --> \`${source}\``)) {
                    diagramNodeSet.delete(`\`${target}\` --> \`${source}\``);
                    diagramNodeSet.add(`\`${source}\` <--> \`${target}\``);
                } else {
                    diagramNodeSet.add(setEntry);
                }
            });
        });
        diagramNodeSet.forEach((diagramNode) => {
            writer.writeLine(1, diagramNode);
        });
    }
}

/**
 * Convert the contents of a ModelManager to a directed graph where types are
 * vertices and edges are relationships between types.
 *
 * @protected
 * @class
 * @memberof module:concerto-util
 */
class ConcertoGraphVisitor extends DiagramVisitor {
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitClassDeclaration(classDeclaration, parameters) {
        parameters.stack ??= [];
        parameters.stack.push(classDeclaration.getFullyQualifiedName());
        parameters.graph.addVertex(classDeclaration.getFullyQualifiedName());

        if (classDeclaration.getSuperType()){
            parameters.graph.addEdge(classDeclaration.getFullyQualifiedName(), classDeclaration.getSuperType());
            // this "if" block adds the types that extend the Super type
            if(!parameters.createDependencyGraph && classDeclaration.getSuperType() !== 'concerto@1.0.0.Concept') {
                parameters.graph.addVertex(classDeclaration.getSuperType());
                parameters.graph.addEdge(classDeclaration.getSuperType(), classDeclaration.getFullyQualifiedName());
            }
        }
        super.visitClassDeclaration(classDeclaration, parameters);
        parameters.stack.pop();
    }

    /**
     * Visitor design pattern
     * @param {ScalarDeclaration} scalarDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitScalarDeclaration(scalarDeclaration, parameters) {
        super.visitScalarDeclaration(scalarDeclaration, parameters);
        parameters.graph.addVertex(scalarDeclaration.getFullyQualifiedName());
    }

    /**
     * Visitor design pattern
     * @param {Decorator} decorator - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitDecorator(decorator, parameters) {
        super.visitDecorator(decorator, parameters);
        const parent = decorator.getParent();
        const modelFile = parent.getModelFile();
        // Process the decorator name and arguments in a unified way
        const namesToProcess = [
            decorator.name,
            ...(decorator.getArguments()?.map(arg => arg?.name).filter(Boolean) || [])
        ];
        namesToProcess.forEach(name => this.addEdgeForDecorator(name, parent, modelFile, parameters));
    }

    addEdgeForDecorator(name, parent, modelFile, parameters) {
        const fqn = modelFile.getFullyQualifiedTypeName(name);
        if (fqn) {
            parameters.graph.addVertex(fqn);

            // Determine parent FQN based on property type
            const type = modelFile.getModelManager().getType(fqn);
            const isParentPropertyType = parent.isField?.() || parent.isRelationship?.() || parent.isEnumValue?.() || parent.isKey?.() || parent.isValue?.();
            let parentFqn = isParentPropertyType ? parent.getParent().getFullyQualifiedName() : parent.getFullyQualifiedName?.();
            parentFqn ??= parent.getNamespace(); //parent is a modelfile

            parameters.graph.addEdge(parentFqn, type.getFullyQualifiedName());
        }
    }

    /**
     * Visitor design pattern
     * @param {MapDeclaration} mapDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitMapDeclaration(mapDeclaration, parameters) {
        const modelFile = mapDeclaration.getModelFile();
        const fqn       = mapDeclaration.getFullyQualifiedName();
        let keyEdge     = mapDeclaration.getKey().getType();
        let valueEdge   = mapDeclaration.getValue().getType();

        if(!ModelUtil.isPrimitiveType(keyEdge)) {
            keyEdge = modelFile.getType(mapDeclaration.getKey().getType()).getFullyQualifiedName();
        }

        if(!ModelUtil.isPrimitiveType(valueEdge)) {
            // handle imported types
            if (!modelFile.isLocalType(mapDeclaration.getValue().getType())) {
                valueEdge = modelFile.resolveImport(mapDeclaration.getValue().getType());
            } else {
                valueEdge = modelFile.getType(mapDeclaration.getValue().getType()).getFullyQualifiedName();
            }
        }
        super.visitMapDeclaration(mapDeclaration, parameters);
        parameters.graph.addVertex(fqn);
        parameters.graph.addEdge(fqn,  keyEdge);
        parameters.graph.addEdge(fqn,   valueEdge);
    }

    /**
     * Visitor design pattern
     * @param {Field} scalar - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitScalarField(scalar, parameters) {
        super.visitScalarField(scalar, parameters);
        parameters.graph.addEdge(parameters.stack.slice(-1), scalar.getFullyQualifiedTypeName());
    }

    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitField(field, parameters) {
        super.visitField(field, parameters);
        if (!ModelUtil.isPrimitiveType(field.getFullyQualifiedTypeName())) {
            parameters.graph.addEdge(parameters.stack.slice(-1), field.getFullyQualifiedTypeName());
        }
    }

    /**
     * Visitor design pattern
     * @param {RelationshipDeclaration} relationship - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitRelationship(relationship, parameters) {
        super.visitRelationship(relationship, parameters);
        parameters.graph.addEdge(parameters.stack.slice(-1), relationship.getFullyQualifiedTypeName());
    }

    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @protected
     */
    visitEnumValueDeclaration(enumValueDeclaration, parameters) {
        super.visitEnumValueDeclaration(enumValueDeclaration, parameters);
        return;
    }
}

module.exports = {
    ConcertoGraphVisitor,
    DirectedGraph
};
