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

const { DirectedGraph, ConcertoGraphVisitor } = require('../../lib/common/common.js');
const { ModelManager } = require('@accordproject/concerto-core');
const fs = require('fs');
const { expect } = require('expect');

const chai = require('chai');
const { InMemoryWriter } = require('@accordproject/concerto-util');
chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-things'));

describe('graph', function () {
    let modelManager = null;

    before(function() {
        process.env.ENABLE_MAP_TYPE = 'true'; // TODO Remove on release of MapType
    });

    beforeEach(function() {
        modelManager = new ModelManager();
        const hrBase = fs.readFileSync('./test/codegen/fromcto/data/model/hr_base.cto', 'utf-8');
        modelManager.addCTOModel(hrBase, 'hr_base.cto');
        const hr = fs.readFileSync('./test/codegen/fromcto/data/model/hr.cto', 'utf-8');
        modelManager.addCTOModel(hr, 'hr.cto');
    });


    describe('#visitor', function () {
        it('should visit a model manager', function () {
            const visitor = new ConcertoGraphVisitor();
            visitor.should.not.be.null;
            const writer = new InMemoryWriter();

            const graph = new DirectedGraph();
            modelManager.accept(visitor, { graph });

            writer.openFile('graph.mmd');
            graph.print(writer);
            writer.closeFile();
            expect(writer.data.get('graph.mmd')).toEqual(`flowchart LR
   \`org.acme.hr.base@1.0.0.State\`
   \`org.acme.hr.base@1.0.0.State\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr.base@1.0.0.TShirtSizeType\`
   \`org.acme.hr.base@1.0.0.TShirtSizeType\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr.base@1.0.0.EmployeeTShirtSizes\`
   \`org.acme.hr.base@1.0.0.EmployeeTShirtSizes\` --> \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr.base@1.0.0.EmployeeTShirtSizes\` --> \`org.acme.hr.base@1.0.0.TShirtSizeType\`
   \`org.acme.hr.base@1.0.0.Address\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`org.acme.hr.base@1.0.0.State\`
   \`org.acme.hr.base@1.0.0.Time\`
   \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr@1.0.0.CompanyProperties\`
   \`org.acme.hr@1.0.0.CompanyProperties\` --> \`String\`
   \`org.acme.hr@1.0.0.EmployeeLoginTimes\`
   \`org.acme.hr@1.0.0.EmployeeLoginTimes\` --> \`String\`
   \`org.acme.hr@1.0.0.EmployeeLoginTimes\` --> \`org.acme.hr.base@1.0.0.Time\`
   \`org.acme.hr@1.0.0.EmployeeSocialSecurityNumbers\`
   \`org.acme.hr@1.0.0.EmployeeSocialSecurityNumbers\` --> \`String\`
   \`org.acme.hr@1.0.0.EmployeeSocialSecurityNumbers\` --> \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr@1.0.0.EmployeeProfiles\`
   \`org.acme.hr@1.0.0.EmployeeProfiles\` --> \`String\`
   \`org.acme.hr@1.0.0.EmployeeProfiles\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr@1.0.0.EmployeeDirectory\`
   \`org.acme.hr@1.0.0.EmployeeDirectory\` --> \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr@1.0.0.EmployeeDirectory\` --> \`org.acme.hr@1.0.0.Employee\`
   \`org.acme.hr@1.0.0.Company\`
   \`org.acme.hr@1.0.0.Company\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr@1.0.0.Company\` --> \`org.acme.hr.base@1.0.0.Address\`
   \`org.acme.hr@1.0.0.Company\` --> \`org.acme.hr@1.0.0.CompanyProperties\`
   \`org.acme.hr@1.0.0.Company\` --> \`org.acme.hr@1.0.0.EmployeeDirectory\`
   \`org.acme.hr@1.0.0.Company\` --> \`org.acme.hr.base@1.0.0.EmployeeTShirtSizes\`
   \`org.acme.hr@1.0.0.Company\` --> \`org.acme.hr@1.0.0.EmployeeProfiles\`
   \`org.acme.hr@1.0.0.Company\` --> \`org.acme.hr@1.0.0.EmployeeSocialSecurityNumbers\`
   \`org.acme.hr@1.0.0.Department\`
   \`org.acme.hr@1.0.0.Department\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr@1.0.0.Equipment\`
   \`org.acme.hr@1.0.0.Equipment\` --> \`concerto@1.0.0.Asset\`
   \`org.acme.hr@1.0.0.LaptopMake\`
   \`org.acme.hr@1.0.0.LaptopMake\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr@1.0.0.Laptop\`
   \`org.acme.hr@1.0.0.Laptop\` --> \`org.acme.hr@1.0.0.Equipment\`
   \`org.acme.hr@1.0.0.Laptop\` --> \`org.acme.hr@1.0.0.LaptopMake\`
   \`org.acme.hr@1.0.0.Person\`
   \`org.acme.hr@1.0.0.Person\` --> \`concerto@1.0.0.Participant\`
   \`org.acme.hr@1.0.0.Person\` --> \`org.acme.hr.base@1.0.0.Address\`
   \`org.acme.hr@1.0.0.Person\` --> \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr@1.0.0.Employee\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr@1.0.0.Person\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr@1.0.0.Department\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr.base@1.0.0.Address\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr@1.0.0.Equipment\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr@1.0.0.Manager\`
   \`org.acme.hr@1.0.0.Contractor\`
   \`org.acme.hr@1.0.0.Contractor\` --> \`org.acme.hr@1.0.0.Person\`
   \`org.acme.hr@1.0.0.Contractor\` --> \`org.acme.hr@1.0.0.Company\`
   \`org.acme.hr@1.0.0.Contractor\` --> \`org.acme.hr@1.0.0.Manager\`
   \`org.acme.hr@1.0.0.Manager\`
   \`org.acme.hr@1.0.0.Manager\` --> \`org.acme.hr@1.0.0.Employee\`
   \`org.acme.hr@1.0.0.Manager\` --> \`org.acme.hr@1.0.0.Person\`
   \`org.acme.hr@1.0.0.CompanyEvent\`
   \`org.acme.hr@1.0.0.CompanyEvent\` --> \`concerto@1.0.0.Event\`
   \`org.acme.hr@1.0.0.Onboarded\`
   \`org.acme.hr@1.0.0.Onboarded\` --> \`org.acme.hr@1.0.0.CompanyEvent\`
   \`org.acme.hr@1.0.0.Onboarded\` --> \`org.acme.hr@1.0.0.Employee\`
   \`org.acme.hr@1.0.0.ChangeOfAddress\`
   \`org.acme.hr@1.0.0.ChangeOfAddress\` --> \`concerto@1.0.0.Transaction\`
   \`org.acme.hr@1.0.0.ChangeOfAddress\` --> \`org.acme.hr@1.0.0.Person\`
   \`org.acme.hr@1.0.0.ChangeOfAddress\` --> \`org.acme.hr.base@1.0.0.Address\`
`);
        });

        it('should visit find a connected subgraph', function () {
            const visitor = new ConcertoGraphVisitor();
            visitor.should.not.be.null;
            const writer = new InMemoryWriter();

            const graph = new DirectedGraph();
            modelManager.accept(visitor, { graph });

            const connectedGraph = graph.findConnectedGraph('org.acme.hr@1.0.0.ChangeOfAddress');
            expect(connectedGraph.hasEdge('org.acme.hr@1.0.0.ChangeOfAddress', 'org.acme.hr@1.0.0.Person'));

            const filteredModelManager = modelManager
                .filter(declaration => connectedGraph.hasVertex(declaration.getFullyQualifiedName()));

            expect(filteredModelManager.getModelFiles()).toHaveLength(1);
            expect(filteredModelManager.getModelFiles()[0].getAllDeclarations()).toHaveLength(15);

            writer.openFile('graph.mmd');
            connectedGraph.print(writer);
            writer.closeFile();
            expect(writer.data.get('graph.mmd')).toEqual(`flowchart LR
   \`org.acme.hr.base@1.0.0.State\`
   \`org.acme.hr.base@1.0.0.State\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr.base@1.0.0.Address\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`org.acme.hr.base@1.0.0.State\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`org.acme.hr@1.0.0.Map1\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`org.acme.hr@1.0.0.Map2\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`org.acme.hr@1.0.0.Map3\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`org.acme.hr@1.0.0.Map4\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`org.acme.hr@1.0.0.Map5\`
   \`org.acme.hr.base@1.0.0.Address\` --> \`org.acme.hr@1.0.0.Map6\`
   \`org.acme.hr@1.0.0.Map1\`
   \`org.acme.hr@1.0.0.Map1\` --> \`String\`
   \`org.acme.hr@1.0.0.Map2\`
   \`org.acme.hr@1.0.0.Map2\` --> \`String\`
   \`org.acme.hr@1.0.0.Map2\` --> \`DateTime\`
   \`org.acme.hr@1.0.0.Map3\`
   \`org.acme.hr@1.0.0.Map3\` --> \`String\`
   \`org.acme.hr@1.0.0.Map3\` --> \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr@1.0.0.Map4\`
   \`org.acme.hr@1.0.0.Map4\` --> \`String\`
   \`org.acme.hr@1.0.0.Map4\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr@1.0.0.Map5\`
   \`org.acme.hr@1.0.0.Map5\` --> \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr@1.0.0.Map5\` --> \`String\`
   \`org.acme.hr@1.0.0.Map6\`
   \`org.acme.hr@1.0.0.Map6\` --> \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr@1.0.0.Map6\` --> \`org.acme.hr@1.0.0.Employee\`
   \`org.acme.hr@1.0.0.Department\`
   \`org.acme.hr@1.0.0.Department\` --> \`concerto@1.0.0.Concept\`
   \`org.acme.hr@1.0.0.Equipment\`
   \`org.acme.hr@1.0.0.Equipment\` --> \`concerto@1.0.0.Asset\`
   \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr@1.0.0.Person\`
   \`org.acme.hr@1.0.0.Person\` --> \`concerto@1.0.0.Participant\`
   \`org.acme.hr@1.0.0.Person\` --> \`org.acme.hr.base@1.0.0.Address\`
   \`org.acme.hr@1.0.0.Person\` --> \`org.acme.hr.base@1.0.0.SSN\`
   \`org.acme.hr@1.0.0.Employee\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr@1.0.0.Person\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr@1.0.0.Department\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr.base@1.0.0.Address\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr@1.0.0.Equipment\`
   \`org.acme.hr@1.0.0.Employee\` --> \`org.acme.hr@1.0.0.Manager\`
   \`org.acme.hr@1.0.0.Manager\`
   \`org.acme.hr@1.0.0.Manager\` --> \`org.acme.hr@1.0.0.Employee\`
   \`org.acme.hr@1.0.0.Manager\` --> \`org.acme.hr@1.0.0.Person\`
   \`org.acme.hr@1.0.0.ChangeOfAddress\`
   \`org.acme.hr@1.0.0.ChangeOfAddress\` --> \`concerto@1.0.0.Transaction\`
   \`org.acme.hr@1.0.0.ChangeOfAddress\` --> \`org.acme.hr@1.0.0.Person\`
   \`org.acme.hr@1.0.0.ChangeOfAddress\` --> \`org.acme.hr.base@1.0.0.Address\`
`);
        });
    });
});
