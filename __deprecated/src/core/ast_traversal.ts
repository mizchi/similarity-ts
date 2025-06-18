/**
 * Shared AST traversal utility to eliminate code duplication
 * This module provides a common traversal pattern used across the codebase
 */

interface NodeHandler<T> {
  (node: any, state: T, parent?: any): void;
}

interface NodeHandlers<T> {
  // Lifecycle hooks
  enter?: NodeHandler<T>;
  leave?: NodeHandler<T>;

  // Node type specific handlers
  FunctionDeclaration?: NodeHandler<T>;
  FunctionExpression?: NodeHandler<T>;
  ArrowFunctionExpression?: NodeHandler<T>;
  MethodDefinition?: NodeHandler<T>;
  ClassDeclaration?: NodeHandler<T>;
  ClassExpression?: NodeHandler<T>;
  VariableDeclaration?: NodeHandler<T>;
  VariableDeclarator?: NodeHandler<T>;
  MemberExpression?: NodeHandler<T>;
  CallExpression?: NodeHandler<T>;
  ThisExpression?: NodeHandler<T>;
  Identifier?: NodeHandler<T>;
  BlockStatement?: NodeHandler<T>;

  // Generic handler for any node type
  [nodeType: string]: NodeHandler<T> | undefined;
}

/**
 * Traverse AST with given handlers
 * @param node - AST node to traverse
 * @param handlers - Object containing node handlers
 * @param state - State object passed to all handlers
 * @param parent - Parent node (optional)
 */
export function traverseAST<T>(node: any, handlers: NodeHandlers<T>, state: T, parent?: any): void {
  if (!node || typeof node !== "object") return;

  // Call enter lifecycle hook
  handlers.enter?.(node, state, parent);

  // Call node type specific handler
  if (node.type && typeof node.type === "string") {
    const handler = handlers[node.type];
    if (handler) {
      handler(node, state, parent);
    }
  }

  // Traverse children
  for (const key in node) {
    // Skip circular references and internal properties
    if (key === "parent" || key === "scope" || key === "_parent") continue;

    const value = node[key];
    if (Array.isArray(value)) {
      // Traverse array elements
      value.forEach((child) => traverseAST(child, handlers, state, node));
    } else if (value && typeof value === "object") {
      // Traverse object properties
      traverseAST(value, handlers, state, node);
    }
  }

  // Call leave lifecycle hook
  handlers.leave?.(node, state, parent);
}

/**
 * Helper to create a typed visitor
 */
export function createVisitor<T>(handlers: NodeHandlers<T>): NodeHandlers<T> {
  return handlers;
}
