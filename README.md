# TypeScript Code Similarity with oxc-parser

High-performance TypeScript code similarity calculation using oxc-parser, a Rust-based JavaScript/TypeScript parser.

## Features

- Fast TypeScript/JavaScript code parsing with oxc-parser
- Multiple similarity algorithms:
  - **Levenshtein distance** on serialized AST structures (default, faster)
  - **APTED (All Path Tree Edit Distance)** for more accurate structural comparison
  - **MinHash/LSH** for O(1) similarity search in large codebases
  - **SimHash** for structural pattern detection
- Command-line tool for function-level similarity analysis
- Support for all TypeScript language features
- Configurable operation costs for APTED algorithm
- Simple and efficient API

## Installation

```bash
pnpm install
```

## CLI Usage

The package includes a command-line tool for analyzing function-level similarity across TypeScript projects:

```bash
# Find similar functions in a directory
npx ts-similarity ./src

# With custom threshold
npx ts-similarity ./src -t 0.8

# JSON output
npx ts-similarity ./src -j -o results.json
```

See [CLI.md](./CLI.md) for detailed CLI documentation.

## Usage

### Basic Usage (Levenshtein)

```typescript
import { CodeSimilarity } from './src/index.ts';

const similarity = new CodeSimilarity();

const code1 = `function add(a: number, b: number) { return a + b; }`;
const code2 = `function sum(x: number, y: number) { return x + y; }`;

const score = similarity.calculateSimilarity(code1, code2);
console.log(`Similarity: ${(score * 100).toFixed(1)}%`);
```

### Using APTED Algorithm

```typescript
import { CodeSimilarity } from './src/index.ts';

// Use APTED with custom rename cost
const similarity = new CodeSimilarity({
  useAPTED: true,
  config: {
    deleteCost: 1.0,
    insertCost: 1.0,
    renameCost: 0.3  // Lower cost for renaming operations
  }
});

const score = similarity.calculateSimilarity(code1, code2);
console.log(`APTED Similarity: ${(score * 100).toFixed(1)}%`);
```

## Examples

Run the examples:
```bash
pnpm run example
```

Run tests:
```bash
pnpm run test
```

## API

### `calculateSimilarity(code1, code2)`
Returns a similarity score between 0 and 1.

### `getDetailedReport(code1, code2)`
Returns detailed information including similarity score and AST structures.

### `parse(code, filename?)`
Parse TypeScript code and return the AST.

## How it Works

### Levenshtein Algorithm (Default)
1. **AST Parsing**: Uses oxc-parser to parse TypeScript/JavaScript code into Abstract Syntax Trees
2. **Structure Extraction**: Converts AST nodes into a simplified string representation
3. **Similarity Calculation**: Uses Levenshtein distance to calculate similarity between AST structures
4. **Normalization**: Returns a score between 0 and 1 (1 = identical, 0 = completely different)

### APTED Algorithm
1. **AST Parsing**: Uses oxc-parser to parse TypeScript/JavaScript code into Abstract Syntax Trees
2. **Tree Construction**: Converts AST into a tree structure with parent-child relationships
3. **Edit Distance**: Calculates the minimum edit operations (insert, delete, rename) to transform one tree to another
4. **TSED Normalization**: Applies the formula: `TSED = max{1 - δ/MaxNodes(G1, G2), 0}`

## Algorithm Comparison

| Feature | Levenshtein | APTED |
|---------|-------------|--------|
| Speed | Very Fast (~100ms for large files) | Fast (~1-2ms for large files) |
| Accuracy | Good for similar structures | Better for structural changes |
| Rename Detection | Limited | Configurable rename cost |
| Use Case | Quick similarity checks | Detailed structural analysis |

## Multi-File Similarity Analysis

For analyzing similarity across multiple files in a project, use the `CodeRepository` class:

```typescript
import { CodeRepository } from './src/index.ts';

const repo = new CodeRepository();

// Load files from a directory
await repo.loadFiles('src/**/*.ts');

// Find similar files
const similar = repo.findSimilarByMinHash('src/index.ts', 0.7);

// Find all code clones
const clones = repo.findClones(0.9);
```

### Indexing Algorithms

1. **MinHash + LSH**
   - Fast approximate similarity search
   - Good for token-based similarity
   - O(1) query time with LSH

2. **SimHash**
   - Captures structural similarity
   - Good for detecting similar code patterns
   - Efficient for large codebases

3. **Hybrid Approach**
   - Use MinHash/SimHash for candidate selection
   - Use APTED for precise similarity calculation
   - Balances speed and accuracy

### Example: Finding Code Clones

```typescript
const repo = new CodeRepository();
await repo.loadFiles('**/*.ts');

// Find all similar pairs
const pairs = repo.findAllSimilarPairs(0.8);

// Group clones
const cloneGroups = repo.findClones(0.9);
```

## Performance

oxc-parser is written in Rust and provides excellent performance for parsing large codebases. The similarity calculation is optimized for efficiency while maintaining accuracy.

### Performance Characteristics

| Method | Time Complexity | Space Complexity | Use Case |
|--------|----------------|------------------|----------|
| MinHash/LSH | O(1) query | O(n) | Fast similarity search |
| SimHash | O(n) query | O(n) | Structural similarity |
| APTED | O(n²) per pair | O(n) | Accurate similarity |
| Hybrid | O(k) where k << n | O(n) | Best of both worlds |

## License

ISC