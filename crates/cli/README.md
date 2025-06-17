# ts-similarity CLI (Rust Version)

A command-line tool for calculating TypeScript code similarity.

## Installation

```bash
# Build from the repository root
cargo build --release

# The binary will be generated at:
./target/release/ts-similarity
```

## Usage

### Basic Usage (Compare Two Files)

```bash
# Compare with default parameters
./target/release/ts-similarity file1.ts file2.ts

# Or use the compare subcommand
./target/release/ts-similarity compare file1.ts file2.ts
```

### Advanced Parameters

```bash
./target/release/ts-similarity compare file1.ts file2.ts \
  --rename-cost 0.3 \
  --delete-cost 1.0 \
  --insert-cost 1.0
```

### Find Similar Functions in a Single File

```bash
# Detect with default threshold (70%)
./target/release/ts-similarity functions src/utils.ts

# Specify threshold (80% or higher similarity)
./target/release/ts-similarity functions src/utils.ts -t 0.8

# Also adjust rename cost
./target/release/ts-similarity functions src/utils.ts -t 0.8 --rename-cost 0.2
```

### Find Similar Functions Across Multiple Files

```bash
# Detect similar functions across multiple files
./target/release/ts-similarity cross-file src/file1.ts src/file2.ts src/file3.ts

# Specify threshold
./target/release/ts-similarity cross-file src/*.ts -t 0.85
```

## Subcommands

### `compare` - Compare Entire Files

Calculates the similarity between two complete TypeScript files.

**Options:**
- `--rename-cost` (default: 0.3) - Cost for renaming nodes
- `--delete-cost` (default: 1.0) - Cost for deleting nodes
- `--insert-cost` (default: 1.0) - Cost for inserting nodes

**Example Output:**
```
TSED Similarity: 85.50%
Distance: 0.1450
```

### `functions` - Find Similar Functions in a Single File

Detects similar functions within a single file.

**Options:**
- `-t, --threshold` (default: 0.7) - Similarity threshold (0.0-1.0)
- `--rename-cost` (default: 0.3) - Cost for renaming nodes

**Example Output:**
```
Similar functions in src/utils.ts:
============================================================

function calculateTotal (lines 3-9) <-> function computeSum (lines 11-17)
Similarity: 88.00%

arrow getTotalPrice (lines 25-27) <-> function calculateOrderTotal (lines 29-35)
Similarity: 90.00%
```

### `cross-file` - Find Similar Functions Across Files

Detects similar functions across multiple files.

**Options:**
- `-t, --threshold` (default: 0.7) - Similarity threshold (0.0-1.0)
- `--rename-cost` (default: 0.3) - Cost for renaming nodes

**Example Output:**
```
Similar functions across files:
============================================================

file1.ts:processUser (lines 5-10) <-> file2.ts:handleUser (lines 3-8)
Similarity: 92.00%

file1.ts:validateInput (lines 15-20) <-> file3.ts:checkInput (lines 7-12)
Similarity: 85.00%
```

## Algorithms

This tool uses the following algorithms:

- **APTED (All Path Tree Edit Distance)**: Calculates structural similarity
- **TSED (Tree Similarity of Edit Distance)**: Normalized similarity score (0-1 range)

## Performance

Compared to the TypeScript implementation:
- Medium files: ~16x faster
- Large files: Better memory efficiency, can handle cases where TypeScript version runs out of memory

## Notes

- Supports both TypeScript and JavaScript files
- Uses oxc-parser for fast parsing
- Focuses on structural similarity of functions

## Examples

### Code Duplication Detection

```bash
# Detect duplicate code in your project
./target/release/ts-similarity functions src/main.ts -t 0.9
```

### Compare Before and After Refactoring

```bash
# Check code similarity before and after refactoring
./target/release/ts-similarity compare old_version.ts new_version.ts
```

### Check for Duplicate Functions Across Multiple Files

```bash
# Check all files in utils directory for duplicate functions
./target/release/ts-similarity cross-file src/utils/*.ts -t 0.85
```