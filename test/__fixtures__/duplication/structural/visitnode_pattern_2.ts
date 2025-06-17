// visitNode pattern from function_extractor.ts
function visitNode(node: any, ancestors: any[] = []): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  // Process based on node type
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
    extractFunction(node, ancestors);
  } else if (node.type === 'MethodDefinition') {
    extractMethod(node, ancestors);
  } else if (node.type === 'ArrowFunctionExpression') {
    extractArrowFunction(node, ancestors);
  }

  // Skip certain keys
  const skipKeys = new Set(['loc', 'range', 'start', 'end', 'parent']);

  // Visit children
  for (const key in node) {
    if (node.hasOwnProperty(key) && !skipKeys.has(key)) {
      const value = node[key];
      
      if (Array.isArray(value)) {
        for (const item of value) {
          visitNode(item, [...ancestors, node]);
        }
      } else if (value && typeof value === 'object') {
        visitNode(value, [...ancestors, node]);
      }
    }
  }
}