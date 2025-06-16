import oxc from "oxc-parser";

const code = `
function hello(name: string): string {
  return "Hello, " + name + "!";
}

class Person {
  constructor(public name: string, public age: number) {}
  
  greet(): string {
    return \`Hi, I'm \${this.name} and I'm \${this.age} years old.\`;
  }
}

const result = hello("World");
console.log(result);
`;

console.log("=== Testing oxc-parser ===\n");

try {
  const filename = "test.ts";
  const result = oxc.parseSync(filename, code);

  console.log("Parse successful!");
  console.log("\nAST Program type:", result.program.type);
  console.log("Number of statements:", result.program.body.length);
  
  console.log("\n--- Statements ---");
  result.program.body.forEach((stmt, index) => {
    console.log(`${index + 1}. ${stmt.type}`);
    
    if (stmt.type === "FunctionDeclaration" && stmt.id) {
      console.log(`   Function name: ${stmt.id.name}`);
    } else if (stmt.type === "ClassDeclaration" && stmt.id) {
      console.log(`   Class name: ${stmt.id.name}`);
    } else if (stmt.type === "VariableDeclaration") {
      const firstDecl = stmt.declarations[0];
      if (firstDecl && firstDecl.id && firstDecl.id.type === "Identifier") {
        console.log(`   Variable: ${firstDecl.id.name}`);
      }
    }
  });

  console.log("\n--- Errors ---");
  console.log("Number of errors:", result.errors.length);
  
  if (result.errors.length > 0) {
    result.errors.forEach((error) => {
      console.log(`Error: ${error.message}`);
    });
  } else {
    console.log("No parsing errors found.");
  }

} catch (error) {
  console.error("Failed to parse:", error);
}