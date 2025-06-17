// visitNode pattern from function_body_comparer.ts
function visitNode(node: any, callback: (n: any) => void): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  callback(node);

  // Handle arrays
  if (Array.isArray(node)) {
    for (const item of node) {
      visitNode(item, callback);
    }
    return;
  }

  // Skip certain properties
  const skipKeys = new Set(['loc', 'range', 'start', 'end', 'parent']);

  // Visit all properties
  for (const key in node) {
    if (node.hasOwnProperty(key) && !skipKeys.has(key)) {
      visitNode(node[key], callback);
    }
  }
}