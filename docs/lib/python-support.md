# Python Support Documentation

## Overview

similarity-ts now supports Python code analysis alongside JavaScript and TypeScript, enabling cross-language duplicate detection and similarity analysis.

## Architecture

The implementation uses a hybrid approach:
- **JavaScript/TypeScript**: Uses the fast oxc_parser (no performance regression)
- **Python**: Uses tree-sitter-python
- **Abstraction Layer**: Common `LanguageParser` trait for all languages

## Usage Examples

### Detecting Python Duplicates

```rust
use similarity_ts_core::language_parser::{Language, ParserFactory};

let mut parser = ParserFactory::create_parser(Language::Python)?;
let functions = parser.extract_functions(python_code, "file.py")?;
```

### Cross-Language Analysis

```rust
// Parse JavaScript
let mut js_parser = ParserFactory::create_parser(Language::JavaScript)?;
let js_functions = js_parser.extract_functions(js_code, "utils.js")?;

// Parse Python
let mut py_parser = ParserFactory::create_parser(Language::Python)?;
let py_functions = py_parser.extract_functions(py_code, "utils.py")?;

// Compare structures across languages
let js_tree = js_parser.parse(js_code, "utils.js")?;
let py_tree = py_parser.parse(py_code, "utils.py")?;
let similarity = calculate_similarity(&js_tree, &py_tree);
```

## Supported Python Features

### Functions
- Regular functions (`def`)
- Nested functions
- Decorated functions (`@decorator`)
- Lambda expressions (detected but not extracted as named functions)

### Classes
- Class definitions
- Instance methods
- Class methods (`@classmethod`)
- Static methods (`@staticmethod`)
- Properties (`@property`)
- Constructor (`__init__`)

### Example Detection Results

From the `duplicate_python.py` example:
```
Found 21 similar function pairs (>70% similarity):

100% similar:
  - Function 'process_data' (lines 3-9)
  - Function 'transform_data' (lines 11-17)

100% similar:
  - Method 'process' (lines 23-28)
  - Method 'transform' (lines 30-35)
    Classes: DataProcessor vs DataProcessor
```

## Performance Characteristics

| Operation | JavaScript (oxc) | Python (tree-sitter) | Ratio |
|-----------|------------------|---------------------|-------|
| Parse Small | 1.3µs | 13.9µs | 10.7x |
| Parse Medium | 9.8µs | 88.0µs | 9.0x |
| Extract Functions Small | 3.1µs | 11.6µs | 3.7x |
| Extract Functions Medium | 25.8µs | 64.6µs | 2.5x |

While Python parsing is slower than JavaScript, the performance is still excellent for practical use (64.6µs for a medium file).

## CLI Integration (Coming Soon)

```bash
# Analyze Python file
similarity-ts check duplicate_python.py

# Analyze mixed project
similarity-ts check src/**/*.{js,ts,py}

# Cross-language duplicate detection
similarity-ts check --cross-language src/
```

## Future Enhancements

1. **Additional Languages**
   - Rust (tree-sitter-rust)
   - Go (tree-sitter-go)
   - Java (tree-sitter-java)

2. **Python-Specific Features**
   - Type hint analysis
   - Docstring similarity
   - Import dependency analysis

3. **Performance Optimizations**
   - Incremental parsing
   - Parallel processing
   - Caching parsed trees

## Testing

Comprehensive test coverage includes:
- Python function extraction
- Class and method detection
- Decorator handling
- Cross-language similarity
- Integration tests with real Python files

Run tests:
```bash
cargo test python_similarity_test
cargo test multi_language_integration_test
```

## Examples

See the following examples:
- `examples/duplicate_python.py` - Python file with duplicate functions
- `examples/mixed_language_project/` - Cross-language duplicate detection
- `crates/core/examples/python_duplicate_finder.rs` - Standalone duplicate finder
- `crates/core/examples/multi_language_demo.rs` - Cross-language comparison demo