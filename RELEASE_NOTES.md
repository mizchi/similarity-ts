# similarity-ts v0.1.0

First release of similarity-ts (formerly ts-similarity) - a high-performance TypeScript/JavaScript code similarity detection tool written in Rust.

## 🎯 Features

### Core Functionality
- **Function Similarity Detection**: Find duplicate or similar functions across your codebase
- **Type Similarity Detection** (experimental): Detect similar interfaces and type definitions
- **AST-based Comparison**: Uses Tree Structured Edit Distance (TSED) algorithm for accurate structural comparison
- **Cross-file Analysis**: Find duplicates across multiple files in your project

### Performance
- **Bloom Filter Pre-filtering**: ~90% reduction in comparisons with AST fingerprinting
- **Multi-threaded Processing**: Parallel file parsing and analysis using Rayon
- **Memory Efficient**: Written in Rust for optimal memory usage
- **Fast Mode**: Default mode with intelligent pre-filtering

### Developer Experience
- **Zero Configuration**: Works out of the box with sensible defaults
- **VSCode-compatible Output**: Click file paths to jump directly to code
- **Flexible Filtering**: 
  - `--min-tokens`: Filter by AST node count (recommended: 20-30)
  - `--min-lines`: Filter by line count
  - `--threshold`: Configurable similarity threshold (0.0-1.0)
- **Multiple Output Options**: Standard output or detailed code printing with `--print`

## 📦 Installation

```bash
cargo install similarity-ts
```

## 🚀 Quick Start

```bash
# Check current directory for duplicates
similarity-ts

# Analyze specific directories
similarity-ts src/ lib/

# Set custom threshold
similarity-ts --threshold 0.9

# Filter by complexity
similarity-ts --min-tokens 25

# Show code snippets
similarity-ts --print
```

## 📊 Performance Benchmarks

Tested on real-world TypeScript projects:
- Small files (4 functions): ~8µs
- Medium files (8 functions): ~62µs
- Large files (9+ functions): ~71µs
- 100 files parallel processing: ~3ms (4x faster than sequential)

## 🔧 Technical Details

- Built with [oxc-parser](https://github.com/oxc-project/oxc) for fast TypeScript/JavaScript parsing
- Implements TSED algorithm from academic research
- Uses SIMD-accelerated bloom filters for pre-filtering
- Supports `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts`, `.cts` files

## 🙏 Acknowledgments

This project was developed with significant assistance from Claude (Anthropic) in implementing the Rust version, optimizing performance, and creating documentation.

## 📝 License

MIT

---

For more information, visit the [GitHub repository](https://github.com/mizchi/similarity-ts).