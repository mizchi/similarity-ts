import oxc from "oxc-parser";

const typeScriptCode = `
// TypeScript specific features
interface User {
  id: number;
  name: string;
  email?: string;
}

type Status = "active" | "inactive" | "pending";

enum Color {
  Red = "RED",
  Green = "GREEN",
  Blue = "BLUE"
}

function processUser<T extends User>(user: T): T & { processed: boolean } {
  return { ...user, processed: true };
}

const user: User = {
  id: 1,
  name: "Alice"
};

// Decorators (if supported)
@deprecated
class LegacyAPI {
  @readonly
  version = "1.0";
}

// Type assertions
const value = document.getElementById("app") as HTMLDivElement;
`;

console.log("=== Advanced oxc-parser Test ===\n");

const filename = "advanced.ts";
const result = oxc.parseSync(filename, typeScriptCode);

console.log("Parse successful!");
console.log("Number of errors:", result.errors.length);
console.log("Number of comments:", result.comments.length);

console.log("\n--- Detailed AST Analysis ---");

function analyzeNode(node: any, depth: number = 0): void {
  const indent = "  ".repeat(depth);
  
  if (node.type === "InterfaceDeclaration") {
    console.log(`${indent}Interface: ${node.id?.name}`);
    console.log(`${indent}  Properties: ${node.body?.body?.length || 0}`);
  }
  
  if (node.type === "TypeAliasDeclaration") {
    console.log(`${indent}Type Alias: ${node.id?.name}`);
  }
  
  if (node.type === "EnumDeclaration") {
    console.log(`${indent}Enum: ${node.id?.name}`);
    console.log(`${indent}  Members: ${node.members?.length || 0}`);
  }
  
  if (node.type === "FunctionDeclaration" && node.typeParameters) {
    console.log(`${indent}Generic Function: ${node.id?.name}`);
    console.log(`${indent}  Type Parameters: ${node.typeParameters.params?.length || 0}`);
  }
}

result.program.body.forEach((stmt: any) => {
  console.log(`\n${stmt.type}:`);
  analyzeNode(stmt, 1);
});

console.log("\n--- Comments ---");
result.comments.forEach((comment: any, index: number) => {
  console.log(`${index + 1}. ${comment.kind}: "${comment.value.trim()}"`);
});

console.log("\n--- Performance Test ---");
const largeCode = `
${Array.from({ length: 100 }, (_, i) => `
function func${i}(param${i}: string): number {
  return param${i}.length;
}
`).join("\n")}
`;

const startTime = performance.now();
const largeResult = oxc.parseSync("large.ts", largeCode);
const endTime = performance.now();

console.log(`Parsed ${largeResult.program.body.length} statements in ${(endTime - startTime).toFixed(2)}ms`);

console.log("\n--- Error Handling Test ---");
const errorCode = `
function broken( {
  // Missing closing brace
  return "error";
`;

const errorResult = oxc.parseSync("error.ts", errorCode);
console.log(`\nErrors found: ${errorResult.errors.length}`);
errorResult.errors.forEach((error: any) => {
  console.log(`- ${error.message}`);
});