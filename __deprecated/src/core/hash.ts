// Hash-related pure functions from code_index.ts

export interface MinHashConfig {
  numHashes: number;
  hashFunctions: Array<(token: string) => number>;
}

export interface SimHashConfig {
  bits: number;
}

export interface LSHState {
  bands: Map<number, Map<string, string[]>>;
  numBands: number;
  rowsPerBand: number;
}

/**
 * Generate multiple hash functions for MinHash
 */
function generateHashFunctions(num: number): Array<(token: string) => number> {
  const functions: Array<(token: string) => number> = [];

  // Use different random seeds for each hash function
  for (let i = 0; i < num; i++) {
    const seed = i + 1;

    functions.push((token: string) => {
      // Simple hash function with seed
      let hash = seed;
      for (let j = 0; j < token.length; j++) {
        hash = ((hash << 5) - hash + token.charCodeAt(j)) | 0;
        hash = hash >>> 0; // Convert to unsigned
      }
      // Mix the bits more
      hash = ((hash << 13) | (hash >>> 19)) + seed;
      return hash >>> 0;
    });
  }

  return functions;
}

/**
 * Create MinHash configuration
 */
export function createMinHashConfig(numHashes: number = 128): MinHashConfig {
  return {
    numHashes,
    hashFunctions: generateHashFunctions(numHashes),
  };
}

/**
 * Generate MinHash signature for a set of tokens
 */
export function generateMinHashSignature(tokens: Set<string>, config: MinHashConfig): number[] {
  const signature: number[] = new Array(config.numHashes).fill(Infinity);

  for (const token of tokens) {
    for (let i = 0; i < config.numHashes; i++) {
      const hash = config.hashFunctions[i](token);
      signature[i] = Math.min(signature[i], hash);
    }
  }

  return signature;
}

/**
 * Estimate Jaccard similarity from MinHash signatures
 */
export function calculateMinHashSimilarity(sig1: number[], sig2: number[]): number {
  if (sig1.length !== sig2.length) return 0;

  let matches = 0;
  for (let i = 0; i < sig1.length; i++) {
    if (sig1[i] === sig2[i]) matches++;
  }

  return matches / sig1.length;
}

/**
 * Create LSH (Locality Sensitive Hashing) state
 */
export function createLSHState(signatureLength: number, numBands: number): LSHState {
  return {
    bands: new Map(),
    numBands,
    rowsPerBand: Math.floor(signatureLength / numBands),
  };
}

/**
 * Hash a band for LSH
 */
function hashBand(band: number[]): string {
  return band.join(",");
}

/**
 * Add a signature to the LSH index
 */
export function addToLSH(state: LSHState, id: string, signature: number[]): void {
  for (let b = 0; b < state.numBands; b++) {
    const start = b * state.rowsPerBand;
    const end = start + state.rowsPerBand;
    const band = signature.slice(start, end);
    const bandHash = hashBand(band);

    if (!state.bands.has(b)) {
      state.bands.set(b, new Map());
    }

    const bandMap = state.bands.get(b)!;
    if (!bandMap.has(bandHash)) {
      bandMap.set(bandHash, []);
    }

    bandMap.get(bandHash)!.push(id);
  }
}

/**
 * Find similar items using LSH
 */
export function findSimilarLSH(
  state: LSHState,
  signature: number[],
  threshold: number = 0.5,
): Array<{ id: string; similarity: number }> {
  const candidates = new Map<string, number>();

  // Find candidates
  for (let b = 0; b < state.numBands; b++) {
    const start = b * state.rowsPerBand;
    const end = start + state.rowsPerBand;
    const band = signature.slice(start, end);
    const bandHash = hashBand(band);

    const bandMap = state.bands.get(b);
    if (bandMap && bandMap.has(bandHash)) {
      for (const candidateId of bandMap.get(bandHash)!) {
        candidates.set(candidateId, (candidates.get(candidateId) || 0) + 1);
      }
    }
  }

  // Calculate similarities for candidates
  const results: Array<{ id: string; similarity: number }> = [];
  for (const [id, bandMatches] of candidates) {
    const estimatedSimilarity = bandMatches / state.numBands;
    if (estimatedSimilarity >= threshold) {
      results.push({ id, similarity: estimatedSimilarity });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Create SimHash configuration
 */
export function createSimHashConfig(bits: number = 64): SimHashConfig {
  return { bits };
}

/**
 * Simple string hash function for SimHash
 */
function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Generate SimHash from weighted features
 */
export function generateSimHash(features: Map<string, number>, config: SimHashConfig): bigint {
  const v = new Array(config.bits).fill(0);

  for (const [feature, weight] of features) {
    const hash = stringHash(feature);
    for (let i = 0; i < config.bits; i++) {
      if ((hash & (1 << (i % 32))) !== 0) {
        v[i] += weight;
      } else {
        v[i] -= weight;
      }
    }
  }

  let simhash = 0n;
  for (let i = 0; i < config.bits; i++) {
    if (v[i] >= 0) {
      simhash |= 1n << BigInt(i);
    }
  }

  return simhash;
}

/**
 * Calculate Hamming distance between two bigints
 */
function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;

  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }

  return count;
}

/**
 * Calculate similarity from SimHash values
 */
export function calculateSimHashSimilarity(hash1: bigint, hash2: bigint, bits: number): number {
  const distance = hammingDistance(hash1, hash2);
  return 1 - distance / bits;
}
