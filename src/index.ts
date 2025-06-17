// Main exports for TypeScript Code Similarity
export { parseTypeScript as parse } from './parser.ts';

// Import necessary functions for CodeSimilarity
import { 
  calculateSimilarity as calculateSimilarityCore,
  compareStructures as compareStructuresCore
} from './core/ast.ts';
import {
  calculateSimilarityAPTED,
  compareStructuresAPTED as compareStructuresAPTEDCore,
  type APTEDOptions
} from './core/apted.ts';
import { parseTypeScript } from './parser.ts';

// Import functions for CodeRepository
import {
  type CodeFile,
  type SimilarityResult,
  type RepositoryState,
  createRepository,
  loadFiles as loadFilesRepo,
  findSimilarByMinHash,
  findAllSimilarPairs as findAllSimilarPairsRepo,
  findClones as findClonesRepo
} from './code_repository.ts';
import { loadFilesFromPattern } from './io.ts';

// Re-export types
export type { CodeFile, SimilarityResult } from './code_repository.ts';
export type APTEDConfig = APTEDOptions;

/**
 * Options for CodeSimilarity
 */
export interface CodeSimilarityOptions {
  useAPTED?: boolean;
  config?: Partial<APTEDConfig>;
}

/**
 * CodeSimilarity - factory function to create similarity calculator
 */
export function CodeSimilarity(options: CodeSimilarityOptions = {}) {
  return {
    /**
     * Calculate similarity between two code snippets
     * Returns a score between 0 and 1
     */
    calculateSimilarity(code1: string, code2: string): number {
      if (options.useAPTED) {
        return calculateSimilarityAPTED(code1, code2, options.config);
      }
      return calculateSimilarityCore(code1, code2);
    },

    /**
     * Get detailed report including similarity score and AST structures
     */
    getDetailedReport(code1: string, code2: string) {
      const ast1 = parseTypeScript("file1.ts", code1);
      const ast2 = parseTypeScript("file2.ts", code2);
      
      let similarity: number;
      let result: any;
      
      if (options.useAPTED) {
        result = compareStructuresAPTEDCore(ast1.program, ast2.program, {
          renameCost: 0.3,
          ...options.config
        });
        similarity = result.similarity;
      } else {
        result = compareStructuresCore(ast1, ast2);
        similarity = result.similarity;
      }
      
      return {
        similarity,
        structure1: result.structure1 || '',
        structure2: result.structure2 || '',
        code1Length: code1.length,
        code2Length: code2.length,
        algorithm: options.useAPTED ? 'APTED' : 'Levenshtein',
      };
    },

    /**
     * Parse TypeScript code and return the AST
     */
    parse(code: string, filename?: string) {
      return parseTypeScript(filename || 'file.ts', code);
    }
  };
}

/**
 * CodeRepository - factory function to create repository manager
 */
export function CodeRepository() {
  let state = createRepository();

  return {
    /**
     * Load files from a directory pattern
     */
    async loadFiles(pattern: string): Promise<void> {
      const files = await loadFilesFromPattern(pattern);
      loadFilesRepo(state, files);
    },

    /**
     * Find similar files using MinHash algorithm
     */
    findSimilarByMinHash(filePath: string, threshold: number): SimilarityResult[] {
      return findSimilarByMinHash(state, filePath, threshold);
    },

    /**
     * Find all similar pairs in the repository
     */
    findAllSimilarPairs(threshold: number): SimilarityResult[] {
      return findAllSimilarPairsRepo(state, threshold);
    },

    /**
     * Find code clones (groups of similar files)
     */
    findClones(threshold: number): CodeFile[][] {
      const cloneMap = findClonesRepo(state, threshold);
      const cloneGroups: CodeFile[][] = [];
      
      for (const [_, fileIds] of cloneMap) {
        const group: CodeFile[] = [];
        for (const fileId of fileIds) {
          const file = state.files.get(fileId);
          if (file) {
            group.push(file);
          }
        }
        if (group.length > 1) {
          cloneGroups.push(group);
        }
      }
      
      return cloneGroups;
    }
  };
}