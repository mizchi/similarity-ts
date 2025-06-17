// Generic AST visitor utility to eliminate code duplication
export interface VisitorContext {
  [key: string]: any;
}

export interface VisitorCallbacks {
  // General callback for all nodes
  onNode?: (node: any, context: VisitorContext) => void;
  
  // Specific callbacks for node types
  onFunctionDeclaration?: (node: any, context: VisitorContext) => void;
  onFunctionExpression?: (node: any, context: VisitorContext) => void;
  onArrowFunctionExpression?: (node: any, context: VisitorContext) => void;
  onMethodDefinition?: (node: any, context: VisitorContext) => void;
  onVariableDeclarator?: (node: any, context: VisitorContext) => void;
  onVariableDeclaration?: (node: any, context: VisitorContext) => void;
  onClassDeclaration?: (node: any, context: VisitorContext) => void;
  onClassExpression?: (node: any, context: VisitorContext) => void;
  onMemberExpression?: (node: any, context: VisitorContext) => void;
  onThisExpression?: (node: any, context: VisitorContext) => void;
  onIdentifier?: (node: any, context: VisitorContext) => void;
  onCallExpression?: (node: any, context: VisitorContext) => void;
  onBlockStatement?: (node: any, context: VisitorContext) => void;
  
  // Add more as needed
  [key: string]: ((node: any, context: VisitorContext) => void) | undefined;
}

/**
 * Generic AST visitor that traverses nodes and calls appropriate callbacks
 */
export function visitAST(
  node: any,
  callbacks: VisitorCallbacks,
  context: VisitorContext = {}
): void {
  if (!node || typeof node !== 'object') return;
  
  // Call general callback for all nodes
  callbacks.onNode?.(node, context);
  
  // Call specific callback based on node type
  if (node.type && typeof node.type === 'string') {
    const callbackName = `on${node.type}`;
    const typeCallback = callbacks[callbackName];
    if (typeof typeCallback === 'function') {
      typeCallback(node, context);
    }
  }
  
  // Traverse children
  for (const key in node) {
    // Skip circular references and internal properties
    if (key === 'parent' || key === 'scope' || key === '_parent') continue;
    
    const value = node[key];
    if (Array.isArray(value)) {
      // Visit each item in arrays
      value.forEach(item => visitAST(item, callbacks, context));
    } else if (value && typeof value === 'object') {
      // Visit object properties
      visitAST(value, callbacks, context);
    }
  }
}

/**
 * Helper to collect nodes of specific types
 */
export function collectNodes(
  ast: any,
  nodeTypes: string[]
): any[] {
  const nodes: any[] = [];
  
  visitAST(ast, {
    onNode: (node) => {
      if (node.type && nodeTypes.includes(node.type)) {
        nodes.push(node);
      }
    }
  });
  
  return nodes;
}

/**
 * Helper to find first node matching a predicate
 */
export function findNode(
  ast: any,
  predicate: (node: any) => boolean
): any | null {
  let found: any = null;
  
  visitAST(ast, {
    onNode: (node) => {
      if (!found && predicate(node)) {
        found = node;
      }
    }
  });
  
  return found;
}

/**
 * Helper to transform AST by applying modifications
 */
export function transformAST(
  ast: any,
  transformer: (node: any) => any
): any {
  return transformNode(ast, transformer);
}

function transformNode(node: any, transformer: (node: any) => any): any {
  if (!node || typeof node !== 'object') return node;
  
  // Apply transformation
  const transformed = transformer(node);
  if (transformed !== node) return transformed;
  
  // Transform children
  const result: any = {};
  for (const key in node) {
    if (key === 'parent' || key === 'scope' || key === '_parent') {
      continue;
    }
    
    const value = node[key];
    if (Array.isArray(value)) {
      result[key] = value.map(item => transformNode(item, transformer));
    } else if (value && typeof value === 'object') {
      result[key] = transformNode(value, transformer);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}