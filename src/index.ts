import { calculateSimilarity, compareStructures, parseTypeScript, calculateSimilarityAPTED } from './oxc_similarity.ts';
import type { APTEDConfig } from './oxc_similarity.ts';
import { CodeRepository } from './code_repository.ts';
import { MinHash, LSH, SimHash, extractTokens, extractFeatures } from './code_index.ts';

export { 
  calculateSimilarity, 
  compareStructures, 
  parseTypeScript, 
  calculateSimilarityAPTED,
  CodeRepository,
  MinHash,
  LSH,
  SimHash,
  extractTokens,
  extractFeatures
};
export type { APTEDConfig };

/**
 * Main API for calculating code similarity using oxc-parser
 */
export class CodeSimilarity {
  private config?: Partial<APTEDConfig>;
  private useAPTED: boolean;

  constructor(options?: { useAPTED?: boolean; config?: Partial<APTEDConfig> }) {
    this.useAPTED = options?.useAPTED ?? false;
    this.config = options?.config;
  }

  /**
   * Calculate similarity between two code snippets
   * @param code1 First code snippet
   * @param code2 Second code snippet
   * @returns Similarity score between 0 and 1
   */
  calculateSimilarity(code1: string, code2: string): number {
    if (this.useAPTED) {
      return calculateSimilarityAPTED(code1, code2, this.config);
    }
    return calculateSimilarity(code1, code2);
  }

  /**
   * Get detailed similarity report
   */
  getDetailedReport(code1: string, code2: string) {
    const result = compareStructures(code1, code2);
    
    return {
      similarity: this.useAPTED ? calculateSimilarityAPTED(code1, code2, this.config) : result.similarity,
      structure1: result.structure1,
      structure2: result.structure2,
      code1Length: code1.length,
      code2Length: code2.length,
      algorithm: this.useAPTED ? 'APTED' : 'Levenshtein',
    };
  }

  /**
   * Parse TypeScript code and return AST
   */
  parse(code: string, filename = 'code.ts') {
    return parseTypeScript(filename, code);
  }
}

// Export default instance for convenience
export default CodeSimilarity;