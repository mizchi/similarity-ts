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
  LSHState,
  MinHashConfig,
  SimHashConfig
} from '../core/hash.ts';
import { extractTokens, extractFeatures } from '../core/tokens.ts';
import { calculateSimilarityAPTED } from '../core/apted_typed.ts';

export interface CodeFile {
  id: string;
  path: string;
  content: string;
  minHashSignature?: number[];
  simHash?: bigint;
}

export interface SimilarityResult {
  file1: string;
  file2: string;
  similarity: number;
  method: 'minhash' | 'simhash' | 'apted';
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
  simHashBits: number = 64
): RepositoryState {
  return {
    files: new Map(),
    minHashConfig: createMinHashConfig(minHashSize),
    lshState: createLSHState(minHashSize, lshBands),
    simHashConfig: createSimHashConfig(simHashBits)
  };
}

/**
 * Load multiple files into the repository
 * Note: This function now accepts pre-loaded file data to avoid IO operations
 */
export function loadFiles(
  repo: RepositoryState,
  files: Array<{ id: string; path: string; content: string }>
): void {
  for (const file of files) {
    addFile(repo, file.id, file.path, file.content);
  }
}

/**
 * Add a single file to the repository
 */
export function addFile(
  repo: RepositoryState,
  id: string,
  path: string,
  content: string
): void {
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
    simHash: simHashValue
  };
  
  repo.files.set(id, file);
  
  // Add to LSH index
  addToLSH(repo.lshState, id, minHashSignature);
}

/**
 * Find similar files using MinHash/LSH
 */
export function findSimilarByMinHash(
  repo: RepositoryState,
  fileId: string,
  threshold: number = 0.7
): SimilarityResult[] {
  const file = repo.files.get(fileId);
  if (!file || !file.minHashSignature) return [];
  
  // For small repositories, calculate similarity with all files
  if (repo.files.size < 100) {
    const results: SimilarityResult[] = [];
    
    for (const [otherId, otherFile] of repo.files) {
      if (otherId === fileId || !otherFile.minHashSignature) continue;
      
      const similarity = calculateMinHashSimilarity(
        file.minHashSignature,
        otherFile.minHashSignature
      );
      
      if (similarity >= threshold) {
        results.push({
          file1: fileId,
          file2: otherId,
          similarity,
          method: 'minhash'
        });
      }
    }
    
    return results.sort((a, b) => b.similarity - a.similarity);
  }
  
  // For large repositories, use LSH
  const similar = findSimilarLSH(repo.lshState, file.minHashSignature, threshold);
  
  return similar
    .filter(s => s.id !== fileId)
    .map(s => ({
      file1: fileId,
      file2: s.id,
      similarity: s.similarity,
      method: 'minhash' as const
    }));
}

/**
 * Find similar files using SimHash
 */
export function findSimilarBySimHash(
  repo: RepositoryState,
  fileId: string,
  threshold: number = 0.8
): SimilarityResult[] {
  const file = repo.files.get(fileId);
  if (!file || !file.simHash) return [];
  
  const results: SimilarityResult[] = [];
  
  for (const [otherId, otherFile] of repo.files) {
    if (otherId === fileId || !otherFile.simHash) continue;
    
    const similarity = calculateSimHashSimilarity(
      file.simHash,
      otherFile.simHash,
      repo.simHashConfig.bits
    );
    
    if (similarity >= threshold) {
      results.push({
        file1: fileId,
        file2: otherId,
        similarity,
        method: 'simhash'
      });
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find similar files using APTED (more accurate but slower)
 */
export function findSimilarByAPTED(
  repo: RepositoryState,
  fileId: string,
  threshold: number = 0.7,
  maxComparisons: number = 100
): SimilarityResult[] {
  const file = repo.files.get(fileId);
  if (!file) return [];
  
  // First, get candidates using MinHash
  const candidates = findSimilarByMinHash(repo, fileId, threshold * 0.7);
  const candidateIds = new Set(candidates.map(c => c.file2));
  
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
    
    const similarity = calculateSimilarityAPTED(file.content, otherFile.content, {
      renameCost: 0.3
    });
    
    if (similarity >= threshold) {
      results.push({
        file1: fileId,
        file2: otherId,
        similarity,
        method: 'apted'
      });
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find all similar pairs in the repository
 */
export function findAllSimilarPairs(
  repo: RepositoryState,
  threshold: number = 0.7,
  method: 'minhash' | 'simhash' = 'minhash'
): SimilarityResult[] {
  const results: SimilarityResult[] = [];
  const processed = new Set<string>();
  
  for (const [fileId] of repo.files) {
    let similar: SimilarityResult[];
    
    if (method === 'minhash') {
      similar = findSimilarByMinHash(repo, fileId, threshold);
    } else {
      similar = findSimilarBySimHash(repo, fileId, threshold);
    }
    
    for (const result of similar) {
      // Avoid duplicates (A-B and B-A)
      const pairKey = [result.file1, result.file2].sort().join('|');
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
export function findClones(
  repo: RepositoryState,
  threshold: number = 0.9
): Map<string, string[]> {
  const cloneGroups = new Map<string, string[]>();
  
  // Find all highly similar pairs
  const similarPairs = findAllSimilarPairs(repo, threshold, 'minhash');
  
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
    tokens.forEach(t => allTokens.add(t));
  }
  
  return {
    totalFiles: repo.files.size,
    averageTokens: repo.files.size > 0 ? totalTokens / repo.files.size : 0,
    uniqueTokens: allTokens.size
  };
}