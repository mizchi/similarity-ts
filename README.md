# similarity

High-performance code similarity detection tools written in Rust. Detects duplicate functions and similar code patterns across your codebase in multiple programming languages.

## Features

- **Zero configuration** - works out of the box with sensible defaults
- **Multi-language support** - TypeScript/JavaScript, Python, and Rust
- **Function similarity detection** using AST-based comparison
- **Type similarity detection** for TypeScript interfaces, type aliases, and type literals
- **Cross-file analysis** to find duplicates across your entire project
- **Configurable thresholds** for similarity detection
- **VSCode-compatible output** for easy navigation
- **High performance** with concurrent file processing
- **Smart filtering** with minimum line/token thresholds and size penalties
- **Test function exclusion** with `--skip-test` option (Rust)

## Documentation

- [AI Assistant Guide](.claude/commands/check-similarity.md) - Refactoring workflow and best practices

## Available Tools

- **similarity-ts** - TypeScript/JavaScript similarity detection
- **similarity-py** - Python similarity detection  
- **similarity-rs** - Rust similarity detection

## Installation

### TypeScript/JavaScript

```bash
# Install from crates.io
cargo install similarity-ts

# Use the installed binary
similarity-ts --help
```

### Python

```bash
# Install from crates.io
cargo install similarity-py

# Use the installed binary
similarity-py --help
```

### Rust

```bash
# Install from crates.io
cargo install similarity-rs

# Use the installed binary
similarity-rs --help
```

### From source

```bash
# Clone the repository
git clone https://github.com/mizchi/similarity-ts.git
cd similarity-ts

# Build all tools
cargo build --release

# Or install specific tool
cargo install --path crates/similarity-ts
cargo install --path crates/similarity-py
cargo install --path crates/similarity-rs
```

## Quick Start

### TypeScript/JavaScript

```bash
# Just run it! Zero configuration needed
similarity-ts

# Analyze specific paths
similarity-ts src/ lib/

# Use custom threshold
similarity-ts . -t 0.9

# Enable type checking (experimental)
similarity-ts . --experimental-types
```

### Python

```bash
# Analyze Python files
similarity-py

# Check specific directories
similarity-py src/ tests/

# Adjust threshold
similarity-py . --threshold 0.85
```

### Rust

```bash
# Analyze Rust files
similarity-rs

# Skip test functions
similarity-rs . --skip-test

# Set minimum tokens (default: 30)
similarity-rs . --min-tokens 50
```

## Usage

### Common Options (All Languages)

- `--threshold` / `-t` - Similarity threshold (0.0-1.0, default: 0.85)
- `--min-lines` / `-m` - Minimum lines for functions (default: 3-5)
- `--min-tokens` - Minimum AST nodes for functions
- `--print` / `-p` - Print code in output
- `--cross-file` / `-c` - Enable cross-file comparison
- `--no-size-penalty` - Disable size difference penalty

### TypeScript/JavaScript Specific

```bash
# Check for duplicate functions (default)
similarity-ts ./src

# Enable type checking (experimental)
similarity-ts ./src --experimental-types

# Check types only
similarity-ts ./src --no-functions --experimental-types

# Fast mode with bloom filter (default)
similarity-ts ./src --no-fast  # disable
```

### Python Specific

```bash
# Check Python files
similarity-py ./src

# Include test files
similarity-py . --extensions py,test.py
```

### Rust Specific

```bash
# Check Rust files
similarity-rs ./src

# Skip test functions (test_ prefix or #[test])
similarity-rs . --skip-test

# Set minimum tokens (default: 30)
similarity-rs . --min-tokens 50
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

### Core Algorithm

1. **AST Parsing**: Language-specific parsers convert code to ASTs
   - TypeScript/JavaScript: oxc-parser (fast)
   - Python/Rust: tree-sitter
2. **Tree Extraction**: Extracts function/method nodes with structure
3. **TSED Algorithm**: Tree Structure Edit Distance with size penalties
4. **Similarity Score**: Normalized score between 0 and 1
5. **Impact Calculation**: Considers code size for prioritization

### Language-Specific Features

- **TypeScript**: Type similarity detection (interfaces, type aliases)
- **Python**: Class and method detection, decorator support
- **Rust**: Test function filtering, impl block analysis

## Examples

### TypeScript/JavaScript

```bash
# Find duplicate functions
similarity-ts ./src --threshold 0.7 --print

# Find similar types across files
similarity-ts ./src --no-functions --experimental-types --cross-file --print

# Comprehensive analysis
similarity-ts ./src \
  --threshold 0.8 \
  --min-lines 10 \
  --cross-file \
  --extensions ts,tsx
```

### Python

```bash
# Find duplicate functions in Python project
similarity-py ./src --threshold 0.85 --print

# Check with custom settings
similarity-py . \
  --min-lines 5 \
  --extensions py
```

### Rust

```bash
# Find duplicates excluding tests
similarity-rs ./src --skip-test --print

# Strict checking with high token count
similarity-rs . \
  --min-tokens 50 \
  --threshold 0.9 \
  --skip-test
```

## Performance

- Written in Rust for maximum performance
- Concurrent file processing  
- Memory-efficient algorithms
- Language-specific optimizations:
  - **TypeScript/JavaScript**: Fast mode with bloom filters (~4x faster)
  - **Python/Rust**: Tree-sitter based parsing
- Intelligent filtering reduces unnecessary comparisons

## License

MIT
