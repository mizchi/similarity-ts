import { parseTypeScript } from './oxc_similarity.ts';
import { createHash } from 'crypto';

/**
 * MinHash implementation for code similarity indexing
 */
export class MinHash {
  private numHashes: number;
  private hashFunctions: Array<(token: string) => number>;

  constructor(numHashes: number = 128) {
    this.numHashes = numHashes;
    this.hashFunctions = this.generateHashFunctions(numHashes);
  }

  private generateHashFunctions(num: number): Array<(token: string) => number> {
    const functions: Array<(token: string) => number> = [];
    const prime = 2147483647; // 2^31 - 1
    
    for (let i = 0; i < num; i++) {
      const a = (i * 2 + 1) * 314159;
      const b = (i * 2 + 2) * 271828;
      
      functions.push((token: string) => {
        const hash = createHash('sha256').update(token).digest();
        const value = hash.readUInt32BE(0);
        return ((a * value + b) % prime) >>> 0;
      });
    }
    
    return functions;
  }

  /**
   * Generate MinHash signature for a set of tokens
   */
  signature(tokens: Set<string>): number[] {
    const signature = new Array(this.numHashes).fill(Infinity);
    
    for (const token of tokens) {
      for (let i = 0; i < this.numHashes; i++) {
        const hash = this.hashFunctions[i](token);
        signature[i] = Math.min(signature[i], hash);
      }
    }
    
    return signature;
  }

  /**
   * Estimate Jaccard similarity from signatures
   */
  similarity(sig1: number[], sig2: number[]): number {
    let matches = 0;
    for (let i = 0; i < this.numHashes; i++) {
      if (sig1[i] === sig2[i]) matches++;
    }
    return matches / this.numHashes;
  }
}

/**
 * LSH (Locality Sensitive Hashing) for fast similarity search
 */
export class LSH {
  private bands: number;
  private rows: number;
  private buckets: Map<string, Set<string>>;
  private signatures: Map<string, number[]>;

  constructor(numHashes: number = 128, bands: number = 16) {
    this.bands = bands;
    this.rows = numHashes / bands;
    this.buckets = new Map();
    this.signatures = new Map();
  }

  /**
   * Add a code signature to the index
   */
  add(id: string, signature: number[]): void {
    this.signatures.set(id, signature);
    
    // Hash signature into bands
    for (let b = 0; b < this.bands; b++) {
      const start = b * this.rows;
      const end = start + this.rows;
      const band = signature.slice(start, end);
      const bandHash = this.hashBand(band);
      
      const key = `${b}:${bandHash}`;
      if (!this.buckets.has(key)) {
        this.buckets.set(key, new Set());
      }
      this.buckets.get(key)!.add(id);
    }
  }

  /**
   * Find similar codes
   */
  findSimilar(signature: number[], threshold: number = 0.5): Array<{id: string, similarity: number}> {
    const candidates = new Set<string>();
    
    // Find candidates from same buckets
    for (let b = 0; b < this.bands; b++) {
      const start = b * this.rows;
      const end = start + this.rows;
      const band = signature.slice(start, end);
      const bandHash = this.hashBand(band);
      
      const key = `${b}:${bandHash}`;
      if (this.buckets.has(key)) {
        for (const id of this.buckets.get(key)!) {
          candidates.add(id);
        }
      }
    }
    
    // If no candidates found via LSH, check all signatures (fallback for small datasets)
    if (candidates.size === 0 && this.signatures.size < 100) {
      for (const [id] of this.signatures) {
        candidates.add(id);
      }
    }
    
    // Calculate actual similarities for candidates
    const results: Array<{id: string, similarity: number}> = [];
    const minHash = new MinHash(signature.length);
    
    for (const id of candidates) {
      const candidateSig = this.signatures.get(id)!;
      const similarity = minHash.similarity(signature, candidateSig);
      if (similarity >= threshold) {
        results.push({ id, similarity });
      }
    }
    
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  private hashBand(band: number[]): string {
    return band.join(',');
  }
}

/**
 * SimHash for structural similarity
 */
export class SimHash {
  private bits: number;

  constructor(bits: number = 64) {
    this.bits = bits;
  }

  /**
   * Generate SimHash from features
   */
  hash(features: Map<string, number>): bigint {
    const v = new Array(this.bits).fill(0);
    
    for (const [feature, weight] of features) {
      const featureHash = this.stringHash(feature);
      
      for (let i = 0; i < this.bits; i++) {
        const bit = (featureHash >> BigInt(i)) & 1n;
        v[i] += bit === 1n ? weight : -weight;
      }
    }
    
    let simhash = 0n;
    for (let i = 0; i < this.bits; i++) {
      if (v[i] >= 0) {
        simhash |= (1n << BigInt(i));
      }
    }
    
    return simhash;
  }

  /**
   * Calculate Hamming distance between two SimHashes
   */
  hammingDistance(hash1: bigint, hash2: bigint): number {
    let xor = hash1 ^ hash2;
    let distance = 0;
    
    while (xor > 0n) {
      distance += Number(xor & 1n);
      xor >>= 1n;
    }
    
    return distance;
  }

  /**
   * Calculate similarity from Hamming distance
   */
  similarity(hash1: bigint, hash2: bigint): number {
    const distance = this.hammingDistance(hash1, hash2);
    return 1 - (distance / this.bits);
  }

  private stringHash(str: string): bigint {
    const hash = createHash('sha256').update(str).digest();
    return BigInt('0x' + hash.toString('hex').slice(0, 16));
  }
}

/**
 * Extract tokens from AST for MinHash
 */
export function extractTokens(code: string): Set<string> {
  const tokens = new Set<string>();
  const ast = parseTypeScript('code.ts', code);
  
  if (ast.errors.length > 0) {
    // Fallback to simple tokenization
    const simpleTokens = code
      .split(/\s+/)
      .filter(t => t.length > 0 && !t.match(/^\/\//));
    return new Set(simpleTokens);
  }
  
  const visited = new WeakSet();
  const stack = [ast.program];
  
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object' || visited.has(node)) continue;
    visited.add(node);
    
    // Extract meaningful tokens
    if (node.type) {
      tokens.add(node.type);
      
      // Add identifier names
      if (node.name && typeof node.name === 'string') {
        tokens.add(`name:${node.name}`);
      }
      if (node.id?.name) {
        tokens.add(`id:${node.id.name}`);
      }
      
      // Add literal values (for constants)
      if (node.value !== undefined && typeof node.value !== 'object') {
        tokens.add(`val:${node.value}`);
      }
    }
    
    // Traverse children
    for (const key in node) {
      if (key === 'parent' || key === 'scope') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        stack.push(...value.filter(v => v && typeof v === 'object'));
      } else if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }
  
  return tokens;
}

/**
 * Extract weighted features for SimHash
 */
export function extractFeatures(code: string): Map<string, number> {
  const features = new Map<string, number>();
  const ast = parseTypeScript('code.ts', code);
  
  if (ast.errors.length > 0) {
    // Fallback features
    features.set('error', 1);
    return features;
  }
  
  const visited = new WeakSet();
  const stack = [{ node: ast.program, depth: 0 }];
  
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (!node || typeof node !== 'object' || visited.has(node)) continue;
    visited.add(node);
    
    if (node.type) {
      // Feature: node type at depth
      const depthFeature = `${node.type}@${Math.min(depth, 5)}`;
      features.set(depthFeature, (features.get(depthFeature) || 0) + 1);
      
      // Feature: node type
      features.set(node.type, (features.get(node.type) || 0) + 1);
      
      // Special features for specific node types
      if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        const paramCount = node.params?.length || 0;
        features.set(`func_params:${paramCount}`, 1);
      }
      
      if (node.type === 'ClassDeclaration') {
        features.set('has_class', 1);
      }
      
      if (node.type.includes('TS')) {
        features.set('has_typescript', 1);
      }
    }
    
    // Traverse children
    for (const key in node) {
      if (key === 'parent' || key === 'scope') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (v && typeof v === 'object') {
            stack.push({ node: v, depth: depth + 1 });
          }
        });
      } else if (value && typeof value === 'object') {
        stack.push({ node: value, depth: depth + 1 });
      }
    }
  }
  
  return features;
}