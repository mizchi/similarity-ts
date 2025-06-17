/**
 * Enhanced AST traversal with context stack management
 * This solves the problem of maintaining context (like class names) during traversal
 */

import { NodeHandler, NodeHandlers, traverseAST } from './ast_traversal.ts';

export interface ContextStackItem {
  type: string;
  name?: string;
  [key: string]: any;
}

export interface StateWithContext<T = any> {
  contextStack: ContextStackItem[];
  data: T;
}

/**
 * Helper to push context
 */
export function pushContext<T>(state: StateWithContext<T>, item: ContextStackItem): void {
  state.contextStack.push(item);
}

/**
 * Helper to pop context
 */
export function popContext<T>(state: StateWithContext<T>): ContextStackItem | undefined {
  return state.contextStack.pop();
}

/**
 * Helper to get current context of specific type
 */
export function getCurrentContext<T>(
  state: StateWithContext<T>, 
  type: string
): ContextStackItem | undefined {
  // Search from end to beginning (most recent first)
  for (let i = state.contextStack.length - 1; i >= 0; i--) {
    if (state.contextStack[i].type === type) {
      return state.contextStack[i];
    }
  }
  return undefined;
}

/**
 * Create handlers with automatic context management
 */
export function createContextualVisitor<T>(
  handlers: NodeHandlers<StateWithContext<T>>,
  contextTypes: string[] = ['ClassDeclaration', 'ClassExpression']
): NodeHandlers<StateWithContext<T>> {
  const originalEnter = handlers.enter;
  const originalLeave = handlers.leave;
  
  return {
    ...handlers,
    
    enter(node, state, parent) {
      // Push context for specified types
      if (node.type && contextTypes.includes(node.type)) {
        pushContext(state, {
          type: node.type,
          name: node.id?.name,
          node
        });
      }
      
      // Call original enter
      originalEnter?.(node, state, parent);
    },
    
    leave(node, state, parent) {
      // Call original leave
      originalLeave?.(node, state, parent);
      
      // Pop context for specified types
      if (node.type && contextTypes.includes(node.type)) {
        popContext(state);
      }
    }
  };
}