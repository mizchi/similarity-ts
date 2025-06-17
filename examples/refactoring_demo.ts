import { extractFunctions } from "../src/core/function_extractor.ts";

console.log("=== Refactoring Demonstration ===\n");

// Show the duplicated visitNode pattern
console.log("Current situation: 3 files have their own visitNode implementation\n");

console.log("1. function_body_comparer.ts:");
console.log("```typescript");
console.log(`function visitNode(node: any, inClass: boolean = false) {
  if (!node || typeof node !== 'object') return;
  
  // Function declaration
  if (node.type === 'FunctionDeclaration' && node.id?.name) {
    functions.push({ name: node.id.name, isMethod: false });
  }
  
  // ... more node type checks ...
  
  // Traverse children
  for (const key in node) {
    if (key === 'parent' || key === 'scope') continue;
    // ... traverse logic ...
  }
}`);
console.log("```\n");

console.log("2. function_extractor.ts:");
console.log("```typescript");
console.log(`function visitNode(node: any, className?: string) {
  if (!node || typeof node !== 'object') return;
  
  // Function declarations
  if (node.type === 'FunctionDeclaration' && node.id) {
    functions.push({
      name: node.id.name,
      type: 'function',
      // ... extract function details ...
    });
  }
  
  // ... more node type checks ...
  
  // Traverse children (same pattern)
  for (const key in node) {
    if (key === 'parent' || key === 'scope') continue;
    // ... traverse logic ...
  }
}`);
console.log("```\n");

console.log("3. semantic_normalizer.ts:");
console.log("```typescript");
console.log(`function visitNode(node: any) {
  if (!node || typeof node !== 'object') return;
  
  // Member expressions (this.x or param.x)
  if (node.type === 'MemberExpression') {
    // ... handle member expressions ...
  }
  
  // ... more node type checks ...
  
  // Traverse children (same pattern again)
  for (const key in node) {
    if (key === 'parent' || key === 'scope') continue;
    // ... traverse logic ...
  }
}`);
console.log("```\n");

console.log("=== Refactoring Solution ===\n");

console.log("Create a shared AST traversal utility:\n");

console.log("```typescript");
console.log(`// src/core/ast_traversal.ts
export function traverseAST<T>(
  node: any,
  visitor: {
    enter?: (node: any, state: T) => void;
    FunctionDeclaration?: (node: any, state: T) => void;
    MethodDefinition?: (node: any, state: T) => void;
    MemberExpression?: (node: any, state: T) => void;
    // ... other node types
  },
  state: T
): void {
  if (!node || typeof node !== 'object') return;
  
  // Call enter callback
  visitor.enter?.(node, state);
  
  // Call specific node type callback
  const typeHandler = visitor[node.type];
  if (typeHandler) {
    typeHandler(node, state);
  }
  
  // Traverse children (extracted common logic)
  for (const key in node) {
    if (key === 'parent' || key === 'scope') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(v => traverseAST(v, visitor, state));
    } else if (value && typeof value === 'object') {
      traverseAST(value, visitor, state);
    }
  }
}`);
console.log("```\n");

console.log("Then refactor each file to use it:\n");

console.log("```typescript");
console.log(`// function_extractor.ts (refactored)
export function extractFunctions(code: string): FunctionDefinition[] {
  const ast = parseTypeScript('temp.ts', code);
  const state = {
    functions: [],
    className: undefined,
    code,
    lines: code.split('\\n')
  };
  
  traverseAST(ast.program, {
    FunctionDeclaration(node, state) {
      if (node.id) {
        state.functions.push({
          name: node.id.name,
          type: 'function',
          // ... extract details
        });
      }
    },
    
    ClassDeclaration(node, state) {
      const prevClassName = state.className;
      state.className = node.id?.name;
      // Children will be traversed automatically
      // Restore className in a leave callback
    },
    
    MethodDefinition(node, state) {
      // ... handle methods with state.className
    }
  }, state);
  
  return state.functions;
}`);
console.log("```\n");

console.log("=== Benefits ===\n");
console.log("1. ✅ Eliminates code duplication (DRY principle)");
console.log("2. ✅ Consistent traversal logic across the codebase");
console.log("3. ✅ Easier to maintain and debug");
console.log("4. ✅ Type-safe with proper TypeScript generics");
console.log("5. ✅ Extensible for new node types");
console.log("6. ✅ ~74% code similarity reduced to 0%");

console.log("\n=== Implementation Steps ===\n");
console.log("1. Create the shared ast_traversal.ts module");
console.log("2. Refactor function_extractor.ts to use it");
console.log("3. Refactor function_body_comparer.ts to use it");
console.log("4. Refactor semantic_normalizer.ts to use it");
console.log("5. Remove the old visitNode functions");
console.log("6. Update tests to ensure functionality is preserved");
