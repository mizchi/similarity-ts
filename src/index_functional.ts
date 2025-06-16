import { 
  calculateSimilarity as oxcCalculateSimilarity, 
  compareStructures as oxcCompareStructures, 
  parseTypeScript,
  calculateSimilarityAPTED as oxcCalculateSimilarityAPTED,
  APTEDConfig 
} from './oxc_similarity.ts';
import {
  createRepository,
  loadFiles,
  addFile,
  findSimilarByMinHash,
  findSimilarBySimHash,
  findSimilarByAPTED,
  findAllSimilarPairs,
  findClones,
  getStatistics,
  RepositoryState
} from './code_repository_functional.ts';
import {
  createMinHashConfig,
  generateMinHashSignature,
  calculateMinHashSimilarity,
  createLSHState,
  addToLSH,
  findSimilarLSH,
  createSimHashConfig,
  generateSimHash,
  calculateSimHashSimilarity,
  extractTokens,
  extractFeatures,
  MinHashConfig,
  SimHashConfig,
  LSHState
} from './code_index_functional.ts';

// Re-export all functions and types
export {
  // Similarity functions
  oxcCalculateSimilarity as calculateSimilarity,
  oxcCompareStructures as compareStructures,
  parseTypeScript,
  oxcCalculateSimilarityAPTED as calculateSimilarityAPTED,
  
  // Repository functions
  createRepository,
  loadFiles,
  addFile,
  findSimilarByMinHash,
  findSimilarBySimHash,
  findSimilarByAPTED,
  findAllSimilarPairs,
  findClones,
  getStatistics,
  
  // Index functions
  createMinHashConfig,
  generateMinHashSignature,
  calculateMinHashSimilarity,
  createLSHState,
  addToLSH,
  findSimilarLSH,
  createSimHashConfig,
  generateSimHash,
  calculateSimHashSimilarity,
  extractTokens,
  extractFeatures,
  
  // Types
  type APTEDConfig,
  type RepositoryState,
  type MinHashConfig,
  type SimHashConfig,
  type LSHState
};

// Compatibility layer for class-based API
export interface CodeSimilarityOptions {
  useAPTED?: boolean;
  config?: Partial<APTEDConfig>;
}

/**
 * Calculate similarity with options (compatibility wrapper)
 */
export function calculateSimilarityWithOptions(
  code1: string,
  code2: string,
  options?: CodeSimilarityOptions
): number {
  if (options?.useAPTED) {
    return oxcCalculateSimilarityAPTED(code1, code2, options.config);
  }
  return oxcCalculateSimilarity(code1, code2);
}

/**
 * Get detailed report (compatibility wrapper)
 */
export function getDetailedReport(
  code1: string,
  code2: string,
  options?: CodeSimilarityOptions
) {
  const result = oxcCompareStructures(code1, code2);
  
  return {
    similarity: options?.useAPTED 
      ? oxcCalculateSimilarityAPTED(code1, code2, options.config) 
      : result.similarity,
    structure1: result.structure1,
    structure2: result.structure2,
    code1Length: code1.length,
    code2Length: code2.length,
    algorithm: options?.useAPTED ? 'APTED' : 'Levenshtein',
  };
}

/**
 * Create a code repository (convenience wrapper)
 */
export function createCodeRepository(
  minHashSize?: number,
  lshBands?: number,
  simHashBits?: number
): RepositoryState {
  return createRepository(minHashSize, lshBands, simHashBits);
}