#!/bin/bash
set -e

echo "Testing Java code generation..."

mkdir -p /test/output
cd /test/output

cat > test.cto << 'EOF'
namespace test@1.0.0

concept Person {
  o String name
  o Integer age
}
EOF

echo "Generated test CTO file:"
cat test.cto

cd /test
npm install

echo "Generating Java code..."
node -e "
const { CodeGen } = require('@accordproject/concerto-codegen');
const fs = require('fs');
const cto = fs.readFileSync('/test/output/test.cto', 'utf8');
const codeGen = new CodeGen(cto);
const javaCode = codeGen.generate('Java');
fs.writeFileSync('/test/output/Person.java', javaCode);
"

echo "Compiling generated Java code..."
cd /test/output
javac *.java

echo "Java code generation and compilation successful!"
ls -la *.class