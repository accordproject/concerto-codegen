import AbstractPlugin = require("./abstractplugin");
import GoLangVisitor = require("./fromcto/golang/golangvisitor");
import JSONSchemaVisitor = require("./fromcto/jsonschema/jsonschemavisitor");
import XmlSchemaVisitor = require("./fromcto/xmlschema/xmlschemavisitor");
import PlantUMLVisitor = require("./fromcto/plantuml/plantumlvisitor");
import TypescriptVisitor = require("./fromcto/typescript/typescriptvisitor");
import JavaVisitor = require("./fromcto/java/javavisitor");
import GraphQLVisitor = require("./fromcto/graphql/graphqlvisitor");
import CSharpVisitor = require("./fromcto/csharp/csharpvisitor");
import ODataVisitor = require("./fromcto/odata/odatavisitor");
import MermaidVisitor = require("./fromcto/mermaid/mermaidvisitor");
import MarkdownVisitor = require("./fromcto/markdown/markdownvisitor");
import ProtobufVisitor = require("./fromcto/protobuf/protobufvisitor");
import OpenApiVisitor = require("./fromcto/openapi/openapivisitor");
import AvroVisitor = require("./fromcto/avro/avrovisitor");
import JSONSchemaToConcertoVisitor = require("./fromJsonSchema/cto/jsonSchemaVisitor");
import OpenApiToConcertoVisitor = require("./fromOpenApi/cto/openApiVisitor");
import RustVisitor = require("./fromcto/rust/rustvisitor");

export declare namespace formats {
    export { GoLangVisitor as golang };
    export { JSONSchemaVisitor as jsonschema };
    export { XmlSchemaVisitor as xmlschema };
    export { PlantUMLVisitor as plantuml };
    export { TypescriptVisitor as typescript };
    export { JavaVisitor as java };
    export { GraphQLVisitor as graphql };
    export { CSharpVisitor as csharp };
    export { ODataVisitor as odata };
    export { MermaidVisitor as mermaid };
    export { MarkdownVisitor as markdown };
    export { ProtobufVisitor as protobuf };
    export { OpenApiVisitor as openapi };
    export { AvroVisitor as avro };
    export { RustVisitor as rust };
}
export { AbstractPlugin, GoLangVisitor, JSONSchemaVisitor, XmlSchemaVisitor, PlantUMLVisitor, TypescriptVisitor, JavaVisitor, GraphQLVisitor, CSharpVisitor, ODataVisitor, MermaidVisitor, MarkdownVisitor, ProtobufVisitor, OpenApiVisitor, AvroVisitor, JSONSchemaToConcertoVisitor, OpenApiToConcertoVisitor, RustVisitor };
