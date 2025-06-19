# similarity-ts-core

Core library for TypeScript/JavaScript code similarity detection using AST-based comparison.

## Features

- Extract functions from TypeScript/JavaScript code
- Compare function similarity using Tree Structured Edit Distance (TSED)
- Fast similarity detection with bloom filter pre-filtering
- Support for various function types (regular functions, arrow functions, methods)
- Configurable similarity thresholds

## Usage

```rust
use similarity_ts_core::{extract_functions, compare_functions, TSEDOptions};

// Extract functions from code
let functions = extract_functions("example.ts", source_code)?;

// Compare two functions
let options = TSEDOptions::default();
let similarity = compare_functions(&func1, &func2, source1, source2, &options)?;
```

## License

MIT