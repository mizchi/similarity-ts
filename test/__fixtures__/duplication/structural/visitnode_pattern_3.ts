// visitNode pattern from semantic_normalizer.ts
function visitNode(node: any, replacer: (n: any) => any): any {
  if (!node || typeof node !== 'object') {
    return node;
  }

  // Apply replacer
  const replaced = replacer(node);
  if (replaced !== node) {
    return replaced;
  }

  // Clone and process children
  const newNode: any = { ...node };
  const skipKeys = new Set(['loc', 'range', 'start', 'end', 'parent']);

  for (const key in newNode) {
    if (newNode.hasOwnProperty(key) && !skipKeys.has(key)) {
      const value = newNode[key];
      
      if (Array.isArray(value)) {
        newNode[key] = value.map(item => visitNode(item, replacer));
      } else if (value && typeof value === 'object') {
        newNode[key] = visitNode(value, replacer);
      }
    }
  }

  return newNode;
}