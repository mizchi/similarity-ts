// APTED (All Path Tree Edit Distance) algorithm implementation with proper types
import { astToString } from "./ast.ts";
import { parseTypeScript } from "../parser.ts";
import { levenshtein } from "./levenshtein.ts";
import type { ASTNode, Program, NumericLiteral, StringLiteral, BooleanLiteral } from "./oxc_types.ts";
import { isIdentifier, isFunctionDeclaration, isClassDeclaration, isVariableDeclarator } from "./oxc_types.ts";
import type { ParseResult } from "oxc-parser";

interface TreeNode {
  label: string;
  value: string;
  children: TreeNode[];
  id: string;
  subtreeSize?: number;
}

export interface APTEDOptions {
  renameCost?: number;
  deleteCost?: number;
  insertCost?: number;
}

/**
 * Get label from AST node with proper type checking
 */
function getNodeLabel(node: ASTNode | any): string {
  if (!node || typeof node !== "object") {
    return String(node);
  }

  // Type-specific handling
  if (isIdentifier(node)) {
    return node.name || "Identifier";
  }

  if (isFunctionDeclaration(node)) {
    return (node as any).id?.name || "Function";
  }

  if (isClassDeclaration(node)) {
    return (node as any).id?.name || "Class";
  }

  if (isVariableDeclarator(node)) {
    const varNode = node as any;
    return varNode.id && isIdentifier(varNode.id) ? varNode.id.name : "Variable";
  }

  // Handle literals
  const anyNode = node as any;
  switch (anyNode.type) {
    case "StringLiteral":
      return `"${(anyNode as StringLiteral).value}"`;
    case "NumericLiteral":
      return String((anyNode as NumericLiteral).value);
    case "BooleanLiteral":
      return String((anyNode as BooleanLiteral).value);
    case "NullLiteral":
      return "null";
    case "MethodDefinition":
      return anyNode.key?.name || "Method";
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      return anyNode.id?.name || "Function";
    case "ClassExpression":
      return anyNode.id?.name || "Class";
    default:
      return anyNode.type || "Unknown";
  }
}

/**
 * Get children from AST node with proper type handling
 */
function getNodeChildren(node: ASTNode | any): (ASTNode | any)[] {
  if (!node || typeof node !== "object") {
    return [];
  }

  const children: (ASTNode | any)[] = [];
  const skipKeys = new Set(["type", "range", "loc", "span", "start", "end"]);

  // Special handling for Program nodes
  if (node.type === "Program") {
    const program = node as Program;
    children.push(...program.body);
    if (program.hashbang) {
      children.push(program.hashbang);
    }
    return children;
  }

  // Generic traversal for other node types
  for (const [key, value] of Object.entries(node)) {
    if (skipKeys.has(key)) continue;

    if (Array.isArray(value)) {
      children.push(...value.filter((v) => v && typeof v === "object"));
    } else if (value && typeof value === "object") {
      children.push(value);
    }
  }

  return children;
}

/**
 * Convert AST node to TreeNode structure
 *
 * TODO: This implementation has severe memory leak issues when processing large ASTs.
 * The recursive conversion creates a huge number of TreeNode objects that are not
 * properly garbage collected. This causes out-of-memory errors even with small files.
 * Needs to be refactored to use an iterative approach or streaming processing.
 *
 * See: https://github.com/your-repo/issues/XXX
 */
export function oxcToTreeNode(node: ASTNode | any, idCounter = { value: 0 }): TreeNode {
  const label = getNodeLabel(node);
  const value = node.type || String(node);
  const children = getNodeChildren(node).map((child) => oxcToTreeNode(child, idCounter));
  const id = `node_${idCounter.value++}`;

  return { label, value, children, id };
}

/**
 * Get subtree size (number of nodes in subtree)
 */
function getSubtreeSize(node: TreeNode): number {
  if (node.subtreeSize !== undefined) {
    return node.subtreeSize;
  }

  let size = 1;
  for (const child of node.children) {
    size += getSubtreeSize(child);
  }

  node.subtreeSize = size;
  return size;
}

/**
 * Compute optimal alignment between children of two nodes
 */
function computeChildrenAlignment(
  node1Children: TreeNode[],
  node2Children: TreeNode[],
  costMatrix: Map<string, Map<string, number>>,
  options: APTEDOptions = {},
): [number, Map<TreeNode, TreeNode | null>] {
  const m = node1Children.length;
  const n = node2Children.length;

  // dp[i][j] = minimum cost to align first i children of node1 with first j children of node2
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  const { deleteCost = 1, insertCost = 1 } = options;

  // Initialize base cases
  for (let i = 1; i <= m; i++) {
    dp[i][0] = dp[i - 1][0] + deleteCost * getSubtreeSize(node1Children[i - 1]);
  }
  for (let j = 1; j <= n; j++) {
    dp[0][j] = dp[0][j - 1] + insertCost * getSubtreeSize(node2Children[j - 1]);
  }

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const child1 = node1Children[i - 1];
      const child2 = node2Children[j - 1];
      const editCost = costMatrix.get(child1.id)?.get(child2.id) || 0;

      dp[i][j] = Math.min(
        dp[i - 1][j] + deleteCost * getSubtreeSize(child1), // Delete child1
        dp[i][j - 1] + insertCost * getSubtreeSize(child2), // Insert child2
        dp[i - 1][j - 1] + editCost, // Match/Edit child1 to child2
      );
    }
  }

  // Backtrack to find alignment
  const alignment = new Map<TreeNode, TreeNode | null>();
  let i = m,
    j = n;

  while (i > 0 || j > 0) {
    if (i === 0) {
      j--;
    } else if (j === 0) {
      alignment.set(node1Children[i - 1], null);
      i--;
    } else {
      const child1 = node1Children[i - 1];
      const child2 = node2Children[j - 1];
      const editCost = costMatrix.get(child1.id)?.get(child2.id) || 0;

      const deleteNodeCost = dp[i - 1][j] + deleteCost * getSubtreeSize(child1);
      const insertNodeCost = dp[i][j - 1] + insertCost * getSubtreeSize(child2);
      const matchCost = dp[i - 1][j - 1] + editCost;

      if (matchCost <= deleteNodeCost && matchCost <= insertNodeCost) {
        alignment.set(child1, child2);
        i--;
        j--;
      } else if (deleteNodeCost <= insertNodeCost) {
        alignment.set(child1, null);
        i--;
      } else {
        j--;
      }
    }
  }

  return [dp[m][n], alignment];
}

/**
 * Compute edit distance between two trees
 *
 * TODO: This implementation has severe memory usage issues:
 * 1. The memoization Map grows unbounded for large trees
 * 2. The computeChildrenAlignment creates m×n matrices which can be huge
 * 3. The recursive nature holds many intermediate results in memory
 *
 * This causes out-of-memory errors even for moderately sized files (< 1KB).
 * Needs complete rewrite with:
 * - Bounded memoization (LRU cache)
 * - Streaming/iterative processing
 * - Memory-efficient alignment algorithm
 *
 * Current workaround: Use file size limits before calling APTED functions
 */
export function computeEditDistance(tree1: TreeNode, tree2: TreeNode, options: APTEDOptions = {}): number {
  const { renameCost = 1, deleteCost = 1, insertCost = 1 } = options;

  // Memoization for subtree edit distances
  const memo = new Map<string, Map<string, number>>();

  function getOrCompute(node1: TreeNode, node2: TreeNode): number {
    if (!memo.has(node1.id)) {
      memo.set(node1.id, new Map());
    }

    const node1Memo = memo.get(node1.id)!;
    if (node1Memo.has(node2.id)) {
      return node1Memo.get(node2.id)!;
    }

    // Base cases
    if (node1.children.length === 0 && node2.children.length === 0) {
      // Both are leaves
      const cost = node1.label === node2.label ? 0 : renameCost;
      node1Memo.set(node2.id, cost);
      return cost;
    }

    // Calculate costs for all three operations
    const deleteAllCost = deleteCost * getSubtreeSize(node1);
    const insertAllCost = insertCost * getSubtreeSize(node2);

    // Calculate rename + optimal children alignment
    let renamePlusCost = node1.label === node2.label ? 0 : renameCost;

    if (node1.children.length > 0 || node2.children.length > 0) {
      // First compute all pairwise costs between children
      const childCostMatrix = new Map<string, Map<string, number>>();
      for (const child1 of node1.children) {
        childCostMatrix.set(child1.id, new Map());
        for (const child2 of node2.children) {
          const cost = getOrCompute(child1, child2);
          childCostMatrix.get(child1.id)!.set(child2.id, cost);
        }
      }

      // Find optimal alignment
      const [alignmentCost] = computeChildrenAlignment(node1.children, node2.children, childCostMatrix, options);

      renamePlusCost += alignmentCost;
    }

    const minCost = Math.min(deleteAllCost, insertAllCost, renamePlusCost);
    node1Memo.set(node2.id, minCost);
    return minCost;
  }

  return getOrCompute(tree1, tree2);
}

/**
 * Count total nodes in tree
 */
export function countNodes(node: TreeNode): number {
  return getSubtreeSize(node);
}

/**
 * Calculate APTED similarity from pre-parsed ASTs
 * @deprecated Use calculateTSED from tsed.ts instead
 */
export function calculateAPTEDSimilarityFromAST(
  ast1: ParseResult,
  ast2: ParseResult,
  options: APTEDOptions = {},
): number {
  const tree1 = oxcToTreeNode(ast1.program);
  const tree2 = oxcToTreeNode(ast2.program);

  const distance = computeEditDistance(tree1, tree2, options);
  const maxNodes = Math.max(countNodes(tree1), countNodes(tree2));

  // Normalize to 0-1 range using TSED formula
  return Math.max(1 - distance / maxNodes, 0);
}

/**
 * Compare structures using APTED algorithm with typed AST nodes
 */
/**
 * Calculate APTED similarity from code strings
 */
export function calculateAPTEDSimilarity(code1: string, code2: string, options: APTEDOptions = {}): number {
  const ast1 = parseTypeScript("file1.ts", code1);
  const ast2 = parseTypeScript("file2.ts", code2);
  return calculateAPTEDSimilarityFromAST(ast1, ast2, options);
}

/**
 * Compare structures using APTED algorithm with typed AST nodes
 */
export function compareStructuresAPTED(
  ast1: Program,
  ast2: Program,
  options: APTEDOptions = {},
): {
  similarity: number;
  levenshteinSimilarity: number;
  distance: number;
  maxNodes: number;
} {
  const str1 = astToString(ast1);
  const str2 = astToString(ast2);

  const levDistance = levenshtein(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const levenshteinSimilarity = maxLength === 0 ? 1.0 : 1 - levDistance / maxLength;

  const tree1 = oxcToTreeNode(ast1);
  const tree2 = oxcToTreeNode(ast2);

  const distance = computeEditDistance(tree1, tree2, options);
  const maxNodes = Math.max(countNodes(tree1), countNodes(tree2));
  const similarity = Math.max(1 - distance / maxNodes, 0);

  return {
    similarity,
    levenshteinSimilarity,
    distance,
    maxNodes,
  };
}
