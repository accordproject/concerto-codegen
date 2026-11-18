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

const { InMemoryWriter } = require('@accordproject/concerto-util');
const chai = require('chai');
chai.should();

const ModelManager = require('@accordproject/concerto-core').ModelManager;
const AvroVisitor = require('../../../../lib/codegen/fromcto/avro/avrovisitor.js');

const MODEL_SIMPLE = `
namespace test@1.0.0

enum Color {
  o RED
  o GREEN
  o BLUE
}

scalar Email extends String

@resource
concept Person identified by email {
  o Email email
  o Color color
}
`;

describe('Avro', function () {

    describe('samples', () => {
        it('should use custom properties', () => {
            const modelManager = new ModelManager();
            modelManager.addCTOModel( MODEL_SIMPLE );
            const visitor = new AvroVisitor();
            const fileWriter = new InMemoryWriter();
            modelManager.accept(visitor, {
                avroProtocolName: 'FancyProtocol',
                fileWriter
            });
            const files = fileWriter.getFilesInMemory();
            const file = files.get('test@1.0.0.avdl');
            file.should.match(/protocol FancyProtocol/);
        });

        it('should drop the version from the namespace', () => {
            const modelManager = new ModelManager();
            modelManager.addCTOModel( MODEL_SIMPLE );
            const visitor = new AvroVisitor();
            const fileWriter = new InMemoryWriter();
            modelManager.accept(visitor, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file = files.get('test@1.0.0.avdl');
            file.should.match(/^@namespace\("test"\)$/m);
        });

        it('should write imported types with their full name', () => {
            const modelManager = new ModelManager();
            modelManager.addCTOModel( MODEL_SIMPLE );
            modelManager.addCTOModel(`
namespace other@1.0.0

import test@1.0.0.{Person, Color}

map ColorByName {
  o String
  o Color
}

concept Team {
  o Person lead
  o Color[] colors
  o ColorByName favourites
}
`);
            const visitor = new AvroVisitor();
            const fileWriter = new InMemoryWriter();
            modelManager.accept(visitor, { fileWriter });
            const files = fileWriter.getFilesInMemory();
            const file = files.get('other@1.0.0.avdl');
            file.should.match(/^\s+test\.Person lead;$/m);
            file.should.match(/^\s+array<test\.Color> colors;$/m);
            file.should.match(/^\s+map<test\.Color> favourites;$/m);
        });

        it('should throw an error when an unrecognised type is supplied', () => {
            let thing = 'Something of unrecognised type';
            const visitor = new AvroVisitor();
            const param = {};
            (() => {
                visitor.visit(thing, param);
            }).should.throw('Unrecognised type: string, value: \'Something of unrecognised type\'');
        });
    });

    describe('toAvroName and identifier escaping', () => {
        it('should replace all dollar signs in a name with underscores', () => {
            const visitor = new AvroVisitor();
            visitor.toAvroName('$foo').should.equal('_foo');
            visitor.toAvroName('$$foo').should.equal('__foo');
            visitor.toAvroName('a$b$c').should.equal('a_b_c');
            visitor.toAvroName('$a$b$c$').should.equal('_a_b_c_');
            visitor.toAvroName('cleanName').should.equal('cleanName');
        });

        it('should escape dollar signs in record, field, enum, and relationship names', () => {
            const modelManager = new ModelManager();
            modelManager.addCTOModel(`namespace org.test@1.0.0
enum $Color$Type {
    o $RED$
    o GREEN
}
asset $Super$Base identified by id {
    o String id
}
asset $Sub$Class extends $Super$Base {
    o String $prop$one
    o String $$prop$$two
    o $Color$Type color
    --> $Super$Base $rel$target
}`);
            const visitor = new AvroVisitor();
            const fileWriter = new InMemoryWriter();
            modelManager.accept(visitor, { fileWriter });
            const file = fileWriter.getFilesInMemory().get('org.test@1.0.0.avdl');

            file.should.contain('enum _Color_Type {');
            file.should.contain('_RED_,');
            file.should.contain('record _Super_Base {');
            file.should.contain('record _Sub_Class {');
            file.should.contain('string _prop_one;');
            file.should.contain('string __prop__two;');
            file.should.contain('org.test._Color_Type color;');
            file.should.contain('string _rel_target;');
        });

        it('should escape dollar signs in map field names and map value types', () => {
            const modelManager = new ModelManager();
            modelManager.addCTOModel(`namespace org.test@1.0.0
enum $Status$Type {
    o ACTIVE
}
map $Map$Data {
    o String
    o $Status$Type
}
concept Container {
    o $Map$Data $meta$data
}`);
            const visitor = new AvroVisitor();
            const fileWriter = new InMemoryWriter();
            modelManager.accept(visitor, { fileWriter });
            const file = fileWriter.getFilesInMemory().get('org.test@1.0.0.avdl');

            file.should.contain('map<org.test._Status_Type> _meta_data;');
        });
    });
});
