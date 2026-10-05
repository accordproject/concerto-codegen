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

const chai = require('chai');
chai.should();

const codegen = require('../index.js');
const CodeGen = require('../lib/codegen/codegen.js');
const Common = require('../lib/common/common.js');
const packageJson = require('../package.json');

describe('index', function () {
    it('exports CodeGen, Common and version', function () {
        codegen.CodeGen.should.equal(CodeGen);
        codegen.Common.should.equal(Common);
        codegen.version.should.equal(packageJson);
    });

    // The named exports duplicate the lists in lib/codegen/codegen.js and
    // lib/common/common.js; this keeps them in step when a generator is added.
    it('exports every CodeGen member except formats by name', function () {
        Object.keys(CodeGen).filter(name => name !== 'formats').forEach(name => {
            codegen.should.have.property(name).that.equals(CodeGen[name]);
        });
    });

    it('exports every Common member by name', function () {
        Object.keys(Common).forEach(name => {
            codegen.should.have.property(name).that.equals(Common[name]);
        });
    });

    it('exports nothing else', function () {
        const expected = ['CodeGen', 'Common', 'version',
            ...Object.keys(CodeGen).filter(name => name !== 'formats'),
            ...Object.keys(Common)];
        Object.keys(codegen).sort().should.deep.equal(expected.sort());
    });

    it('exposes the named exports to ES module importers', async function () {
        const esm = await import('../index.js');
        // Node 23+ also exposes the CommonJS object itself as 'module.exports'.
        Object.keys(esm).filter(name => name !== 'default' && name !== 'module.exports').sort()
            .should.deep.equal(Object.keys(codegen).sort());
    });
});
