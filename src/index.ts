// Import functional implementations
import {
  calculateSimilarity,
  compareStructures,
  parseTypeScript,
  calculateSimilarityAPTED,
  calculateSimilarityWithOptions,
  getDetailedReport,
  createCodeRepository,
  type APTEDConfig,
  type RepositoryState,
  type MinHashConfig,
  type SimHashConfig,
  type LSHState
} from './index_functional.ts';

// Re-export functional API
export {
  calculateSimilarity,
  compareStructures,
  parseTypeScript,
  calculateSimilarityAPTED,
  createCodeRepository,
  type APTEDConfig,
  type RepositoryState,
  type MinHashConfig,
  type SimHashConfig,
  type LSHState
};

// Re-export all functions from index_functional for direct access
export * from './index_functional.ts';

/**
 * Main API for calculating code similarity using oxc-parser
 * This is a compatibility wrapper around the functional API
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
    return calculateSimilarityWithOptions(code1, code2, {
      useAPTED: this.useAPTED,
      config: this.config
    });
  }

  /**
   * Get detailed similarity report
   */
  getDetailedReport(code1: string, code2: string) {
    return getDetailedReport(code1, code2, {
      useAPTED: this.useAPTED,
      config: this.config
    });
  }

  /**
   * Parse TypeScript code and return AST
   */
  parse(code: string, filename = 'code.ts') {
    return parseTypeScript(filename, code);
  }
}

/**
 * CodeRepository class wrapper around functional API
 */
export class CodeRepository {
  private state: RepositoryState;

  constructor(
    minHashSize: number = 128,
    lshBands: number = 16,
    simHashBits: number = 64
  ) {
    this.state = createCodeRepository(minHashSize, lshBands, simHashBits);
  }

  async loadFiles(pattern: string, basePath?: string) {
    const { loadFiles } = await import('./code_repository_functional.ts');
    return loadFiles(this.state, pattern, basePath);
  }

  async addFile(id: string, path: string, content: string) {
    const { addFile } = await import('./code_repository_functional.ts');
    return addFile(this.state, id, path, content);
  }

  async findSimilarByMinHash(fileId: string, threshold?: number) {
    const { findSimilarByMinHash } = await import('./code_repository_functional.ts');
    return findSimilarByMinHash(this.state, fileId, threshold);
  }

  async findSimilarBySimHash(fileId: string, threshold?: number) {
    const { findSimilarBySimHash } = await import('./code_repository_functional.ts');
    return findSimilarBySimHash(this.state, fileId, threshold);
  }

  async findSimilarByAPTED(fileId: string, threshold?: number, maxComparisons?: number) {
    const { findSimilarByAPTED } = await import('./code_repository_functional.ts');
    return findSimilarByAPTED(this.state, fileId, threshold, maxComparisons);
  }

  async findAllSimilarPairs(threshold?: number, method?: 'minhash' | 'simhash') {
    const { findAllSimilarPairs } = await import('./code_repository_functional.ts');
    return findAllSimilarPairs(this.state, threshold, method);
  }

  async findClones(threshold?: number) {
    const { findClones } = await import('./code_repository_functional.ts');
    return findClones(this.state, threshold);
  }

  async getStatistics() {
    const { getStatistics } = await import('./code_repository_functional.ts');
    return getStatistics(this.state);
  }
}

// Legacy exports for backward compatibility
export { extractTokens, extractFeatures } from './code_index_functional.ts';
export { MinHash, LSH, SimHash } from './code_index.ts';

// Export default instance for convenience
export default CodeSimilarity;