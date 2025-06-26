# similarity-ts

CLI tool for detecting code duplication in TypeScript/JavaScript projects.

## Installation

```bash
cargo install similarity-ts
```

## Usage

```bash
# Check for duplicate functions in current directory
similarity-ts

# Check specific files or directories
similarity-ts src/ lib/

# Set similarity threshold (0.0 to 1.0)
similarity-ts --threshold 0.8

# Filter by minimum tokens (recommended: 20-30)
similarity-ts --min-tokens 25

# Show actual code snippets
similarity-ts --print
```

## Subcommands

### `check` - Check Directory for Duplicates (Default)

Recursively checks a directory for duplicate functions across all files, respecting .gitignore files.

**Options:**

- `-t, --threshold` (default: 0.8) - Similarity threshold (0.0-1.0)
- `--rename-cost` (default: 0.3) - Cost for renaming nodes
- `--within-file` - Only check for duplicates within individual files (default: check across files)
- `--extensions` - Comma-separated list of file extensions (default: ts,tsx,js,jsx)

**Example Output:**

```
Checking 25 files for duplicates...

Duplicates in src/utils/array.ts:
------------------------------------------------------------
  function sortArray (lines 5-12) <-> function orderArray (lines 15-22)
  Similarity: 85.50%

Total duplicate pairs found: 3
```

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
./target/release/similarity-ts functions src/main.ts -t 0.9
```

### Compare Before and After Refactoring

```bash
# Check code similarity before and after refactoring
./target/release/similarity-ts compare old_version.ts new_version.ts
```

### Check for Duplicate Functions Across Multiple Files

```bash
# Check all files in utils directory for duplicate functions
./target/release/similarity-ts cross-file src/utils/*.ts -t 0.85
```
