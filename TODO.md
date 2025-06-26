# TODO

## Features to Implement

### .similarity-ignore Support
- [ ] Implement `.similarity-ignore` file parsing
- [ ] Support `:function()` syntax for ignoring specific function names
- [ ] Support wildcards (`*`) in function patterns
- [ ] Common patterns to ignore:
  - Test setup/teardown functions (setUp, tearDown, beforeEach, etc.)
  - Test helpers (test*, expect*, describe*)
  - React lifecycle methods
  - Framework hooks (useEffect, useState, etc.)
  - Generated code (*Generated, *_pb, *_grpc)
  - Build tool artifacts (__webpack*, etc.)
  - Common boilerplate (main, init, constructor)

### CLI Improvements
- [x] Support multiple file/directory arguments with glob expansion
  - Accept multiple paths: `similarity-ts functions src/ lib/ tests/`
  - Expand glob patterns in arguments
  - Respect .gitignore when expanding paths
  - Use `ignore` crate which already handles .gitignore

### Performance Improvements
- [ ] Parallel parsing with configurable concurrency
  - Add `--threads` or `-j` flag to control parallelism
  - Use `rayon` for parallel file processing
  - Parse multiple files concurrently
  - Benchmark performance improvements
- [ ] Incremental mode with AST caching
  - Add `--incremental` flag
  - Cache parsed ASTs to disk (e.g., `.similarity-ts-cache/`)
  - Use file modification time to invalidate cache
  - Store serialized AST or extracted function/type signatures
  - Consider using `serde` for AST serialization
- [ ] Share parsed AST between function and type analyzers
  - Parse each file only once when running both analyzers
  - Pass parsed AST to both extractors
  - Reduce redundant parsing overhead

### Other Improvements
- [ ] Add support for custom ignore patterns via CLI flags
- [ ] Add progress bar for large codebases
- [ ] Support for more languages (JavaScript without TypeScript types)

## Cross-Language Duplicate Detection Plan

Currently, we have implemented a Python parser using tree-sitter, but cross-language duplicate detection is not yet implemented.

### Implementation Plan

1. **AST Normalization**
   - Convert different language AST structures to a common intermediate representation
   - Map language-specific syntax to generic structures
   - Example: Treat Python's `for item in items` and JavaScript's `for (const item of items)` as the same structure

2. **Semantic Equivalence Detection**
   - Array operations: `map`, `filter`, `reduce` and other higher-order functions
   - Loop structures: Equivalence of for, while, do-while
   - Conditional branches: Unify if-else, switch-case, ternary operators

3. **Type System Abstraction**
   - Bridge dynamic typing (Python) and static typing (TypeScript)
   - Enable comparison regardless of type annotations

4. **Implementation Priority**
   - Phase 1: Basic loop and conditional branch detection
   - Phase 2: Array and object operation detection
   - Phase 3: Class and method detection

### Technical Challenges

- Performance: tree-sitter is about 10x slower than oxc_parser
- AST structure differences: Different node types and property names per language
- Semantic differences: Same operations may have different meanings in different languages

### Future Extensions

- Support for other languages: Rust, Go, Java, etc.
- Cross-language refactoring suggestions
- Automatic code translation features