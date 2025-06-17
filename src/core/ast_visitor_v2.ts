// Enhanced AST visitor with better context management
export interface VisitorCallbacks<TContext = any> {
  // Enter/leave callbacks for better context management
  enter?: (node: any, context: TContext) => void;
  leave?: (node: any, context: TContext) => void;
  
  // Specific node type callbacks
  enterFunctionDeclaration?: (node: any, context: TContext) => void;
  leaveFunctionDeclaration?: (node: any, context: TContext) => void;
  
  enterClassDeclaration?: (node: any, context: TContext) => void;
  leaveClassDeclaration?: (node: any, context: TContext) => void;
  
  enterMethodDefinition?: (node: any, context: TContext) => void;
  leaveMethodDefinition?: (node: any, context: TContext) => void;
  
  enterVariableDeclarator?: (node: any, context: TContext) => void;
  leaveVariableDeclarator?: (node: any, context: TContext) => void;
  
  // Add more as needed
  [key: string]: ((node: any, context: TContext) => void) | undefined;
}

/**
 * Enhanced visitor that supports enter/leave callbacks
 */
export function visitASTv2<TContext = any>(
  node: any,
  callbacks: VisitorCallbacks<TContext>,
  context: TContext
): void {
  if (!node || typeof node !== 'object') return;
  
  // Call general enter callback
  callbacks.enter?.(node, context);
  
  // Call specific enter callback
  if (node.type && typeof node.type === 'string') {
    const enterCallback = callbacks[`enter${node.type}`];
    if (typeof enterCallback === 'function') {
      enterCallback(node, context);
    }
  }
  
  // Traverse children
  for (const key in node) {
    if (key === 'parent' || key === 'scope' || key === '_parent') continue;
    
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(item => visitASTv2(item, callbacks, context));
    } else if (value && typeof value === 'object') {
      visitASTv2(value, callbacks, context);
    }
  }
  
  // Call specific leave callback
  if (node.type && typeof node.type === 'string') {
    const leaveCallback = callbacks[`leave${node.type}`];
    if (typeof leaveCallback === 'function') {
      leaveCallback(node, context);
    }
  }
  
  // Call general leave callback
  callbacks.leave?.(node, context);
}

/**
 * Simple visitor for when you don't need enter/leave
 */
export function simpleVisit<TContext = any>(
  node: any,
  nodeCallback: (node: any, context: TContext) => void,
  context: TContext
): void {
  if (!node || typeof node !== 'object') return;
  
  nodeCallback(node, context);
  
  for (const key in node) {
    if (key === 'parent' || key === 'scope' || key === '_parent') continue;
    
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(item => simpleVisit(item, nodeCallback, context));
    } else if (value && typeof value === 'object') {
      simpleVisit(value, nodeCallback, context);
    }
  }
}