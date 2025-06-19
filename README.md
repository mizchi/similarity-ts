# similarity-ts

High-performance TypeScript/JavaScript code similarity detection tool written in Rust. Detects duplicate functions and similar type definitions across your codebase.

## Features

- **Zero configuration** - works out of the box with sensible defaults
- **Function similarity detection** using AST-based comparison
- **Type similarity detection** for interfaces, type aliases, and type literals
- **Cross-file analysis** to find duplicates across your entire project
- **Configurable thresholds** for similarity detection
- **VSCode-compatible output** for easy navigation
- **High performance** with concurrent file processing
- **Wide file support** for .ts, .tsx, .js, .jsx, .mjs, .cjs, .mts, .cts files
- **Smart filtering** with minimum line thresholds and size penalties

## Documentation

- [AI Assistant Guide](.claude/commands/check-similarity.md) - Refactoring workflow and best practices

## Installation

### From source

```bash
# Clone the repository
git clone https://github.com/mizchi/similarity-ts.git
cd similarity-ts

# Build and install
cargo install --path crates/cli

# Or use directly after building
cargo build --release
./target/release/similarity-ts --help
```

### Using cargo install

```bash
# Install from crates.io
cargo install similarity-ts

# Use the installed binary
similarity-ts --help
```

## Quick Start

```bash
# Just run it! Zero configuration needed
similarity-ts

# Analyze specific paths
similarity-ts src/ lib/

# Use custom threshold
similarity-ts . -t 0.9

# Print code details
similarity-ts . --print

# Check functions only (default)
similarity-ts .

# Enable type checking (experimental)
similarity-ts . --experimental-types

# Check types only
similarity-ts . --no-functions --experimental-types
```

## Usage

By default, `similarity-ts` runs function similarity detection only. Type similarity detection is experimental and can be enabled with the `--experimental-types` flag.

### Function Similarity Detection

```bash
# Check for duplicate functions in a directory (default: current directory)
# Fast mode with AST-based bloom filter is enabled by default
similarity-ts ./src

# Disable fast mode (use traditional comparison)
similarity-ts ./src --no-fast

# Adjust similarity threshold (0.0-1.0, default: 0.8)
similarity-ts ./src --threshold 0.9

# Print function code in output
similarity-ts ./src --print

# Filter by minimum function size (default: 5 lines)
similarity-ts ./src --min-lines 10

# Check specific file extensions (default: ts,tsx,js,jsx,mjs,cjs,mts,cts)
similarity-ts ./src --extensions ts,tsx
```

### Type Similarity Detection (Experimental)

```bash
# Enable type checking along with functions
similarity-ts ./src --experimental-types

# Check for similar type definitions (types only)
similarity-ts ./src --no-functions --experimental-types

# Print type definitions in output
similarity-ts ./src --no-functions --experimental-types --print

# Check only interfaces or type aliases
similarity-ts ./src --experimental-types --interfaces-only
similarity-ts ./src --experimental-types --types-only

# Include type literals (function parameters, return types, etc.)
similarity-ts ./src --experimental-types --include-type-literals

# Adjust weights for structural vs naming similarity
similarity-ts ./src --experimental-types --structural-weight 0.7 --naming-weight 0.3
```

## Output Format

The tool outputs in a VSCode-compatible format for easy navigation:

```
Duplicates in src/utils.ts:
────────────────────────────────────────────────────────────
  src/utils.ts:10 | L10-15 similar-function: calculateSum
  src/utils.ts:20 | L20-25 similar-function: addNumbers
  Similarity: 85.00%, Priority: 8.5 (lines: 10)
```

Click on the file paths in VSCode's terminal to jump directly to the code.

Results are sorted by priority (lines × similarity) to help you focus on the most impactful duplications first.

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
similarity-ts ./src --threshold 0.7 --print

# Find similar types across files
similarity-ts ./src --no-functions --experimental-types --cross-file --print

# Comprehensive analysis with custom settings
similarity-ts ./src \
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
- **Fast mode (default)**: Uses AST-based bloom filters for pre-filtering
  - ~4x faster on large codebases
  - 90%+ comparison reduction through intelligent filtering
  - Maintains accuracy while improving performance
  - Disable with `--no-fast` if needed

## License

MIT