import { CodeSimilarity } from "../src/index.ts";

function main() {
  const similarity = new CodeSimilarity();

  // Example 1: Similar functions with minor differences
  const code1 = `
function add(a: number, b: number): number {
  return a + b;
}`;

  const code2 = `
function sum(x: number, y: number): number {
  return x + y;
}`;

  console.log("=== Example 1: Similar functions ===");
  const score1 = similarity.calculateSimilarity(code1, code2);
  console.log(`Similarity score: ${score1.toFixed(4)}`);

  const report1 = similarity.getDetailedReport(code1, code2);
  console.log("Detailed report:", report1);

  // Example 2: Identical code
  const code3 = `
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}`;

  console.log("\n=== Example 2: Identical code ===");
  const score2 = similarity.calculateSimilarity(code3, code3);
  console.log(`Similarity score: ${score2.toFixed(4)} (should be 1.0)`);

  // Example 3: Very different code
  const code4 = `
interface User {
  id: number;
  name: string;
}`;

  console.log("\n=== Example 3: Different code structures ===");
  const score3 = similarity.calculateSimilarity(code3, code4);
  console.log(`Similarity score: ${score3.toFixed(4)}`);

  // Example 4: Parse AST
  console.log("\n=== Example 4: AST Structure ===");
  const ast = similarity.parse(code1);
  console.log("AST for code1:");
  console.log(JSON.stringify(ast.program, null, 2).substring(0, 500) + "...");
}

// Run the examples
main();
