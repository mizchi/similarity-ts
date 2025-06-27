# Multi-File Code Similarity Analysis

This document explains the algorithms and techniques used for efficient multi-file code similarity analysis in large codebases.

## Problem Statement

When analyzing code similarity across many files (N files), a naive approach would require N² comparisons, which becomes impractical for large codebases. We need efficient algorithms to:

1. Find similar code to a given file
2. Find all similar pairs in a codebase
3. Detect code clones
4. Scale to thousands of files

## Solution: Index-Based Similarity Search

### 1. MinHash + LSH (Locality-Sensitive Hashing)

**Purpose**: Fast approximate similarity search based on token sets

**How it works**:

- Extract tokens from each file's AST
- Generate MinHash signatures (fixed-size fingerprints)
- Use LSH to group similar signatures into buckets
- Only compare files in the same buckets

**Characteristics**:

- Time: O(1) query, O(N) preprocessing
- Space: O(N × signature_size)
- Accuracy: Approximates Jaccard similarity
- Best for: Token-based similarity, variable renaming detection

```typescript
const repo = new CodeRepository();
await repo.loadFiles("**/*.ts");
const similar = repo.findSimilarByMinHash("file.ts", 0.7);
```

### 2. SimHash

**Purpose**: Capture structural similarity using weighted features

**How it works**:

- Extract weighted features from AST (node types, depths, patterns)
- Generate hash where similar structures have similar hash values
- Use Hamming distance to measure similarity

**Characteristics**:

- Time: O(N) for all comparisons
- Space: O(N) (one hash per file)
- Accuracy: Good for structural patterns
- Best for: Detecting similar code patterns, refactoring opportunities

```typescript
const similar = repo.findSimilarBySimHash("file.ts", 0.8);
```

### 3. Hybrid Approach

**Purpose**: Balance speed and accuracy

**Strategy**:

1. Use MinHash/SimHash for candidate selection
2. Apply APTED for precise similarity on candidates
3. Limit expensive comparisons to promising pairs

```typescript
const candidates = repo.findSimilarByMinHash(file, 0.5);
const precise = repo.findSimilarByAPTED(file, 0.7, maxCandidates);
```

## Implementation Details

### Token Extraction

Tokens are extracted from the AST to capture:

- Node types (FunctionDeclaration, ClassDeclaration, etc.)
- Identifier names with context (id:name, name:value)
- Literal values for constants
- Structural information

### Feature Extraction

Features for SimHash include:

- Node type at depth (e.g., "FunctionDeclaration@2")
- Aggregate counts (number of functions, classes)
- TypeScript-specific features
- Complexity indicators

### LSH Configuration

Key parameters:

- **Signature size**: 128 (higher = more accurate)
- **Bands**: 16 (more bands = higher recall)
- **Rows per band**: 8 (signature_size / bands)

The probability of detection follows: P = 1 - (1 - s^r)^b
where s = similarity, r = rows, b = bands

### Performance Optimization

1. **Batch Processing**: Process multiple files in parallel
2. **Caching**: Store computed signatures and hashes
3. **Progressive Refinement**: Start with fast algorithms, refine with accurate ones
4. **Threshold Tuning**: Adjust thresholds based on use case

## Use Cases

### 1. Code Clone Detection

Find groups of highly similar code:

```typescript
const clones = repo.findClones(0.9);
// Returns Map<representative, [files in group]>
```

### 2. Refactoring Opportunities

Find similar patterns that could be abstracted:

```typescript
const patterns = repo.findAllSimilarPairs(0.7, "simhash");
```

### 3. Code Review Assistance

Find similar existing code when reviewing new changes:

```typescript
const existing = repo.findSimilarByAPTED(newFile, 0.8);
```

### 4. Technical Debt Analysis

Identify duplicated logic across the codebase:

```typescript
const stats = repo.getStatistics();
const duplication = clones.size / stats.totalFiles;
```

## Algorithm Comparison

| Algorithm   | Speed     | Memory | Accuracy  | Use Case           |
| ----------- | --------- | ------ | --------- | ------------------ |
| MinHash/LSH | Very Fast | Medium | Good      | Large-scale search |
| SimHash     | Fast      | Low    | Good      | Pattern detection  |
| APTED       | Slow      | Low    | Excellent | Precise comparison |
| Hybrid      | Fast      | Medium | Excellent | Production systems |

## Limitations and Considerations

1. **Token-based approaches** may miss semantic similarity
2. **Hash collisions** can cause false positives
3. **Threshold selection** requires tuning for each codebase
4. **Language-specific** features may need adjustment

## Future Improvements

1. **Semantic embeddings**: Use ML models for code understanding
2. **Incremental updates**: Update index as code changes
3. **Distributed processing**: Scale to massive codebases
4. **Cross-language support**: Compare code across languages
