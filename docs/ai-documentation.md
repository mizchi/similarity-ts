# similarity-ts: AI-Oriented Documentation

## Project Overview

similarity-ts is a high-performance code similarity detection tool for TypeScript/JavaScript codebases, written in Rust. It uses AST-based structural comparison to find duplicate or similar code patterns.

## Core Purpose

The tool detects:
1. **Duplicate functions** - Functions with similar structure but different names/variables
2. **Similar type definitions** - Interfaces and type aliases with similar structures
3. **Code patterns** - Repeated patterns that could be refactored

## Technical Architecture

### Algorithm: TSED (Tree Similarity of Edit Distance)

The tool implements the TSED algorithm from academic research:
- Based on APTED (All Path Tree Edit Distance) algorithm
- Calculates structural similarity between AST nodes
- Normalized scoring between 0-1

### Performance Optimizations

1. **Bloom Filter Pre-filtering**
   - Creates AST fingerprints for each function
   - Uses SIMD-accelerated comparison
   - Filters out obviously different functions (~90% reduction)

2. **Multi-threading**
   - Parallel file parsing using Rayon
   - Concurrent similarity calculations
   - ~4x speedup on multi-core systems

3. **Memory Efficiency**
   - Uses Rust's Rc (Reference Counting) for AST nodes
   - No memory leaks unlike TypeScript prototype
   - Handles large codebases efficiently

## Key Components

### 1. Core Library (`crates/core/`)

- **Parser Module**: Uses oxc_parser for TypeScript/JavaScript parsing
- **Extractor Module**: Extracts functions and types from AST
- **Comparator Module**: Implements TSED algorithm
- **Fast Mode**: Bloom filter-based pre-filtering

### 2. CLI Application (`crates/cli/`)

- **Command Parser**: Uses clap for argument parsing
- **File Walker**: Concurrent file discovery and filtering
- **Output Formatter**: VSCode-compatible output format
- **Progress Display**: Real-time analysis feedback

## Usage Patterns

### Basic Function Similarity
```bash
# Analyze current directory with default settings
similarity-ts

# Analyze specific directory with custom threshold
similarity-ts ./src --threshold 0.9
```

### Type Similarity (Experimental)
```bash
# Enable type checking
similarity-ts ./src --types

# Types only
similarity-ts ./src --no-functions --types
```

### Advanced Options
```bash
# Cross-file analysis with detailed output
similarity-ts ./src --cross-file --print

# Fast mode control
similarity-ts ./src --no-fast  # Disable bloom filter optimization
```

## Output Interpretation

### Similarity Score Components
- **Similarity %**: Structural similarity (0-100%)
- **Score (Priority)**: Lines × Similarity (higher = more important)
- **Line Range**: Where the code is located

### Example Output
```
Similarity: 89.09%, Score: 8.0 points (lines 9~9, avg: 9.0)
  src/utils/getUserById.ts:4-12 getUserById
  src/utils/findUserById.ts:8-16 findUserById
```

## Performance Characteristics

### Benchmarks (from actual measurements)
- **Small files (~500B)**: ~4ms per comparison
- **Medium files (~5KB)**: ~5ms per comparison  
- **Large project (60K lines)**: <1 second total

### Optimization Impact
- Bloom filter: ~5x speedup
- Multi-threading: ~4x speedup
- Combined: ~20x faster than naive approach

## Development Context

### Why Rust?
1. **Performance**: Native speed, no GC pauses
2. **Memory Safety**: No memory leaks or crashes
3. **Concurrency**: Safe multi-threading
4. **Integration**: Can be called from any language

### Comparison with TypeScript Prototype
- **Accuracy**: Rust version ~20% more accurate
- **Performance**: 16x faster on medium files
- **Reliability**: No memory issues on large files
- **Features**: More comprehensive AST handling

## Future Enhancements

### Planned Features
1. **Incremental Analysis**: Cache results between runs
2. **Semantic Analysis**: Beyond structural similarity
3. **IDE Integration**: Language server protocol support
4. **Cross-language**: Compare TypeScript with JavaScript

### Experimental Features
- Type literal comparison (in function signatures)
- Class similarity detection
- Import pattern analysis

## Integration Possibilities

### CI/CD Pipeline
```yaml
# Example GitHub Action
- name: Check code duplication
  run: |
    cargo install --git https://github.com/mizchi/similarity-ts
    similarity-ts ./src --threshold 0.8
```

### Pre-commit Hook
```bash
#!/bin/bash
similarity-ts --threshold 0.9 || {
  echo "High code duplication detected!"
  exit 1
}
```

### Programmatic Usage
The core library can be used as a Rust crate for custom tools.

## Limitations

1. **Language Support**: Only TypeScript/JavaScript (no other languages)
2. **Semantic Understanding**: Structural only, not semantic
3. **Type Checking**: Experimental and slower than function checking
4. **Configuration**: Limited customization options currently

## Best Practices

1. **Start with defaults**: The default 0.8 threshold works well
2. **Use --print sparingly**: Can generate lots of output
3. **Focus on high scores**: Priority score helps identify important duplicates
4. **Regular scans**: Run periodically to prevent duplication buildup

## Technical Details for AI Assistants

When working with this codebase:

1. **AST Handling**: The oxc_parser creates a detailed AST that needs careful traversal
2. **Memory Management**: Use Rc<Node> for shared AST nodes
3. **Performance**: Always consider O(n²) complexity for pairwise comparisons
4. **Testing**: Use both unit tests and integration tests with real code samples
5. **Error Handling**: Gracefully handle parse errors and invalid files

The tool demonstrates effective use of:
- Rust's type system for safety
- Academic algorithms for practical problems
- Performance optimization techniques
- Clean architecture principles