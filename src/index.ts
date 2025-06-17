// Main exports for TypeScript Code Similarity
export {
  parseTypeScript as parse,
  parseTypeScriptAsync as parseAsync,
  parseMultipleAsync,
} from "./parser.ts";

// Import core functionality
import { astToString } from "./core/ast.ts";
import { calculateSimilarity as calculateLevenshteinSimilarity, compareStructures } from "./core/ast.ts";
import { compareStructuresAPTED, type APTEDOptions } from "./core/apted.ts";
import { calculateTSED as calculateAPTEDSimilarityFromAST } from "./core/tsed.ts";
import { parseTypeScript, parseTypeScriptAsync } from "./parser.ts";

// Import repository functionality
import {
  type CodeFile,
  type SimilarityResult,
  type RepositoryState,
  createRepository,
  loadFiles,
  loadFilesAsync,
  addFileAsync,
  findSimilarByMinHash,
  findSimilarBySimHash,
  findSimilarByAPTEDAsync,
  findAllSimilarPairs,
  findClones,
  getStatistics,
} from "./cli/repo_checker.ts";
import { loadFilesFromPattern } from "./cli/io.ts";

// Re-export types and functions
export type {
  CodeFile,
  SimilarityResult,
  RepositoryState,
} from "./cli/repo_checker.ts";
export type { APTEDOptions } from "./core/apted.ts";
export {
  calculateTSED,
  calculateTSEDWithMetrics,
  DEFAULT_TSED_OPTIONS,
  REFACTORING_TSED_OPTIONS,
  type TSEDOptions,
} from "./core/tsed.ts";
export type { ASTNode, Program } from "./core/oxc_types.ts";
export {
  addFileAsync,
  findSimilarByMinHash,
  findSimilarBySimHash,
  findSimilarByAPTEDAsync,
  getStatistics,
  loadFilesAsync,
} from "./cli/repo_checker.ts";

// Function extraction and comparison
export {
  extractFunctions,
  compareFunctions,
  findDuplicateFunctions,
  type FunctionDefinition,
  type FunctionComparisonResult,
} from "./core/function_extractor.ts";

export {
  normalizeSemantics,
  methodToFunction,
  functionToMethod,
  areSemanticallySimilar,
  type NormalizationOptions,
  type SemanticPattern,
} from "./core/semantic_normalizer.ts";

// Type definitions
export interface SimilarityOptions {
  algorithm?: "levenshtein" | "apted";
  aptedConfig?: Partial<APTEDOptions>;
}

export interface DetailedReport {
  similarity: number;
  algorithm: string;
  structure1: string;
  structure2: string;
  code1Length: number;
  code2Length: number;
}

/**
 * Calculate similarity between two code snippets using Levenshtein algorithm
 * Returns a score between 0 and 1 (1 = identical, 0 = completely different)
 */
export function calculateSimilarity(code1: string, code2: string): number {
  return calculateLevenshteinSimilarity(code1, code2);
}

/**
 * Calculate similarity using APTED algorithm for better structural comparison
 * Handles renamed identifiers better than Levenshtein
 */
export function calculateAPTEDSimilarity(code1: string, code2: string, config?: Partial<APTEDOptions>): number {
  try {
    const ast1 = parseTypeScript("file1.ts", code1);
    const ast2 = parseTypeScript("file2.ts", code2);
    return calculateAPTEDSimilarityFromAST(ast1, ast2, config);
  } catch (error) {
    // Fall back to simple string comparison
    return code1 === code2 ? 1.0 : 0.0;
  }
}

/**
 * Calculate similarity using APTED algorithm (asynchronous)
 */
export async function calculateAPTEDSimilarityAsync(
  code1: string,
  code2: string,
  config?: Partial<APTEDOptions>,
): Promise<number> {
  try {
    const [ast1, ast2] = await Promise.all([
      parseTypeScriptAsync("file1.ts", code1),
      parseTypeScriptAsync("file2.ts", code2),
    ]);
    return calculateAPTEDSimilarityFromAST(ast1, ast2, config);
  } catch (error) {
    // Fall back to simple string comparison
    return code1 === code2 ? 1.0 : 0.0;
  }
}

/**
 * Calculate similarity from pre-parsed ASTs
 */
export { calculateAPTEDSimilarityFromAST };

/**
 * Get detailed comparison report including AST structures
 */
export function getDetailedReport(code1: string, code2: string, options: SimilarityOptions = {}): DetailedReport {
  const ast1 = parseTypeScript("file1.ts", code1);
  const ast2 = parseTypeScript("file2.ts", code2);

  if (options.algorithm === "apted") {
    const result = compareStructuresAPTED(ast1.program, ast2.program, {
      renameCost: 0.3,
      ...options.aptedConfig,
    });

    return {
      similarity: result.similarity,
      algorithm: "APTED",
      structure1: astToString(ast1),
      structure2: astToString(ast2),
      code1Length: code1.length,
      code2Length: code2.length,
    };
  } else {
    const result = compareStructures(ast1, ast2);

    return {
      similarity: result.similarity,
      algorithm: "Levenshtein",
      structure1: astToString(ast1),
      structure2: astToString(ast2),
      code1Length: code1.length,
      code2Length: code2.length,
    };
  }
}

/**
 * Create a new empty code repository
 */
export { createRepository };

/**
 * Factory function to create a repository analyzer with stateful methods
 */
export function buildRepoAnalyzer() {
  let state = createRepository();

  return {
    async loadFiles(pattern: string): Promise<void> {
      state = await loadFilesIntoRepositoryAsync(state, pattern);
    },

    async addFile(id: string, path: string, content: string): Promise<void> {
      state = await addFileAsync(state, id, path, content);
    },

    findSimilarByMinHash(fileId: string, threshold: number = 0.7): SimilarityResult[] {
      return findSimilarByMinHash(state, fileId, threshold);
    },

    findSimilarBySimHash(fileId: string, threshold: number = 0.7): SimilarityResult[] {
      return findSimilarBySimHash(state, fileId, threshold);
    },

    async findSimilarByAPTED(
      fileId: string,
      threshold: number = 0.7,
      maxComparisons: number = 100,
    ): Promise<SimilarityResult[]> {
      return findSimilarByAPTEDAsync(state, fileId, threshold, maxComparisons);
    },

    findAllSimilarPairs(threshold: number = 0.7, method: "minhash" | "simhash" = "minhash"): SimilarityResult[] {
      return findAllSimilarPairs(state, threshold, method);
    },

    getStatistics() {
      return getStatistics(state);
    },

    getFiles(): CodeFile[] {
      return Array.from(state.files.values());
    },
  };
}

/**
 * Load files from a glob pattern into the repository (synchronous parsing)
 * @deprecated Use loadFilesIntoRepositoryAsync for better performance
 */
export async function loadFilesIntoRepository(repo: RepositoryState, pattern: string): Promise<RepositoryState> {
  const files = await loadFilesFromPattern(pattern);
  return loadFiles(repo, files);
}

/**
 * Load files from a glob pattern into the repository with parallel parsing
 */
export async function loadFilesIntoRepositoryAsync(repo: RepositoryState, pattern: string): Promise<RepositoryState> {
  const files = await loadFilesFromPattern(pattern);
  return loadFilesAsync(repo, files);
}

/**
 * Find files similar to a given file using MinHash algorithm
 * Fast approximate similarity search with O(1) query time
 */
export function findSimilarFiles(
  repo: RepositoryState,
  filePath: string,
  threshold: number,
  method: "minhash" | "simhash" = "minhash",
): SimilarityResult[] {
  if (method === "simhash") {
    return findSimilarBySimHash(repo, filePath, threshold);
  }
  return findSimilarByMinHash(repo, filePath, threshold);
}

/**
 * Find all pairs of similar files in the repository
 * Returns pairs with similarity above the threshold
 */
export { findAllSimilarPairs };

/**
 * Find groups of code clones (highly similar files)
 * Returns arrays of files that are similar to each other
 */
export function findCodeClones(repo: RepositoryState, threshold: number = 0.9): CodeFile[][] {
  const cloneMap = findClones(repo, threshold);
  const cloneGroups: CodeFile[][] = [];

  for (const [_, fileIds] of cloneMap) {
    const group: CodeFile[] = [];
    for (const fileId of fileIds) {
      const file = repo.files.get(fileId);
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

// Convenience function for one-shot similarity calculation with options
export function calculateSimilarityWithOptions(code1: string, code2: string, options: SimilarityOptions = {}): number {
  if (options.algorithm === "apted") {
    return calculateAPTEDSimilarity(code1, code2, options.aptedConfig);
  }
  return calculateSimilarity(code1, code2);
}
