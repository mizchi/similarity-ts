// APTED (All Path Tree Edit Distance) algorithm implementation
import { astToString } from './ast.ts';
import { parseTypeScript } from '../parser.ts';
import { levenshtein } from './levenshtein.ts';

export interface TreeNode {
  label: string;
  value: string;
  children: TreeNode[];
  id: string;
  subtreeSize?: number;
}

export interface EditOperation {
  type: 'insert' | 'delete' | 'rename';
  node: TreeNode;
  cost: number;
}

export interface APTEDOptions {
  renameCost?: number;
}

/**
 * Get label from AST node
 */
export function getNodeLabel(node: any): string {
  if (!node || typeof node !== 'object') {
    return String(node);
  }

  if (node.type) {
    switch (node.type) {
      case 'Identifier':
        return node.name || 'Identifier';
      case 'Literal':
        return String(node.value);
      case 'StringLiteral':
        return `"${node.value}"`;
      case 'NumericLiteral':
        return String(node.value);
      case 'BooleanLiteral':
        return String(node.value);
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        return node.id?.name || 'Function';
      case 'VariableDeclarator':
        return node.id?.name || 'Variable';
      case 'ClassDeclaration':
        return node.id?.name || 'Class';
      case 'MethodDefinition':
        return node.key?.name || 'Method';
      default:
        return node.type;
    }
  }

  return 'Unknown';
}

/**
 * Get children from AST node
 */
export function getNodeChildren(node: any): any[] {
  if (!node || typeof node !== 'object') {
    return [];
  }

  const children: any[] = [];
  const skipKeys = new Set(['type', 'range', 'loc', 'span', 'start', 'end']);

  for (const [key, value] of Object.entries(node)) {
    if (skipKeys.has(key)) continue;

    if (Array.isArray(value)) {
      children.push(...value.filter(v => v && typeof v === 'object'));
    } else if (value && typeof value === 'object') {
      children.push(value);
    }
  }

  return children;
}

/**
 * Convert AST node to TreeNode structure
 */
export function oxcToTreeNode(node: any, idCounter = { value: 0 }): TreeNode {
  const label = getNodeLabel(node);
  const value = node.type || String(node);
  const children = getNodeChildren(node).map(child => oxcToTreeNode(child, idCounter));
  const id = `node_${idCounter.value++}`;

  return { label, value, children, id };
}

/**
 * Get node identifier
 */
export function getNodeId(node: TreeNode, index: number): string {
  return node.id || `${node.label}_${index}`;
}

/**
 * Calculate subtree size
 */
export function getSubtreeSize(node: TreeNode): number {
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
 * Compute optimal alignment cost between children
 */
export function computeChildrenAlignment(
  children1: TreeNode[],
  children2: TreeNode[],
  renameCost: number,
  memoizedResults: Map<string, number>
): number {
  const m = children1.length;
  const n = children2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const deleteCost = dp[i - 1][j] + 1;
      const insertCost = dp[i][j - 1] + 1;

      const child1 = children1[i - 1];
      const child2 = children2[j - 1];
      const editCost = computeEditDistance(child1, child2, renameCost, memoizedResults);
      const replaceCost = dp[i - 1][j - 1] + editCost;

      dp[i][j] = Math.min(deleteCost, insertCost, replaceCost);
    }
  }

  return dp[m][n];
}

/**
 * Compute tree edit distance
 */
export function computeEditDistance(
  tree1: TreeNode,
  tree2: TreeNode,
  renameCost: number,
  memoizedResults: Map<string, number>
): number {
  const key = `${tree1.id}:${tree2.id}`;
  if (memoizedResults.has(key)) {
    return memoizedResults.get(key)!;
  }

  let cost: number;

  if (tree1.children.length === 0 && tree2.children.length === 0) {
    cost = tree1.label === tree2.label ? 0 : renameCost;
  } else if (tree1.children.length === 0) {
    cost = getSubtreeSize(tree2);
  } else if (tree2.children.length === 0) {
    cost = getSubtreeSize(tree1);
  } else {
    const labelCost = tree1.label === tree2.label ? 0 : renameCost;
    const childrenCost = computeChildrenAlignment(
      tree1.children,
      tree2.children,
      renameCost,
      memoizedResults
    );
    cost = labelCost + childrenCost;
  }

  memoizedResults.set(key, cost);
  return cost;
}

/**
 * Count total nodes in tree
 */
export function countNodes(tree: TreeNode): number {
  let count = 1;
  for (const child of tree.children) {
    count += countNodes(child);
  }
  return count;
}

/**
 * Calculate TSED (Tree Structure Edit Distance) similarity
 */
export function calculateAPTEDSimilarity(
  tree1: TreeNode,
  tree2: TreeNode,
  options: APTEDOptions = {}
): number {
  const renameCost = options.renameCost ?? 1.0;
  const memoizedResults = new Map<string, number>();

  const distance = computeEditDistance(tree1, tree2, renameCost, memoizedResults);
  const maxNodes = Math.max(countNodes(tree1), countNodes(tree2));

  if (maxNodes === 0) return 1.0;
  return Math.max(0, 1 - (distance / maxNodes));
}

/**
 * Calculate similarity using APTED algorithm
 */
export function calculateSimilarityAPTED(
  code1: string,
  code2: string,
  options: APTEDOptions = {}
): number {
  try {
    const ast1 = parseTypeScript('file1.ts', code1);
    const ast2 = parseTypeScript('file2.ts', code2);

    const tree1 = oxcToTreeNode(ast1.program);
    const tree2 = oxcToTreeNode(ast2.program);

    return calculateAPTEDSimilarity(tree1, tree2, options);
  } catch (error) {
    return 0;
  }
}

/**
 * Compare structures using both Levenshtein and APTED
 */
export function compareStructuresAPTED(
  ast1: any,
  ast2: any,
  options: APTEDOptions = {}
): {
  similarity: number;
  distance: number;
  nodeCount: number;
  levenshteinSimilarity: number;
} {
  const tree1 = oxcToTreeNode(ast1);
  const tree2 = oxcToTreeNode(ast2);

  const memoizedResults = new Map<string, number>();
  const distance = computeEditDistance(
    tree1,
    tree2,
    options.renameCost ?? 1.0,
    memoizedResults
  );

  const nodeCount1 = countNodes(tree1);
  const nodeCount2 = countNodes(tree2);
  const maxNodes = Math.max(nodeCount1, nodeCount2);
  const similarity = maxNodes === 0 ? 1.0 : Math.max(0, 1 - (distance / maxNodes));

  // Also calculate Levenshtein similarity for comparison
  const str1 = astToString(ast1);
  const str2 = astToString(ast2);
  const levDistance = levenshtein(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const levenshteinSimilarity = maxLength === 0 ? 1.0 : 1 - (levDistance / maxLength);

  return {
    similarity,
    distance,
    nodeCount: maxNodes,
    levenshteinSimilarity
  };
}