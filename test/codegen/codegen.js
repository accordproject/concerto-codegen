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

const formats = require('../../lib/codegen/codegen.js').formats;
const { ModelManager } = require('@accordproject/concerto-core');
const fs = require('fs');
const { expect } = require('expect');

const chai = require('chai');
const { InMemoryWriter } = require('@accordproject/concerto-util');
chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('chai-things'));

describe('codegen', function () {
    let versionedModelManager = null;
    let unversionedModelManager = null;

    before(function() {
        process.env.ENABLE_MAP_TYPE = 'true'; // TODO Remove on release of MapType
    });

    beforeEach(function() {
        versionedModelManager = new ModelManager();
        unversionedModelManager = new ModelManager();

        const base_cto = fs.readFileSync('./test/codegen/fromcto/data/model/hr_base.cto', 'utf-8');
        const cto = fs.readFileSync('./test/codegen/fromcto/data/model/hr.cto', 'utf-8');

        versionedModelManager.addCTOModel(base_cto, 'hr_base.cto');
        versionedModelManager.addCTOModel(cto, 'hr.cto');

        const unversionedBaseCto = base_cto.replace('namespace org.acme.hr.base@1.0.0', 'namespace org.acme.hr.base');
const unversionedCto = cto.replace('namespace org.acme.hr@1.0.0', 'namespace org.acme.hr').replace('import org.acme.hr.base@1.0.0', 'import org.acme.hr.base');
        unversionedModelManager.addCTOModel(unversionedBaseCto, 'hr_base.cto');
        unversionedModelManager.addCTOModel(unversionedCto, 'hr.cto');
    });

    afterEach(function() {
    });

    describe('#formats', function () {
        Object.keys(formats).forEach(function(format){
            it(`check we can convert all formats from namespace versioned CTO, format '${format}'`, function () {
                const visitor = new formats[format];
                visitor.should.not.be.null;
                const writer = new InMemoryWriter();
                const parameters = {
                    fileWriter: writer,
                    showCompositionRelationships: true,
                };
                versionedModelManager.accept(visitor, parameters);
                const files = writer.getFilesInMemory();
                files.forEach(function(value,key){
                    expect({value,key}).toMatchSnapshot();
                });
            });

            it(`should throw for unexpected node type, format '${format}'`, function () {
                const visitor = new formats[format];
                visitor.should.not.be.null;
                const writer = new InMemoryWriter();
                const parameters = {
                    fileWriter: writer
                };
                const mockNode = {
                    accept: (visitor, parameters) => visitor.visit(this, parameters),
                };
                (() => mockNode.accept(visitor, parameters)).should.throw(/(Unrecognised|Converting)/);
            });

            it(`check we can convert all formats from namespace unversioned CTO, format '${format}'`, function () {
                const visitor = new formats[format];
                visitor.should.not.be.null;
                const writer = new InMemoryWriter();
                const parameters = {
                    fileWriter: writer,
                };
                unversionedModelManager.accept(visitor, parameters);
                const files = writer.getFilesInMemory();
                files.forEach(function(value,key){
                    expect({value,key}).toMatchSnapshot();
                });
            });
        });

        const diagramFormats = ['mermaid', 'plantuml'];

        diagramFormats.forEach(function(format){
            it(`check we can convert all formats from namespace versioned CTO without the base model, format '${format}'`, function () {
                const visitor = new formats[format];
                visitor.should.not.be.null;
                const writer = new InMemoryWriter();
                const parameters = {
                    fileWriter: writer,
                    showCompositionRelationships: true,
                    hideBaseModel: true,
                };
                versionedModelManager.accept(visitor, parameters);
                const files = writer.getFilesInMemory();
                files.forEach(function(value,key){
                    expect({value,key}).toMatchSnapshot();
                });
            });
        });
    });
});
