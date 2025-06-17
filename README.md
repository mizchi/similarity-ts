under development

---

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

### Quick CLI Example

```bash
# Analyze your project for code duplication
npx ts-similarity ./src -t 0.8

# Get JSON output for CI/CD integration
npx ts-similarity ./src -t 0.9 -j -o similarity-report.json
```

## Usage

### Basic Usage (Levenshtein)

```typescript
import { calculateSimilarity } from "./src/index.ts";

const code1 = `function add(a: number, b: number) { return a + b; }`;
const code2 = `function sum(x: number, y: number) { return x + y; }`;

const score = calculateSimilarity(code1, code2);
console.log(`Similarity: ${(score * 100).toFixed(1)}%`);
```

### Using APTED Algorithm

```typescript
import { calculateAPTEDSimilarity } from "./src/index.ts";

// Use APTED algorithm (recommended for structural comparison)
const score = calculateAPTEDSimilarity(code1, code2);
console.log(`APTED Similarity: ${(score * 100).toFixed(1)}%`);
```

**Note**: APTED now uses `renameCost: 0.3` by default for better handling of identifier changes. You can override this:

```typescript
import { calculateAPTEDSimilarity } from "./src/index.ts";

// Custom APTED configuration
const score = calculateAPTEDSimilarity(code1, code2, {
  deleteCost: 1.0,
  insertCost: 1.0,
  renameCost: 0.5, // Override default rename cost
});
```

## Real-World Examples

### Example 1: Detecting Renamed Functions

```typescript
const code1 = `
function calculateUserScore(user: User, bonusPoints: number): number {
  return user.baseScore + bonusPoints;
}`;

const code2 = `
function computePlayerRating(player: Player, extraPoints: number): number {
  return player.baseScore + extraPoints;
}`;

import { calculateAPTEDSimilarity } from "./src/index.ts";

console.log(calculateAPTEDSimilarity(code1, code2)); // ~88.8%
```

### Example 2: Comparing Different Implementations

```typescript
// Imperative style
const code1 = `
class Calculator {
  private result: number = 0;
  
  add(value: number): void {
    this.result += value;
  }
  
  getResult(): number {
    return this.result;
  }
}`;

// Functional style
const code2 = `
const createCalculator = () => {
  let result = 0;
  return {
    add: (value: number) => { result += value; },
    getResult: () => result
  };
};`;

console.log(calculateAPTEDSimilarity(code1, code2)); // ~45% (different paradigms)
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

### Basic Functions

#### `calculateSimilarity(code1: string, code2: string): number`

Calculate similarity using Levenshtein algorithm. Returns a score between 0 and 1.

#### `calculateAPTEDSimilarity(code1: string, code2: string, config?: APTEDConfig): number`

Calculate similarity using APTED algorithm. Better for structural comparison and handling renamed identifiers.

#### `getDetailedReport(code1: string, code2: string, options?: SimilarityOptions): DetailedReport`

Returns detailed information including similarity score, AST structures, and algorithm used.

#### `parse(code: string, filename?: string): AST`

Parse TypeScript code and return the AST.

### Repository Functions

#### `createRepository(): Repository`

Create a new empty code repository.

#### `loadFilesIntoRepository(repo: Repository, pattern: string): Promise<Repository>`

Load files from a glob pattern into the repository.

#### `findSimilarFiles(repo: Repository, filePath: string, threshold: number, method?: 'minhash' | 'simhash'): SimilarityResult[]`

Find files similar to a given file.

#### `findAllSimilarPairs(repo: Repository, threshold: number, method?: 'minhash' | 'simhash'): SimilarityResult[]`

Find all pairs of similar files in the repository.

#### `findCodeClones(repo: Repository, threshold?: number): CodeFile[][]`

Find groups of code clones (highly similar files).

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

| Feature          | Levenshtein                        | APTED (default)                  |
| ---------------- | ---------------------------------- | -------------------------------- |
| Speed            | Very Fast (~100ms for large files) | Fast (~1-2ms for large files)    |
| Accuracy         | Good for similar structures        | Excellent for structural changes |
| Rename Detection | Limited                            | Optimized (renameCost: 0.3)      |
| Use Case         | Quick similarity checks            | Recommended for code analysis    |

### Similarity Examples

Based on our test suite, here's what different algorithms detect:

#### Similar Code (≥70% threshold)

- **Renamed functions**: `calculateSum` → `addNumbers` = 88.8% (APTED)
- **Renamed classes**: `UserService` → `PersonManager` = 91.8% (APTED)
- **Added async/await**: 92.3% similarity (APTED)

#### Dissimilar Code (<50% threshold)

- **Imperative vs Functional style**: 12.2% (APTED)
- **Function vs Class implementation**: 31.5% (Levenshtein)
- **Different programming paradigms**: Low similarity correctly detected

## Multi-File Similarity Analysis

For analyzing similarity across multiple files in a project, use the `CodeRepository` class:

```typescript
import { createRepository, loadFilesIntoRepository, findSimilarFiles, findCodeClones } from "./src/index.ts";

// Create a repository and load files
let repo = createRepository();
repo = await loadFilesIntoRepository(repo, "src/**/*.ts");

// Find similar files
const similar = findSimilarFiles(repo, "src/index.ts", 0.7, 'minhash');

// Find all code clones
const clones = findCodeClones(repo, 0.9);
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
import { createRepository, loadFilesIntoRepository, findAllSimilarPairs, findCodeClones } from "./src/index.ts";

let repo = createRepository();
repo = await loadFilesIntoRepository(repo, "**/*.ts");

// Find all similar pairs
const pairs = findAllSimilarPairs(repo, 0.8);

// Group clones
const cloneGroups = findCodeClones(repo, 0.9);
```

## Performance

oxc-parser is written in Rust and provides excellent performance for parsing large codebases. The similarity calculation is optimized for efficiency while maintaining accuracy.

### Performance Characteristics

| Method      | Time Complexity   | Space Complexity | Use Case               |
| ----------- | ----------------- | ---------------- | ---------------------- |
| MinHash/LSH | O(1) query        | O(n)             | Fast similarity search |
| SimHash     | O(n) query        | O(n)             | Structural similarity  |
| APTED       | O(n²) per pair    | O(n)             | Accurate similarity    |
| Hybrid      | O(k) where k << n | O(n)             | Best of both worlds    |

## License

ISC
