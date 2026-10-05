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

/**
 * Concerto CodeGen module.
 * @module concerto-codegen
 */

module.exports.CodeGen = require('./lib/codegen/codegen');
module.exports.Common = require('./lib/common/common');
module.exports.version = require('./package.json');

// Each generator is also exported by name, so that a bundler can leave out the
// generators an application never imports. They are the same objects as the
// members of CodeGen and Common. Each is assigned on its own line so that
// Node's ES module loader and tsc's declaration output both see the name.
module.exports.AbstractPlugin = require('./lib/codegen/abstractplugin');
module.exports.GoLangVisitor = require('./lib/codegen/fromcto/golang/golangvisitor');
module.exports.JSONSchemaVisitor = require('./lib/codegen/fromcto/jsonschema/jsonschemavisitor');
module.exports.XmlSchemaVisitor = require('./lib/codegen/fromcto/xmlschema/xmlschemavisitor');
module.exports.PlantUMLVisitor = require('./lib/codegen/fromcto/plantuml/plantumlvisitor');
module.exports.TypescriptVisitor = require('./lib/codegen/fromcto/typescript/typescriptvisitor');
module.exports.JavaVisitor = require('./lib/codegen/fromcto/java/javavisitor');
module.exports.GraphQLVisitor = require('./lib/codegen/fromcto/graphql/graphqlvisitor');
module.exports.CSharpVisitor = require('./lib/codegen/fromcto/csharp/csharpvisitor');
module.exports.ODataVisitor = require('./lib/codegen/fromcto/odata/odatavisitor');
module.exports.MermaidVisitor = require('./lib/codegen/fromcto/mermaid/mermaidvisitor');
module.exports.MarkdownVisitor = require('./lib/codegen/fromcto/markdown/markdownvisitor');
module.exports.ProtobufVisitor = require('./lib/codegen/fromcto/protobuf/protobufvisitor');
module.exports.OpenApiVisitor = require('./lib/codegen/fromcto/openapi/openapivisitor');
module.exports.AvroVisitor = require('./lib/codegen/fromcto/avro/avrovisitor');
module.exports.JSONSchemaToConcertoVisitor = require('./lib/codegen/fromJsonSchema/cto/jsonSchemaVisitor');
module.exports.OpenApiToConcertoVisitor = require('./lib/codegen/fromOpenApi/cto/openApiVisitor');
module.exports.RustVisitor = require('./lib/codegen/fromcto/rust/rustvisitor');
module.exports.VocabularyVisitor = require('./lib/codegen/fromcto/vocabulary/vocabularyvisitor');
module.exports.BenchmarkModelGenerator = require('./lib/common/benchmarkModelGenerator');
module.exports.DiagramVisitor = require('./lib/common/diagramvisitor');
module.exports.ConcertoGraphVisitor = require('./lib/common/graph').ConcertoGraphVisitor;
module.exports.DirectedGraph = require('./lib/common/graph').DirectedGraph;
