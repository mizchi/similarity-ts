/**
 * APTED (All Path Tree Edit Distance) implementation for oxc-parser AST
 * Based on Pawlik & Augsten (2015, 2016)
 */

import { OxcNode } from './oxc_similarity.ts';

export interface TreeNode {
  label: string;
  children: TreeNode[];
  parent?: TreeNode;
  index: number;
}

export interface EditOperation {
  type: 'delete' | 'insert' | 'rename';
  cost: number;
}

export interface APTEDConfig {
  deleteCost: number;
  insertCost: number;
  renameCost: number;
}

const DEFAULT_CONFIG: APTEDConfig = {
  deleteCost: 1.0,
  insertCost: 1.0,
  renameCost: 1.0,
};

/**
 * Convert oxc AST node to TreeNode structure
 */
export function oxcToTreeNode(node: OxcNode, parent?: TreeNode, index = 0): TreeNode {
  const treeNode: TreeNode = {
    label: getNodeLabel(node),
    children: [],
    parent,
    index,
  };

  const children = getNodeChildren(node);
  treeNode.children = children.map((child, idx) => oxcToTreeNode(child, treeNode, idx));

  return treeNode;
}

function getNodeLabel(node: OxcNode): string {
  let label = node.type;

  // Add identifier names for better comparison
  if (node.id?.name) {
    label += `:${node.id.name}`;
  } else if (node.name && typeof node.name === 'string') {
    label += `:${node.name}`;
  } else if (node.value !== undefined && typeof node.value !== 'object') {
    label += `:${node.value}`;
  }

  return label;
}

function getNodeChildren(node: OxcNode): OxcNode[] {
  const children: OxcNode[] = [];
  const visited = new WeakSet();

  function collectChildren(obj: any): void {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
    visited.add(obj);

    if (obj.type && obj !== node) {
      children.push(obj);
      return; // Don't traverse into child nodes
    }

    for (const key in obj) {
      if (key === 'parent' || key === 'scope' || key === 'type') continue;
      
      const value = obj[key];
      if (Array.isArray(value)) {
        value.forEach(collectChildren);
      } else if (value && typeof value === 'object') {
        collectChildren(value);
      }
    }
  }

  for (const key in node) {
    if (key === 'parent' || key === 'scope' || key === 'type') continue;
    const value = node[key];
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach(collectChildren);
      } else {
        collectChildren(value);
      }
    }
  }

  return children;
}

/**
 * APTED algorithm implementation
 */
export class APTED {
  private config: APTEDConfig;

  constructor(config?: Partial<APTEDConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate tree edit distance between two trees using simplified APTED
   */
  computeEditDistance(tree1: TreeNode, tree2: TreeNode): number {
    const memo = new Map<string, number>();
    
    const computeTreeDist = (node1: TreeNode | null, node2: TreeNode | null): number => {
      if (!node1 && !node2) return 0;
      if (!node1) return this.getSubtreeSize(node2!) * this.config.insertCost;
      if (!node2) return this.getSubtreeSize(node1) * this.config.deleteCost;
      
      const key = `${this.getNodeId(node1)}-${this.getNodeId(node2)}`;
      if (memo.has(key)) return memo.get(key)!;
      
      // If labels match and same number of children, try to match children
      if (node1.label === node2.label && node1.children.length === node2.children.length) {
        let childDist = 0;
        for (let i = 0; i < node1.children.length; i++) {
          childDist += computeTreeDist(node1.children[i], node2.children[i]);
        }
        memo.set(key, childDist);
        return childDist;
      }
      
      // Compute costs for different operations
      const costs: number[] = [];
      
      // Delete node1
      costs.push(this.config.deleteCost + computeTreeDist(null, node2));
      
      // Insert node2
      costs.push(this.config.insertCost + computeTreeDist(node1, null));
      
      // Rename node1 to node2 (if allowed)
      if (this.canRename(node1, node2)) {
        const renameCost = node1.label === node2.label ? 0 : this.config.renameCost;
        
        // Try all possible alignments of children
        const childCosts = this.computeChildrenAlignment(node1.children, node2.children);
        costs.push(renameCost + childCosts);
      }
      
      const minCost = Math.min(...costs);
      memo.set(key, minCost);
      return minCost;
    };
    
    return computeTreeDist(tree1, tree2);
  }
  
  /**
   * Compute optimal alignment cost between two sets of children
   */
  private computeChildrenAlignment(children1: TreeNode[], children2: TreeNode[]): number {
    const n1 = children1.length;
    const n2 = children2.length;
    
    if (n1 === 0 && n2 === 0) return 0;
    if (n1 === 0) return children2.reduce((sum, child) => sum + this.getSubtreeSize(child) * this.config.insertCost, 0);
    if (n2 === 0) return children1.reduce((sum, child) => sum + this.getSubtreeSize(child) * this.config.deleteCost, 0);
    
    // Dynamic programming for optimal alignment
    const dp: number[][] = Array(n1 + 1).fill(null).map(() => Array(n2 + 1).fill(Infinity));
    
    // Base cases
    dp[0][0] = 0;
    for (let i = 1; i <= n1; i++) {
      dp[i][0] = dp[i-1][0] + this.getSubtreeSize(children1[i-1]) * this.config.deleteCost;
    }
    for (let j = 1; j <= n2; j++) {
      dp[0][j] = dp[0][j-1] + this.getSubtreeSize(children2[j-1]) * this.config.insertCost;
    }
    
    // Fill the matrix
    for (let i = 1; i <= n1; i++) {
      for (let j = 1; j <= n2; j++) {
        // Delete child from tree1
        dp[i][j] = Math.min(dp[i][j], dp[i-1][j] + this.getSubtreeSize(children1[i-1]) * this.config.deleteCost);
        
        // Insert child from tree2
        dp[i][j] = Math.min(dp[i][j], dp[i][j-1] + this.getSubtreeSize(children2[j-1]) * this.config.insertCost);
        
        // Match children
        const matchCost = this.computeEditDistance(children1[i-1], children2[j-1]);
        dp[i][j] = Math.min(dp[i][j], dp[i-1][j-1] + matchCost);
      }
    }
    
    return dp[n1][n2];
  }
  
  /**
   * Get unique identifier for a node (for memoization)
   */
  private getNodeId(node: TreeNode): string {
    const path: number[] = [];
    let current: TreeNode | undefined = node;
    while (current) {
      path.unshift(current.index);
      current = current.parent;
    }
    return path.join('-');
  }
  
  /**
   * Get the size of a subtree
   */
  private getSubtreeSize(node: TreeNode): number {
    let size = 1;
    for (const child of node.children) {
      size += this.getSubtreeSize(child);
    }
    return size;
  }

  /**
   * Check if two nodes can be renamed (must have same structure)
   */
  private canRename(node1: TreeNode, node2: TreeNode): boolean {
    // In simplified APTED, we allow renaming between any nodes
    // More sophisticated implementations might check structural compatibility
    return true;
  }

  /**
   * Get all nodes in post-order traversal
   */
  private getPostOrderNodes(root: TreeNode): TreeNode[] {
    const nodes: TreeNode[] = [];

    function traverse(node: TreeNode): void {
      for (const child of node.children) {
        traverse(child);
      }
      nodes.push(node);
    }

    traverse(root);
    return nodes;
  }

  /**
   * Count total nodes in tree
   */
  private countNodes(root: TreeNode): number {
    let count = 1;
    for (const child of root.children) {
      count += this.countNodes(child);
    }
    return count;
  }

  /**
   * Calculate TSED similarity score
   */
  calculateSimilarity(tree1: TreeNode, tree2: TreeNode): number {
    const distance = this.computeEditDistance(tree1, tree2);
    const maxNodes = Math.max(this.countNodes(tree1), this.countNodes(tree2));
    
    if (maxNodes === 0) return 1.0;
    
    // TSED formula: max{1 - δ/MaxNodes(G1, G2), 0}
    return Math.max(1 - distance / maxNodes, 0);
  }
}