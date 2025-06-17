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
  type LSHState,
  type MinHashConfig,
  type SimHashConfig,
} from "../core/hash.ts";
import { extractTokensFromAST, extractFeaturesFromAST } from "../core/tokens.ts";
import { parseTypeScript, parseTypeScriptAsync, parseMultipleAsync } from "../parser.ts";
import type { ParseResult } from "oxc-parser";
import { calculateTSED } from "../core/tsed.ts";

export interface CodeFile {
  id: string;
  path: string;
  content: string;
  ast?: ParseResult; // Pre-parsed AST
  minHashSignature?: number[];
  simHash?: bigint;
}

// Helper functions for sync token/feature extraction
function extractTokens(code: string): Set<string> {
  try {
    const ast = parseTypeScript("file.ts", code);
    return extractTokensFromAST(ast);
  } catch (error) {
    // On parse error, fall back to simple tokenization
    const tokens = new Set<string>();
    const words = code.match(/\b\w+\b/g) || [];
    words.forEach((word) => tokens.add(word));
    return tokens;
  }
}

function extractFeatures(code: string): Map<string, number> {
  try {
    const ast = parseTypeScript("file.ts", code);
    return extractFeaturesFromAST(ast);
  } catch (error) {
    // Fallback to simple feature extraction
    const features = new Map<string, number>();
    const words = code.match(/\b\w+\b/g) || [];
    for (const word of words) {
      features.set(word, (features.get(word) || 0) + 1);
    }
    return features;
  }
}

// Helper functions for async token/feature extraction
async function extractTokensAsync(code: string): Promise<Set<string>> {
  try {
    const ast = await parseTypeScriptAsync("file.ts", code);
    return extractTokensFromAST(ast);
  } catch (error) {
    // On parse error, fall back to simple tokenization
    const tokens = new Set<string>();
    const words = code.match(/\b\w+\b/g) || [];
    words.forEach((word) => tokens.add(word));
    return tokens;
  }
}

async function extractFeaturesAsync(code: string): Promise<Map<string, number>> {
  try {
    const ast = await parseTypeScriptAsync("file.ts", code);
    return extractFeaturesFromAST(ast);
  } catch (error) {
    // Fallback to simple feature extraction
    const features = new Map<string, number>();
    const words = code.match(/\b\w+\b/g) || [];
    for (const word of words) {
      features.set(word, (features.get(word) || 0) + 1);
    }
    return features;
  }
}

// Helper function for async APTED similarity calculation
async function calculateAPTEDSimilarityAsync(code1: string, code2: string, options: any = {}): Promise<number> {
  try {
    const [ast1, ast2] = await Promise.all([
      parseTypeScriptAsync("file1.ts", code1),
      parseTypeScriptAsync("file2.ts", code2),
    ]);

    return calculateTSED(ast1, ast2, options);
  } catch (error) {
    // Fall back to simple string comparison
    return code1 === code2 ? 1.0 : 0.0;
  }
}

export interface SimilarityResult {
  file1: string;
  file2: string;
  similarity: number;
  method: "minhash" | "simhash" | "apted";
}

export interface RepositoryState {
  files: Map<string, CodeFile>;
  minHashConfig: MinHashConfig;
  lshState: LSHState;
  simHashConfig: SimHashConfig;
}

/**
 * Create a new repository state
 */
export function createRepository(
  minHashSize: number = 128,
  lshBands: number = 16,
  simHashBits: number = 64,
): RepositoryState {
  return {
    files: new Map(),
    minHashConfig: createMinHashConfig(minHashSize),
    lshState: createLSHState(minHashSize, lshBands),
    simHashConfig: createSimHashConfig(simHashBits),
  };
}

/**
 * Load multiple files into the repository (synchronous)
 * @deprecated Use loadFilesAsync for better performance
 */
export function loadFiles(
  repo: RepositoryState,
  files: Array<{ id: string; path: string; content: string }>,
): RepositoryState {
  let newRepo = repo;
  for (const file of files) {
    newRepo = addFile(newRepo, file.id, file.path, file.content);
  }
  return newRepo;
}

/**
 * Load multiple files into the repository with parallel parsing
 */
export async function loadFilesAsync(
  repo: RepositoryState,
  files: Array<{ id: string; path: string; content: string }>,
): Promise<RepositoryState> {
  // Parse all files in parallel
  const parseResults = await parseMultipleAsync(files.map((f) => ({ filename: f.path, code: f.content })));

  let newRepo = repo;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const parseResult = parseResults[i];

    if (parseResult.error) {
      console.error(`Failed to parse ${file.path}:`, parseResult.error);
      // Add file without AST
      newRepo = await addFileAsync(newRepo, file.id, file.path, file.content);
    } else {
      // Add file with pre-parsed AST
      newRepo = await addFileWithASTAsync(newRepo, file.id, file.path, file.content, parseResult.ast);
    }
  }
  return newRepo;
}

/**
 * Add a single file to the repository (synchronous)
 * @deprecated Use addFileAsync for better performance
 */
export function addFile(repo: RepositoryState, id: string, path: string, content: string): RepositoryState {
  // Extract tokens for MinHash
  const tokens = extractTokens(content);
  const minHashSignature = generateMinHashSignature(tokens, repo.minHashConfig);

  // Extract features for SimHash
  const features = extractFeatures(content);
  const simHashValue = generateSimHash(features, repo.simHashConfig);

  const file: CodeFile = {
    id,
    path,
    content,
    minHashSignature,
    simHash: simHashValue,
  };

  // Create a new repository state with the added file
  const newFiles = new Map(repo.files);
  newFiles.set(id, file);

  // Create a new LSH state with deep copy of bands
  const newLSHState: LSHState = {
    ...repo.lshState,
    bands: new Map(Array.from(repo.lshState.bands.entries()).map(([band, map]) => [band, new Map(map)])),
  };

  // Add to LSH index
  addToLSH(newLSHState, id, minHashSignature);

  return {
    ...repo,
    files: newFiles,
    lshState: newLSHState,
  };
}

/**
 * Add a single file to the repository (asynchronous)
 */
export async function addFileAsync(
  repo: RepositoryState,
  id: string,
  path: string,
  content: string,
): Promise<RepositoryState> {
  // Parse and extract in parallel
  const [ast, tokens, features] = await Promise.all([
    parseTypeScriptAsync(path, content).catch(() => null),
    extractTokensAsync(content),
    extractFeaturesAsync(content),
  ]);

  const minHashSignature = generateMinHashSignature(tokens, repo.minHashConfig);
  const simHashValue = generateSimHash(features, repo.simHashConfig);

  const file: CodeFile = {
    id,
    path,
    content,
    ast: ast || undefined,
    minHashSignature,
    simHash: simHashValue,
  };

  // Create a new repository state with the added file
  const newFiles = new Map(repo.files);
  newFiles.set(id, file);

  // Create a new LSH state with deep copy of bands
  const newLSHState: LSHState = {
    ...repo.lshState,
    bands: new Map(Array.from(repo.lshState.bands.entries()).map(([band, map]) => [band, new Map(map)])),
  };

  // Add to LSH index
  addToLSH(newLSHState, id, minHashSignature);

  return {
    ...repo,
    files: newFiles,
    lshState: newLSHState,
  };
}

/**
 * Add a file with pre-parsed AST
 */
async function addFileWithASTAsync(
  repo: RepositoryState,
  id: string,
  path: string,
  content: string,
  ast: ParseResult,
): Promise<RepositoryState> {
  // Extract from pre-parsed AST
  const tokens = extractTokensFromAST(ast);
  const features = extractFeaturesFromAST(ast);

  const minHashSignature = generateMinHashSignature(tokens, repo.minHashConfig);
  const simHashValue = generateSimHash(features, repo.simHashConfig);

  const file: CodeFile = {
    id,
    path,
    content,
    ast,
    minHashSignature,
    simHash: simHashValue,
  };

  // Create a new repository state with the added file
  const newFiles = new Map(repo.files);
  newFiles.set(id, file);

  // Create a new LSH state with deep copy of bands
  const newLSHState: LSHState = {
    ...repo.lshState,
    bands: new Map(Array.from(repo.lshState.bands.entries()).map(([band, map]) => [band, new Map(map)])),
  };

  // Add to LSH index
  addToLSH(newLSHState, id, minHashSignature);

  return {
    ...repo,
    files: newFiles,
    lshState: newLSHState,
  };
}

/**
 * Find similar files using MinHash/LSH
 */
export function findSimilarByMinHash(
  repo: RepositoryState,
  fileId: string,
  threshold: number = 0.7,
): SimilarityResult[] {
  const file = repo.files.get(fileId);
  if (!file || !file.minHashSignature) return [];

  // For small repositories, calculate similarity with all files
  if (repo.files.size < 100) {
    const results: SimilarityResult[] = [];

    for (const [otherId, otherFile] of repo.files) {
      if (otherId === fileId || !otherFile.minHashSignature) continue;

      const similarity = calculateMinHashSimilarity(file.minHashSignature, otherFile.minHashSignature);

      if (similarity >= threshold) {
        results.push({
          file1: fileId,
          file2: otherId,
          similarity,
          method: "minhash",
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  // For large repositories, use LSH
  const similar = findSimilarLSH(repo.lshState, file.minHashSignature, threshold);

  return similar
    .filter((s) => s.id !== fileId)
    .map((s) => ({
      file1: fileId,
      file2: s.id,
      similarity: s.similarity,
      method: "minhash" as const,
    }));
}

/**
 * Find similar files using SimHash
 */
export function findSimilarBySimHash(
  repo: RepositoryState,
  fileId: string,
  threshold: number = 0.8,
): SimilarityResult[] {
  const file = repo.files.get(fileId);
  if (!file || !file.simHash) return [];

  const results: SimilarityResult[] = [];

  for (const [otherId, otherFile] of repo.files) {
    if (otherId === fileId || !otherFile.simHash) continue;

    const similarity = calculateSimHashSimilarity(file.simHash, otherFile.simHash, repo.simHashConfig.bits);

    if (similarity >= threshold) {
      results.push({
        file1: fileId,
        file2: otherId,
        similarity,
        method: "simhash",
      });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find similar files using APTED (more accurate but slower) - synchronous
 * @deprecated Use findSimilarByAPTEDAsync for better performance
 * @internal
 */
/*
function _findSimilarByAPTED(
  repo: RepositoryState,
  fileId: string,
  threshold: number = 0.7,
  maxComparisons: number = 100,
): SimilarityResult[] {
  const file = repo.files.get(fileId);
  if (!file) return [];

  // First, get candidates using MinHash
  const candidates = findSimilarByMinHash(repo, fileId, threshold * 0.7);
  const candidateIds = new Set(candidates.map((c) => c.file2));

  // If not enough candidates, add some based on SimHash
  if (candidateIds.size < maxComparisons / 2) {
    const simHashCandidates = findSimilarBySimHash(repo, fileId, threshold * 0.7);
    for (const candidate of simHashCandidates) {
      candidateIds.add(candidate.file2);
      if (candidateIds.size >= maxComparisons) break;
    }
  }

  // Calculate precise APTED similarity for candidates
  const results: SimilarityResult[] = [];

  for (const otherId of candidateIds) {
    const otherFile = repo.files.get(otherId);
    if (!otherFile) continue;

    // Use pre-parsed AST if available
    let similarity: number;
    if (file.ast && otherFile.ast) {
      similarity = calculateTSED(file.ast, otherFile.ast, {
        renameCost: 0.3,
      });
    } else {
      // Parse synchronously for backward compatibility
      try {
        const ast1 = parseTypeScript("file1.ts", file.content);
        const ast2 = parseTypeScript("file2.ts", otherFile.content);
        similarity = calculateTSED(ast1, ast2, {
          renameCost: 0.3,
        });
      } catch {
        similarity = file.content === otherFile.content ? 1.0 : 0.0;
      }
    }

    if (similarity >= threshold) {
      results.push({
        file1: fileId,
        file2: otherId,
        similarity,
        method: "apted",
      });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}
*/

/**
 * Find similar files using APTED (asynchronous)
 */
export async function findSimilarByAPTEDAsync(
  repo: RepositoryState,
  fileId: string,
  threshold: number = 0.7,
  maxComparisons: number = 100,
): Promise<SimilarityResult[]> {
  const file = repo.files.get(fileId);
  if (!file) return [];

  // First, get candidates using MinHash
  const candidates = findSimilarByMinHash(repo, fileId, threshold * 0.7);
  const candidateIds = new Set(candidates.map((c) => c.file2));

  // If not enough candidates, add some based on SimHash
  if (candidateIds.size < maxComparisons / 2) {
    const simHashCandidates = findSimilarBySimHash(repo, fileId, threshold * 0.7);
    for (const candidate of simHashCandidates) {
      candidateIds.add(candidate.file2);
      if (candidateIds.size >= maxComparisons) break;
    }
  }

  // Calculate precise APTED similarity for candidates in parallel
  const comparisons = await Promise.all(
    Array.from(candidateIds).map(async (otherId) => {
      const otherFile = repo.files.get(otherId);
      if (!otherFile) return null;

      // Use pre-parsed AST if available
      let similarity: number;
      if (file.ast && otherFile.ast) {
        similarity = calculateTSED(file.ast, otherFile.ast, {
          renameCost: 0.3,
        });
      } else {
        similarity = await calculateAPTEDSimilarityAsync(file.content, otherFile.content, {
          renameCost: 0.3,
        });
      }

      if (similarity >= threshold) {
        return {
          file1: fileId,
          file2: otherId,
          similarity,
          method: "apted" as const,
        };
      }
      return null;
    }),
  );

  const results: SimilarityResult[] = comparisons.filter((r) => r !== null).map((r) => r!);
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find all similar pairs in the repository
 */
export function findAllSimilarPairs(
  repo: RepositoryState,
  threshold: number = 0.7,
  method: "minhash" | "simhash" = "minhash",
): SimilarityResult[] {
  const results: SimilarityResult[] = [];
  const processed = new Set<string>();

  for (const [fileId] of repo.files) {
    let similar: SimilarityResult[];

    if (method === "minhash") {
      similar = findSimilarByMinHash(repo, fileId, threshold);
    } else {
      similar = findSimilarBySimHash(repo, fileId, threshold);
    }

    for (const result of similar) {
      // Avoid duplicates (A-B and B-A)
      const pairKey = [result.file1, result.file2].sort().join("|");
      if (!processed.has(pairKey)) {
        processed.add(pairKey);
        results.push(result);
      }
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find code clones (highly similar code)
 */
export function findClones(repo: RepositoryState, threshold: number = 0.9): Map<string, string[]> {
  const cloneGroups = new Map<string, string[]>();

  // Find all highly similar pairs
  const similarPairs = findAllSimilarPairs(repo, threshold, "minhash");

  // Group clones using union-find
  const parent = new Map<string, string>();

  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(x: string, y: string): void {
    const px = find(x);
    const py = find(y);
    if (px !== py) {
      parent.set(px, py);
    }
  }

  // Union similar files
  for (const { file1, file2 } of similarPairs) {
    union(file1, file2);
  }

  // Group by representative
  for (const [fileId] of repo.files) {
    const rep = find(fileId);
    if (!cloneGroups.has(rep)) {
      cloneGroups.set(rep, []);
    }
    cloneGroups.get(rep)!.push(fileId);
  }

  // Filter out groups with only one file
  for (const [rep, group] of cloneGroups) {
    if (group.length <= 1) {
      cloneGroups.delete(rep);
    }
  }

  return cloneGroups;
}

/**
 * Get statistics about the repository
 */
export function getStatistics(repo: RepositoryState): {
  totalFiles: number;
  averageTokens: number;
  uniqueTokens: number;
} {
  let totalTokens = 0;
  const allTokens = new Set<string>();

  for (const [_, file] of repo.files) {
    const tokens = extractTokens(file.content);
    totalTokens += tokens.size;
    tokens.forEach((t) => allTokens.add(t));
  }

  return {
    totalFiles: repo.files.size,
    averageTokens: repo.files.size > 0 ? totalTokens / repo.files.size : 0,
    uniqueTokens: allTokens.size,
  };
}
