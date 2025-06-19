import { extractFunctions, compareFunctions } from "../src/core/function_extractor.ts";
import { readFileSync } from "fs";

console.log("=== Analyzing visitNode pattern in similarity-ts ===\n");

// Files containing visitNode
const files = [
  "./src/core/function_body_comparer.ts",
  "./src/core/function_extractor.ts",
  "./src/core/semantic_normalizer.ts",
];

const visitNodeFunctions: Array<{
  function: ReturnType<typeof extractFunctions>[0];
  file: string;
  content: string;
}> = [];

// Extract visitNode functions
for (const file of files) {
  const content = readFileSync(file, "utf-8");
  const functions = extractFunctions(content);

  const visitNode = functions.find((f) => f.name === "visitNode");
  if (visitNode) {
    visitNodeFunctions.push({ function: visitNode, file, content });
    console.log(`Found visitNode in ${file}:`);
    console.log(`  Type: ${visitNode.type}`);
    console.log(`  Parameters: [${visitNode.parameters.join(", ")}]`);
    console.log(`  Body length: ${visitNode.body.length} chars`);
    console.log(`  Lines: ${visitNode.startLine}-${visitNode.endLine}`);
    console.log();
  }
}

// Compare all pairs
console.log("\n=== Comparing visitNode implementations ===\n");

for (let i = 0; i < visitNodeFunctions.length; i++) {
  for (let j = i + 1; j < visitNodeFunctions.length; j++) {
    const item1 = visitNodeFunctions[i];
    const item2 = visitNodeFunctions[j];

    console.log(`Comparing ${item1.file} vs ${item2.file}:`);

    const comparison = compareFunctions(item1.function, item2.function, {
      ignoreThis: true,
      ignoreParamNames: true,
    });

    console.log(`  Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
    console.log(`  Structurally equivalent: ${comparison.isStructurallyEquivalent}`);
    console.log(`  Parameter difference: ${comparison.differences.parameterNames}`);
    console.log();
  }
}

// Show actual code snippets
console.log("\n=== Code snippets (first 10 lines) ===\n");

visitNodeFunctions.forEach(({ function: func, file }) => {
  console.log(`${file}:`);
  console.log("```typescript");
  const lines = func.body.split("\n").slice(0, 10);
  lines.forEach((line) => console.log(line));
  if (func.body.split("\n").length > 10) {
    console.log("...");
  }
  console.log("```\n");
});

// Analyze pattern
console.log("\n=== Analysis ===\n");

console.log("All three visitNode functions follow a similar pattern:");
console.log("1. Check if node is valid (null/object check)");
console.log("2. Process current node based on its type");
console.log("3. Traverse children recursively");
console.log("4. Handle arrays and object properties");
console.log("\nThis is a classic visitor pattern implementation.");

// Suggest refactoring
console.log("\n=== Refactoring Suggestion ===\n");

console.log("These visitNode functions could be refactored into a generic AST visitor utility:");
console.log("\n```typescript");
console.log(`// src/core/ast_visitor.ts
export interface VisitorCallbacks {
  onNode?: (node: any, context?: any) => void;
  onFunctionDeclaration?: (node: any, context?: any) => void;
  onMethodDefinition?: (node: any, context?: any) => void;
  onVariableDeclarator?: (node: any, context?: any) => void;
  // ... other node types
}

export function visitAST(
  node: any,
  callbacks: VisitorCallbacks,
  context?: any
): void {
  if (!node || typeof node !== 'object') return;
  
  // Call general callback
  callbacks.onNode?.(node, context);
  
  // Call specific callback based on node type
  const typeCallback = callbacks[\`on\${node.type}\`];
  typeCallback?.(node, context);
  
  // Traverse children
  for (const key in node) {
    if (key === 'parent' || key === 'scope') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(v => visitAST(v, callbacks, context));
    } else if (value && typeof value === 'object') {
      visitAST(value, callbacks, context);
    }
  }
}`);
console.log("```");

console.log("\nThis would eliminate code duplication and provide a consistent API for AST traversal.");
