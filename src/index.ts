// Main exports for TypeScript Code Similarity
export { parseTypeScript as parse } from './parser.ts';

// Import core functionality
import { 
  calculateSimilarity as calculateSimilarityCore,
  compareStructures as compareStructuresCore,
  astToString
} from './core/ast.ts';
import {
  calculateSimilarityAPTED as calculateAPTEDCore,
  compareStructuresAPTED as compareStructuresAPTEDCore,
  type APTEDOptions
} from './core/apted.ts';
import { parseTypeScript } from './parser.ts';

// Import repository functionality
import {
  type CodeFile,
  type SimilarityResult,
  type RepositoryState,
  createRepository as createRepositoryCore,
  loadFiles as loadFilesCore,
  findSimilarByMinHash as findSimilarByMinHashCore,
  findSimilarBySimHash as findSimilarBySimHashCore,
  findAllSimilarPairs as findAllSimilarPairsCore,
  findClones as findClonesCore
} from './cli/repo_checker.ts';
import { loadFilesFromPattern } from './cli/io.ts';

// Re-export types
export type { CodeFile, SimilarityResult } from './cli/repo_checker.ts';
export type { APTEDOptions as APTEDConfig } from './core/apted.ts';
export type { ASTNode, Program } from './core/oxc_types.ts';

// Type definitions
export interface SimilarityOptions {
  algorithm?: 'levenshtein' | 'apted';
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

export type Repository = RepositoryState;

/**
 * Calculate similarity between two code snippets using Levenshtein algorithm
 * Returns a score between 0 and 1 (1 = identical, 0 = completely different)
 */
export function calculateSimilarity(code1: string, code2: string): number {
  return calculateSimilarityCore(code1, code2);
}

/**
 * Calculate similarity using APTED algorithm for better structural comparison
 * Handles renamed identifiers better than Levenshtein
 */
export function calculateAPTEDSimilarity(
  code1: string, 
  code2: string, 
  config?: Partial<APTEDOptions>
): number {
  return calculateAPTEDCore(code1, code2, config);
}

/**
 * Get detailed comparison report including AST structures
 */
export function getDetailedReport(
  code1: string,
  code2: string,
  options: SimilarityOptions = {}
): DetailedReport {
  const ast1 = parseTypeScript("file1.ts", code1);
  const ast2 = parseTypeScript("file2.ts", code2);
  
  if (options.algorithm === 'apted') {
    const result = compareStructuresAPTEDCore(ast1.program, ast2.program, {
      renameCost: 0.3,
      ...options.aptedConfig
    });
    
    return {
      similarity: result.similarity,
      algorithm: 'APTED',
      structure1: astToString(ast1),
      structure2: astToString(ast2),
      code1Length: code1.length,
      code2Length: code2.length
    };
  } else {
    const result = compareStructuresCore(ast1, ast2);
    
    return {
      similarity: result.similarity,
      algorithm: 'Levenshtein',
      structure1: astToString(ast1),
      structure2: astToString(ast2),
      code1Length: code1.length,
      code2Length: code2.length
    };
  }
}

/**
 * Create a new empty code repository
 */
export function createRepository(): Repository {
  return createRepositoryCore();
}

/**
 * Load files from a glob pattern into the repository
 * Returns a new repository state with the loaded files
 */
export async function loadFilesIntoRepository(
  repo: Repository,
  pattern: string
): Promise<Repository> {
  const files = await loadFilesFromPattern(pattern);
  // Create a shallow copy to maintain immutability
  const newRepo = {
    ...repo,
    files: new Map(repo.files)
  };
  loadFilesCore(newRepo, files);
  return newRepo;
}

/**
 * Find files similar to a given file using MinHash algorithm
 * Fast approximate similarity search with O(1) query time
 */
export function findSimilarFiles(
  repo: Repository,
  filePath: string,
  threshold: number,
  method: 'minhash' | 'simhash' = 'minhash'
): SimilarityResult[] {
  if (method === 'simhash') {
    return findSimilarBySimHashCore(repo, filePath, threshold);
  }
  return findSimilarByMinHashCore(repo, filePath, threshold);
}

/**
 * Find all pairs of similar files in the repository
 * Returns pairs with similarity above the threshold
 */
export function findAllSimilarPairs(
  repo: Repository,
  threshold: number,
  method: 'minhash' | 'simhash' = 'minhash'
): SimilarityResult[] {
  return findAllSimilarPairsCore(repo, threshold, method);
}

/**
 * Find groups of code clones (highly similar files)
 * Returns arrays of files that are similar to each other
 */
export function findCodeClones(
  repo: Repository,
  threshold: number = 0.9
): CodeFile[][] {
  const cloneMap = findClonesCore(repo, threshold);
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
export function calculateSimilarityWithOptions(
  code1: string,
  code2: string,
  options: SimilarityOptions = {}
): number {
  if (options.algorithm === 'apted') {
    return calculateAPTEDSimilarity(code1, code2, options.aptedConfig);
  }
  return calculateSimilarity(code1, code2);
}