import { MinHash, LSH, SimHash, extractTokens, extractFeatures } from './code_index.ts';
import { calculateSimilarityAPTED } from './oxc_similarity.ts';
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { glob } from 'glob';

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

/**
 * Code repository for multi-file similarity analysis
 */
export class CodeRepository {
  private files: Map<string, CodeFile> = new Map();
  private minHash: MinHash;
  private lsh: LSH;
  private simHash: SimHash;
  
  constructor(
    private minHashSize: number = 128,
    private lshBands: number = 16,
    private simHashBits: number = 64
  ) {
    this.minHash = new MinHash(minHashSize);
    this.lsh = new LSH(minHashSize, lshBands);
    this.simHash = new SimHash(simHashBits);
  }

  /**
   * Load files from a directory pattern
   */
  async loadFiles(pattern: string, basePath: string = '.'): Promise<void> {
    const files = await glob(pattern, { cwd: basePath });
    
    for (const file of files) {
      const fullPath = join(basePath, file);
      const content = readFileSync(fullPath, 'utf-8');
      const id = relative(basePath, fullPath);
      
      this.addFile(id, fullPath, content);
    }
  }

  /**
   * Add a single file to the repository
   */
  addFile(id: string, path: string, content: string): void {
    // Extract tokens for MinHash
    const tokens = extractTokens(content);
    const minHashSignature = this.minHash.signature(tokens);
    
    // Extract features for SimHash
    const features = extractFeatures(content);
    const simHashValue = this.simHash.hash(features);
    
    const file: CodeFile = {
      id,
      path,
      content,
      minHashSignature,
      simHash: simHashValue
    };
    
    this.files.set(id, file);
    
    // Add to LSH index
    this.lsh.add(id, minHashSignature);
  }

  /**
   * Find similar files using MinHash/LSH
   */
  findSimilarByMinHash(fileId: string, threshold: number = 0.7): SimilarityResult[] {
    const file = this.files.get(fileId);
    if (!file || !file.minHashSignature) return [];
    
    // For small repositories, calculate similarity with all files
    if (this.files.size < 100) {
      const results: SimilarityResult[] = [];
      
      for (const [otherId, otherFile] of this.files) {
        if (otherId === fileId || !otherFile.minHashSignature) continue;
        
        const similarity = this.minHash.similarity(file.minHashSignature, otherFile.minHashSignature);
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
    const similar = this.lsh.findSimilar(file.minHashSignature, threshold);
    
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
  findSimilarBySimHash(fileId: string, threshold: number = 0.8): SimilarityResult[] {
    const file = this.files.get(fileId);
    if (!file || !file.simHash) return [];
    
    const results: SimilarityResult[] = [];
    
    for (const [otherId, otherFile] of this.files) {
      if (otherId === fileId || !otherFile.simHash) continue;
      
      const similarity = this.simHash.similarity(file.simHash, otherFile.simHash);
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
  findSimilarByAPTED(fileId: string, threshold: number = 0.7, maxComparisons: number = 100): SimilarityResult[] {
    const file = this.files.get(fileId);
    if (!file) return [];
    
    // First, get candidates using MinHash
    const candidates = this.findSimilarByMinHash(fileId, threshold * 0.7);
    const candidateIds = new Set(candidates.map(c => c.file2));
    
    // If not enough candidates, add some based on SimHash
    if (candidateIds.size < maxComparisons / 2) {
      const simHashCandidates = this.findSimilarBySimHash(fileId, threshold * 0.7);
      for (const candidate of simHashCandidates) {
        candidateIds.add(candidate.file2);
        if (candidateIds.size >= maxComparisons) break;
      }
    }
    
    // Calculate precise APTED similarity for candidates
    const results: SimilarityResult[] = [];
    
    for (const otherId of candidateIds) {
      const otherFile = this.files.get(otherId);
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
  findAllSimilarPairs(threshold: number = 0.7, method: 'minhash' | 'simhash' = 'minhash'): SimilarityResult[] {
    const results: SimilarityResult[] = [];
    const processed = new Set<string>();
    
    for (const [fileId] of this.files) {
      let similar: SimilarityResult[];
      
      if (method === 'minhash') {
        similar = this.findSimilarByMinHash(fileId, threshold);
      } else {
        similar = this.findSimilarBySimHash(fileId, threshold);
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
  findClones(threshold: number = 0.9): Map<string, string[]> {
    const cloneGroups = new Map<string, string[]>();
    const assigned = new Set<string>();
    
    // Find all highly similar pairs
    const similarPairs = this.findAllSimilarPairs(threshold, 'minhash');
    
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
    for (const [fileId] of this.files) {
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
  getStatistics(): {
    totalFiles: number;
    averageTokens: number;
    uniqueTokens: number;
  } {
    let totalTokens = 0;
    const allTokens = new Set<string>();
    
    for (const [_, file] of this.files) {
      const tokens = extractTokens(file.content);
      totalTokens += tokens.size;
      tokens.forEach(t => allTokens.add(t));
    }
    
    return {
      totalFiles: this.files.size,
      averageTokens: this.files.size > 0 ? totalTokens / this.files.size : 0,
      uniqueTokens: allTokens.size
    };
  }
}