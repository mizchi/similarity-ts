import { readFileSync } from "fs";

console.log("=== Detailed Analysis of visitNode Duplication ===\n");

// Read the three files
const files = [
  {
    path: "./src/core/function_extractor.ts",
    name: "function_extractor.ts",
  },
  {
    path: "./src/core/function_body_comparer.ts",
    name: "function_body_comparer.ts",
  },
  {
    path: "./src/core/semantic_normalizer.ts",
    name: "semantic_normalizer.ts",
  },
];

// Extract visitNode implementations
const visitNodeImplementations: Array<{
  file: string;
  startLine: number;
  endLine: number;
  code: string;
  features: string[];
}> = [];

files.forEach(({ path, name }) => {
  const content = readFileSync(path, "utf-8");
  const lines = content.split("\n");

  // Find visitNode function
  let inVisitNode = false;
  let braceCount = 0;
  let startLine = -1;
  let endLine = -1;
  let visitNodeCode: string[] = [];

  lines.forEach((line, index) => {
    if (line.includes("function visitNode")) {
      inVisitNode = true;
      startLine = index + 1;
      visitNodeCode = [line];
      braceCount = 0;
    }

    if (inVisitNode) {
      if (line.includes("{")) braceCount += (line.match(/{/g) || []).length;
      if (line.includes("}")) braceCount -= (line.match(/}/g) || []).length;

      if (braceCount === 0 && startLine !== index + 1) {
        endLine = index + 1;
        inVisitNode = false;
      } else if (index > startLine - 1) {
        visitNodeCode.push(line);
      }
    }
  });

  if (startLine !== -1) {
    const code = visitNodeCode.join("\n");

    // Analyze features
    const features: string[] = [];

    // Common pattern checks
    if (code.includes("if (!node || typeof node !== 'object')")) features.push("null check");
    if (code.includes("for (const key in node)")) features.push("for-in traversal");
    if (code.includes("if (key === 'parent' || key === 'scope')")) features.push("skip parent/scope");
    if (code.includes("Array.isArray(value)")) features.push("array handling");
    if (code.includes(".forEach")) features.push("forEach traversal");

    // Node type checks
    if (code.includes("FunctionDeclaration")) features.push("handles FunctionDeclaration");
    if (code.includes("MethodDefinition")) features.push("handles MethodDefinition");
    if (code.includes("VariableDeclarator")) features.push("handles VariableDeclarator");
    if (code.includes("ClassDeclaration")) features.push("handles ClassDeclaration");
    if (code.includes("MemberExpression")) features.push("handles MemberExpression");
    if (code.includes("ArrowFunctionExpression")) features.push("handles ArrowFunctionExpression");

    // Parameters
    const paramMatch = code.match(/function visitNode\((.*?)\)/);
    if (paramMatch) {
      const params = paramMatch[1].split(",").map((p) => p.trim());
      features.push(`params: ${params.join(", ")}`);
    }

    visitNodeImplementations.push({
      file: name,
      startLine,
      endLine,
      code,
      features,
    });
  }
});

// Display analysis
console.log("Found visitNode in", visitNodeImplementations.length, "files:\n");

visitNodeImplementations.forEach((impl) => {
  console.log(`${impl.file}:`);
  console.log(`  Lines: ${impl.startLine}-${impl.endLine} (${impl.endLine - impl.startLine + 1} lines)`);
  console.log(`  Features:`);
  impl.features.forEach((feature) => {
    console.log(`    - ${feature}`);
  });
  console.log();
});

// Common features analysis
console.log("=== Common Patterns ===\n");

const allFeatures = new Set<string>();
visitNodeImplementations.forEach((impl) => {
  impl.features.forEach((f) => allFeatures.add(f));
});

const commonFeatures = Array.from(allFeatures).filter((feature) => {
  return visitNodeImplementations.every((impl) => impl.features.includes(feature));
});

console.log("Features common to ALL implementations:");
commonFeatures.forEach((feature) => {
  console.log(`  ✓ ${feature}`);
});

console.log("\n=== Differences ===\n");

visitNodeImplementations.forEach((impl) => {
  const uniqueFeatures = impl.features.filter((f) => !commonFeatures.includes(f) && !f.startsWith("params:"));

  if (uniqueFeatures.length > 0) {
    console.log(`${impl.file} unique features:`);
    uniqueFeatures.forEach((f) => console.log(`  - ${f}`));
    console.log();
  }
});

// Refactoring impact
console.log("=== Refactoring Impact ===\n");

const totalLines = visitNodeImplementations.reduce((sum, impl) => sum + (impl.endLine - impl.startLine + 1), 0);

console.log(`Total lines of duplicated code: ${totalLines}`);
console.log(`Estimated lines after refactoring: ~50-60 (shared traversal + specific handlers)`);
console.log(`Code reduction: ~${totalLines - 60} lines (${Math.round(((totalLines - 60) / totalLines) * 100)}%)`);

console.log("\n=== Recommended Refactoring Structure ===\n");
console.log("```typescript");
console.log(`// ast_traversal.ts (shared module)
export function traverseAST<T>(
  node: any,
  handlers: NodeHandlers<T>,
  state: T,
  parentContext?: any
): void {
  if (!node || typeof node !== 'object') return;
  
  // Common node processing
  handlers.enter?.(node, state, parentContext);
  
  // Specific node type handling
  const handler = handlers[node.type];
  if (handler) {
    handler(node, state, parentContext);
  }
  
  // Common traversal logic (extracted from all three files)
  for (const key in node) {
    if (key === 'parent' || key === 'scope') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(v => traverseAST(v, handlers, state, node));
    } else if (value && typeof value === 'object') {
      traverseAST(value, handlers, state, node);
    }
  }
  
  handlers.leave?.(node, state, parentContext);
}`);
console.log("```");
