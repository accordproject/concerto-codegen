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

const { assert } = require('chai');
const { ModelManager } = require('@accordproject/concerto-core');
const { InMemoryWriter } = require('@accordproject/concerto-util');
const ProtobufVisitor = require('../../../../lib/codegen/fromcto/protobuf/protobufvisitor');

describe('Protobuf map fields', () => {
    let modelManager;
    let writer;

    beforeEach(() => {
        modelManager = new ModelManager();
        writer = new InMemoryWriter();
    });

    it('emits required and optional maps with distinct property names and no field rule', () => {
        modelManager.addCTOModel(`namespace org.example.maps@1.0.0
            map Labels { o String o String }
            concept Record {
                o Labels primary
                o Labels secondary optional
            }`);
        modelManager.accept(new ProtobufVisitor(), { fileWriter: writer });

        const output = writer.data.get('org.example.maps.v1_0_0.proto');
        assert.include(output, 'map<string, string> primary = 1;');
        assert.include(output, 'map<string, string> secondary = 2;');
        assert.notInclude(output, 'optional map');
    });

    it('resolves local scalar map keys and values to their underlying primitive types', () => {
        modelManager.addCTOModel(`namespace org.example.maps@1.0.0
            scalar Identifier extends String
            scalar Amount extends Double
            map Amounts { o Identifier o Amount }
            concept Record { o Amounts amounts optional }`);
        modelManager.accept(new ProtobufVisitor(), { fileWriter: writer });

        assert.include(writer.data.get('org.example.maps.v1_0_0.proto'),
            'map<string, double> amounts = 1;');
    });

    it('resolves scalar types in the declaring namespace of an imported map', () => {
        modelManager.addCTOModel(`namespace org.example.types@1.0.0
            scalar Identifier extends String
            scalar Time extends DateTime
            map LoginTimes { o Identifier o Time }`);
        modelManager.addCTOModel(`namespace org.example.maps@1.0.0
            import org.example.types@1.0.0.LoginTimes
            concept Record { o LoginTimes logins optional }`);
        modelManager.accept(new ProtobufVisitor(), { fileWriter: writer });

        assert.include(writer.data.get('org.example.maps.v1_0_0.proto'),
            'map<string, google.protobuf.Timestamp> logins = 1;');
    });

    it('preserves message and enum map value types', () => {
        modelManager.addCTOModel(`namespace org.example.maps@1.0.0
            enum Status { o ACTIVE o INACTIVE }
            concept Person { o String name }
            map People { o String o Person }
            map Statuses { o String o Status }
            concept Record {
                o People people
                o Statuses statuses optional
            }`);
        modelManager.accept(new ProtobufVisitor(), { fileWriter: writer });

        const output = writer.data.get('org.example.maps.v1_0_0.proto');
        assert.include(output, 'map<string, Person> people = 1;');
        assert.include(output, 'map<string, Status> statuses = 2;');
    });
});
