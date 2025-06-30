# similarity-generic

A generic code similarity analyzer using tree-sitter parsers. This tool provides configurable similarity detection for languages without dedicated implementations.

## Important Limitations

⚠️ **This tool only supports languages with pre-installed tree-sitter parsers.** It cannot analyze arbitrary file extensions (e.g., `.xyz`) without corresponding tree-sitter grammar support in the binary.

To add support for a new language:
1. The tree-sitter parser for that language must be added as a dependency
2. Submit a PR to add the parser to the codebase
3. Then create a configuration file for the language

## Supported Languages

Out of the box, `similarity-generic` supports:

- **Go** (`go`)
- **Java** (`java`)
- **C** (`c`)
- **C++** (`cpp`, `c++`)
- **C#** (`csharp`, `cs`)
- **Ruby** (`ruby`, `rb`)

For Python, TypeScript/JavaScript, and Rust, please use the dedicated implementations:
- `similarity-py` - Optimized Python analyzer
- `similarity-ts` - Optimized TypeScript/JavaScript analyzer
- `similarity-rs` - (planned) Optimized Rust analyzer

## Installation

```bash
cargo install similarity-generic
```

### Prerequisites

The binary includes the following tree-sitter parsers:
- `tree-sitter-go`
- `tree-sitter-java`
- `tree-sitter-c`
- `tree-sitter-cpp`
- `tree-sitter-c-sharp`
- `tree-sitter-ruby`

These are compiled into the binary, so no additional runtime dependencies are required.

## Usage

### Basic Usage

```bash
# Analyze Go code
similarity-generic path/to/file.go --language go

# Analyze Java code with custom threshold
similarity-generic src/Main.java --language java --threshold 0.9

# Show all functions in a file
similarity-generic file.cpp --language cpp --show-functions
```

### Using Custom Language Configuration

You can provide custom language configurations using JSON files:

```bash
similarity-generic path/to/code --config my-language.json
```

### Command Line Options

- `--language, -l` - Specify the language (go, java, c, cpp, csharp, ruby)
- `--config, -c` - Path to custom language configuration JSON
- `--threshold, -t` - Similarity threshold (0.0-1.0, default: 0.85)
- `--show-functions` - Display all extracted functions
- `--supported` - Show list of supported languages
- `--show-config` - Display example configuration for a language

### Show Supported Languages

```bash
similarity-generic --supported
```

### Show Language Configuration

```bash
# Show Go language configuration
similarity-generic --show-config go

# Show C++ configuration
similarity-generic --show-config cpp
```

## Language Configuration Format

Language configurations are JSON files that define how to parse and extract functions from source code.

### Configuration Structure

```json
{
  "language": "string",           // Language identifier
  "function_nodes": ["string"],   // AST node types representing functions
  "type_nodes": ["string"],       // AST node types representing types/classes
  "field_mappings": {             // Field names in AST nodes
    "name_field": "string",       // Field containing function/type name
    "params_field": "string",     // Field containing parameters
    "body_field": "string",       // Field containing function body
    "decorator_field": "string",  // Optional: Field for decorators
    "class_field": "string"       // Optional: Field for parent class
  },
  "value_nodes": ["string"],      // Node types to extract text from
  "test_patterns": {              // Optional: Patterns to identify tests
    "attribute_patterns": ["string"],  // Attribute patterns
    "name_prefixes": ["string"],       // Function name prefixes
    "name_suffixes": ["string"]        // Function name suffixes
  }
}
```

### Example: Go Configuration

```json
{
  "language": "go",
  "function_nodes": [
    "function_declaration",
    "method_declaration"
  ],
  "type_nodes": [
    "type_declaration",
    "struct_type",
    "interface_type"
  ],
  "field_mappings": {
    "name_field": "name",
    "params_field": "parameters",
    "body_field": "body"
  },
  "value_nodes": [
    "identifier",
    "interpreted_string_literal",
    "raw_string_literal",
    "int_literal",
    "float_literal",
    "true",
    "false",
    "nil"
  ],
  "test_patterns": {
    "attribute_patterns": [],
    "name_prefixes": ["Test", "Benchmark"],
    "name_suffixes": ["_test"]
  }
}
```

### Example: Custom Language Configuration

For a hypothetical language:

```json
{
  "language": "mylang",
  "function_nodes": [
    "function_definition",
    "lambda_expression"
  ],
  "type_nodes": [
    "class_definition",
    "trait_definition"
  ],
  "field_mappings": {
    "name_field": "identifier",
    "params_field": "parameter_list",
    "body_field": "block",
    "decorator_field": "annotations"
  },
  "value_nodes": [
    "identifier",
    "string_literal",
    "number_literal"
  ],
  "test_patterns": {
    "attribute_patterns": ["@test", "@Test"],
    "name_prefixes": ["test_"],
    "name_suffixes": ["_test", "Test"]
  }
}
```

## Creating Custom Language Support

### For Existing Tree-Sitter Languages

If the language's tree-sitter parser is already included in the binary, you can create a custom configuration:

1. Create a JSON configuration file with the language's AST structure
2. Identify the tree-sitter node types for functions and types
3. Map the appropriate fields for extracting names, parameters, and bodies
4. Define value nodes that should have their text extracted
5. Optionally define test patterns for test function detection

### For New Languages

To add support for a language not currently included:

1. **Submit a PR** to add the tree-sitter parser as a dependency:
   ```toml
   # In Cargo.toml
   tree-sitter-yourlang = "0.x"
   ```
2. Update the language matching in `src/main.rs` and `generic_tree_sitter_parser.rs`
3. Add tests for the new language
4. Once merged, create a configuration file as described above

**Note**: You cannot simply create a configuration file for an arbitrary language. The tree-sitter parser must be compiled into the binary first.

### Finding Node Types

To discover the node types for your language:

1. Use tree-sitter's playground or CLI to parse sample code
2. Examine the AST structure to identify relevant node types
3. Test your configuration with sample files

## Examples

### Analyzing a Go Project

```bash
# Find similar functions in a Go file
similarity-generic main.go --language go

# Example output:
# Comparing functions for similarity...
#   calculateSum <-> computeTotal: 92.50%

# Analyze entire Go project
find . -name "*.go" -exec similarity-generic {} --language go \;
```

### Complete Example

```bash
# Show functions in the example file
$ similarity-generic examples/sample.go --language go --show-functions
Found 4 functions:
  calculateSum examples/sample.go:6-12
  computeTotal examples/sample.go:14-20
  printMessage examples/sample.go:23-25
  TestCalculateSum examples/sample.go:28-33

# Detect similar functions
$ similarity-generic examples/sample.go --language go
Comparing functions for similarity...
  calculateSum <-> computeTotal: 91.30%
```

### Customizing Existing Language Configuration

```bash
# Get the current Go configuration
similarity-generic --show-config go > my-go-config.json

# Edit my-go-config.json to customize behavior
# For example, add more test patterns or change node types

# Use the custom configuration
similarity-generic main.go --config my-go-config.json
```

**Note**: Custom configurations only work for languages already supported by the binary. You cannot analyze `.kt` (Kotlin) files unless `tree-sitter-kotlin` is added to the project.

## Performance Considerations

The generic parser uses tree-sitter, which is generally slower than specialized parsers. For languages with dedicated implementations (Python, TypeScript, Rust), use those tools for better performance:

- `similarity-py` - ~10x faster for Python
- `similarity-ts` - Uses oxc_parser for superior TypeScript/JavaScript performance
- `similarity-rs` - (planned) Optimized Rust implementation

## Contributing

To contribute support for a new language:

1. Fork the repository
2. Add the tree-sitter parser dependency in `Cargo.toml`
3. Update the code to support the new language:
   - Add language matching in `main.rs`
   - Add parser support in `generic_tree_sitter_parser.rs`
   - Create a default configuration
4. Add comprehensive tests
5. Submit a pull request

Example PR checklist for adding a language:
- [ ] Added `tree-sitter-xyz` to dependencies
- [ ] Updated language matching code
- [ ] Created default configuration
- [ ] Added integration tests
- [ ] Updated documentation
- [ ] Verified CI passes

## License

MIT