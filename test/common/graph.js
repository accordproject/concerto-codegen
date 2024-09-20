/* eslint-disable no-unreachable */
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

const {
    DirectedGraph,
    ConcertoGraphVisitor,
} = require('../../lib/common/common.js');
const { ModelManager } = require('@accordproject/concerto-core');
const fs = require('fs');
const { expect } = require('expect');

const chai = require('chai');
const { InMemoryWriter } = require('@accordproject/concerto-util');
chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-things'));

describe('graph', function() {
    let modelManager = null;

    before(function() {
        process.env.ENABLE_MAP_TYPE = 'true'; // TODO Remove on release of MapType
    });

    beforeEach(function() {
        modelManager = new ModelManager();
        const hrBase = fs.readFileSync(
            './test/codegen/fromcto/data/model/hr_base.cto',
            'utf-8'
        );
        modelManager.addCTOModel(hrBase, 'hr_base.cto');
        const hr = fs.readFileSync(
            './test/codegen/fromcto/data/model/hr.cto',
            'utf-8'
        );
        modelManager.addCTOModel(hr, 'hr.cto');
    });

    describe('#visitor', function() {
        it('should visit a model manager', function() {
            const visitor = new ConcertoGraphVisitor();
            visitor.should.not.be.null;
            const writer = new InMemoryWriter();

            const graph = new DirectedGraph();
            modelManager.accept(visitor, { graph });

            writer.openFile('graph.mmd');
            graph.print(writer);
            writer.closeFile();
            expect(writer.data.get('graph.mmd')).toMatchSnapshot();
        });

        it('should visit find a connected subgraph', function() {
            const visitor = new ConcertoGraphVisitor();
            visitor.should.not.be.null;
            const writer = new InMemoryWriter();

            const graph = new DirectedGraph();
            modelManager.accept(visitor, { graph });

            const connectedGraph = graph.findConnectedGraph(
                'org.acme.hr@1.0.0.ChangeOfAddress'
            );
            expect(
                connectedGraph.hasEdge(
                    'org.acme.hr@1.0.0.ChangeOfAddress',
                    'org.acme.hr@1.0.0.Person'
                )
            );

            const filteredModelManager = modelManager.filter((declaration) =>
                connectedGraph.hasVertex(declaration.getFullyQualifiedName())
            );

            expect(filteredModelManager.getModelFiles()).toHaveLength(2);
            expect(
                filteredModelManager.getModelFiles()[0].getAllDeclarations()
            ).toHaveLength(7);

            writer.openFile('graph.mmd');
            connectedGraph.print(writer);
            writer.closeFile();
            expect(writer.data.get('graph.mmd')).toMatchSnapshot();
        });

        it('should visit a model manager and create a dependency graph', function() {
            const visitor = new ConcertoGraphVisitor();
            visitor.should.not.be.null;
            const writer = new InMemoryWriter();

            const graph = new DirectedGraph();
            modelManager.accept(visitor, {
                graph,
                createDependencyGraph: true
            });

            writer.openFile('graph.mmd');
            graph.print(writer);
            writer.closeFile();
            expect(writer.data.get('graph.mmd')).toMatchSnapshot();
        });
    });
});
