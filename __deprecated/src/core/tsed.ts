// TSED (Tree Similarity of Edit Distance) implementation
// Based on "Revisiting Code Similarity Evaluation with Abstract Syntax Tree Edit Distance" paper

import type { ParseResult } from "oxc-parser";
import { computeEditDistance, countNodes, oxcToTreeNode } from "./apted.ts";
import type { APTEDOptions } from "./apted.ts";

/**
 * TSED options extending APTED options
 */
export interface TSEDOptions extends APTEDOptions {
  // Inherits renameCost, deleteCost, insertCost from APTEDOptions
}

/**
 * Calculate TSED (Tree Similarity of Edit Distance) between two ASTs
 *
 * TSED = max{1 - δ/MaxNodes(G1,G2), 0}
 *
 * Where:
 * - δ is the tree edit distance
 * - MaxNodes(G1,G2) is the maximum number of nodes between the two trees
 *
 * @param ast1 First parsed AST
 * @param ast2 Second parsed AST
 * @param options Optional configuration for operation costs
 * @returns TSED value between 0 and 1 (1 = identical, 0 = completely different)
 */
export function calculateTSED(ast1: ParseResult, ast2: ParseResult, options: TSEDOptions = {}): number {
  // Convert ASTs to tree structure
  const tree1 = oxcToTreeNode(ast1.program);
  const tree2 = oxcToTreeNode(ast2.program);

  // Calculate tree edit distance (δ)
  const distance = computeEditDistance(tree1, tree2, options);

  // Calculate maximum nodes between the two trees
  const maxNodes = Math.max(countNodes(tree1), countNodes(tree2));

  // Apply TSED normalization formula
  // TSED = max{1 - δ/MaxNodes(G1,G2), 0}
  return Math.max(1 - distance / maxNodes, 0);
}

/**
 * Calculate detailed TSED metrics between two ASTs
 *
 * @param ast1 First parsed AST
 * @param ast2 Second parsed AST
 * @param options Optional configuration for operation costs
 * @returns Object containing TSED value and additional metrics
 */
export function calculateTSEDWithMetrics(
  ast1: ParseResult,
  ast2: ParseResult,
  options: TSEDOptions = {},
): {
  tsed: number;
  editDistance: number;
  maxNodes: number;
  tree1Nodes: number;
  tree2Nodes: number;
} {
  // Convert ASTs to tree structure
  const tree1 = oxcToTreeNode(ast1.program);
  const tree2 = oxcToTreeNode(ast2.program);

  // Count nodes in each tree
  const tree1Nodes = countNodes(tree1);
  const tree2Nodes = countNodes(tree2);
  const maxNodes = Math.max(tree1Nodes, tree2Nodes);

  // Calculate tree edit distance
  const editDistance = computeEditDistance(tree1, tree2, options);

  // Apply TSED formula
  const tsed = Math.max(1 - editDistance / maxNodes, 0);

  return {
    tsed,
    editDistance,
    maxNodes,
    tree1Nodes,
    tree2Nodes,
  };
}

/**
 * Default TSED options based on paper recommendations
 */
export const DEFAULT_TSED_OPTIONS: TSEDOptions = {
  renameCost: 1.0,
  deleteCost: 1.0,
  insertCost: 0.8, // Paper suggests 0.8 for insert operations
};

/**
 * Optimized TSED options for detecting code refactoring
 * Lower rename cost to detect renamed variables/functions
 */
export const REFACTORING_TSED_OPTIONS: TSEDOptions = {
  renameCost: 0.3, // Lower cost for renames
  deleteCost: 1.0,
  insertCost: 1.0,
};
