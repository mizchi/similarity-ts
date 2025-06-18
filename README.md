# ts-similarity

High-performance TypeScript/JavaScript code similarity detection tool written in Rust. Detects duplicate functions and similar type definitions across your codebase.

## Features

- **Function similarity detection** using AST-based comparison
- **Type similarity detection** for interfaces, type aliases, and type literals
- **Cross-file analysis** to find duplicates across your entire project
- **Configurable thresholds** for similarity detection
- **VSCode-compatible output** for easy navigation
- **High performance** with concurrent file processing
- **Smart filtering** with minimum line thresholds and size penalties

## Installation

### From source

```bash
# Clone the repository
git clone https://github.com/mizchi/ts-similarity.git
cd ts-similarity

# Build and install
cargo install --path crates/cli

# Or use directly after building
cargo build --release
./target/release/ts-similarity --help
```

### Using cargo install

```bash
# Install directly from GitHub
cargo install --git https://github.com/mizchi/ts-similarity ts-similarity-cli

# Use the installed binary
ts-similarity --help
```

## Usage

### Function Similarity Detection

```bash
# Check for duplicate functions in a directory
ts-similarity functions ./src

# Check across files (not just within files)
ts-similarity functions ./src --cross-file

# Adjust similarity threshold (0.0-1.0, default: 0.7)
ts-similarity functions ./src --threshold 0.8

# Show function code in output
ts-similarity functions ./src --show

# Filter by minimum function size (default: 5 lines)
ts-similarity functions ./src --min-lines 10

# Check specific file extensions
ts-similarity functions ./src --extensions ts,tsx
```

### Type Similarity Detection

```bash
# Check for similar type definitions
ts-similarity types ./src

# Show type definitions in output
ts-similarity types ./src --show

# Check only interfaces or type aliases
ts-similarity types ./src --interfaces-only
ts-similarity types ./src --types-only

# Include type literals (function parameters, return types, etc.)
ts-similarity types ./src --include-type-literals

# Adjust weights for structural vs naming similarity
ts-similarity types ./src --structural-weight 0.7 --naming-weight 0.3
```

## Output Format

The tool outputs in a VSCode-compatible format for easy navigation:

```
Duplicates in src/utils.ts:
------------------------------------------------------------
  src/utils.ts:10 | L10-15 similar-function: calculateSum
  src/utils.ts:20 | L20-25 similar-function: addNumbers
  Similarity: 85.00%, Impact: 10 lines
```

Click on the file paths in VSCode's terminal to jump directly to the code.

## How It Works

### Function Similarity

1. **AST Parsing**: Uses oxc-parser to parse TypeScript/JavaScript into ASTs
2. **Tree Extraction**: Extracts function nodes with their structure
3. **APTED Algorithm**: Calculates tree edit distance with configurable costs
4. **Similarity Score**: Normalized score between 0 and 1
5. **Impact Calculation**: Considers code size for prioritization

### Type Similarity

1. **Type Extraction**: Identifies interfaces, type aliases, and type literals
2. **Structural Comparison**: Compares properties, methods, and signatures
3. **Naming Analysis**: Uses Levenshtein distance for identifier similarity
4. **Weighted Scoring**: Combines structural and naming similarity

## Examples

```bash
# Find duplicate functions in your project
ts-similarity functions ./src --threshold 0.7 --show

# Find similar types across files
ts-similarity types ./src --cross-file --show

# Comprehensive analysis with custom settings
ts-similarity functions ./src \
  --threshold 0.8 \
  --min-lines 10 \
  --cross-file \
  --extensions ts,tsx \
  --no-size-penalty
```

## Performance

- Written in Rust for maximum performance
- Concurrent file processing
- Efficient AST traversal with oxc-parser
- Memory-efficient algorithms

## License

ISC