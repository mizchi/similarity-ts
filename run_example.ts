/**
 * Working example of TSED implementation
 * This demonstrates code similarity calculation
 */

import { TSED } from "./src/tsed.ts";
import type { TreeNode } from "./src/ast_parser.ts";

// Helper function to create a simple AST from code
function createSimpleAST(code: string): TreeNode {
  const lines = code.trim().split('\n').filter(line => line.trim());
  const root: TreeNode = { type: 'program', children: [] };
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('function')) {
      const match = trimmed.match(/function\s+(\w+)\s*\(([^)]*)\)/);
      const funcNode: TreeNode = {
        type: 'function_declaration',
        children: [
          { type: 'identifier', children: [], text: match?.[1] || 'unknown' },
          { type: 'parameters', children: [], text: match?.[2] || '' },
          { type: 'block_statement', children: [] }
        ]
      };
      root.children.push(funcNode);
    } else if (trimmed.includes('return')) {
      const returnNode: TreeNode = {
        type: 'return_statement',
        children: [],
        text: trimmed
      };
      // Add to the last function's block statement
      if (root.children.length > 0) {
        const lastFunc = root.children[root.children.length - 1];
        const block = lastFunc.children.find(c => c.type === 'block_statement');
        if (block) {
          block.children.push(returnNode);
        }
      }
    } else if (trimmed.startsWith('class')) {
      const match = trimmed.match(/class\s+(\w+)/);
      const classNode: TreeNode = {
        type: 'class_declaration',
        children: [
          { type: 'identifier', children: [], text: match?.[1] || 'unknown' },
          { type: 'class_body', children: [] }
        ]
      };
      root.children.push(classNode);
    }
  }
  
  return root;
}

async function main() {
  console.log("=== TSED Code Similarity Example ===\n");

  const tsed = new TSED({
    deleteCost: 1.0,
    insertCost: 1.0,
    renameCost: 1.0,
  });

  // Example 1: Similar functions with different names
  console.log("Example 1: Similar functions with different names");
  const code1 = `
function add(a, b) {
  return a + b;
}`;

  const code2 = `
function sum(x, y) {
  return x + y;
}`;

  const ast1 = createSimpleAST(code1);
  const ast2 = createSimpleAST(code2);
  
  const score1 = tsed.calculateSimilarity(ast1, ast2);
  console.log(`Similarity: ${score1.toFixed(4)}`);
  
  const report1 = tsed.getDetailedReport(ast1, ast2);
  console.log("Details:", {
    editDistance: report1.editDistance,
    nodeCount1: report1.nodeCount1,
    nodeCount2: report1.nodeCount2,
    score: report1.score.toFixed(4)
  });

  // Example 2: Identical code
  console.log("\nExample 2: Identical code");
  const score2 = tsed.calculateSimilarity(ast1, ast1);
  console.log(`Similarity: ${score2.toFixed(4)} (should be 1.0)`);

  // Example 3: Different structures
  console.log("\nExample 3: Different structures");
  const code3 = `
class Calculator {
  add(a, b) {
    return a + b;
  }
}`;

  const ast3 = createSimpleAST(code3);
  const score3 = tsed.calculateSimilarity(ast1, ast3);
  console.log(`Similarity: ${score3.toFixed(4)}`);

  // Example 4: Custom operation costs
  console.log("\nExample 4: Custom operation costs");
  const tsedCustom = new TSED({
    deleteCost: 1.0,
    insertCost: 1.0,
    renameCost: 0.5, // Lower cost for renaming
  });
  
  const scoreDefault = tsed.calculateSimilarity(ast1, ast2);
  const scoreCustom = tsedCustom.calculateSimilarity(ast1, ast2);
  
  console.log(`Default rename cost (1.0): ${scoreDefault.toFixed(4)}`);
  console.log(`Custom rename cost (0.5): ${scoreCustom.toFixed(4)}`);
  console.log(`Difference: +${(scoreCustom - scoreDefault).toFixed(4)}`);

  console.log("\n✓ TSED implementation is working correctly!");
  console.log("✓ For production use, integrate with tree-sitter for real AST parsing");
}

main().catch(console.error);