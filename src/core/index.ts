// Export typed versions as the main API
export * from './apted_typed.ts';
export * from './ast_typed.ts';
export * from './levenshtein.ts';
export * from './tokens.ts';
export * from './hash.ts';
export * from './oxc_types.ts';

// Re-export legacy versions for backward compatibility
export {
  getNodeLabel as getNodeLabelLegacy,
  getNodeChildren as getNodeChildrenLegacy,
  oxcToTreeNode as oxcToTreeNodeLegacy,
  calculateAPTEDSimilarity as calculateAPTEDSimilarityLegacy,
  calculateSimilarityAPTED as calculateSimilarityAPTEDLegacy,
  compareStructuresAPTED as compareStructuresAPTEDLegacy
} from './apted.ts';

export {
  extractStructure as extractStructureLegacy,
  astToString as astToStringLegacy,
  calculateSimilarity as calculateSimilarityLegacy,
  compareStructures as compareStructuresLegacy
} from './ast.ts';