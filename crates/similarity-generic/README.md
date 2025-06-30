# similarity-generic

A generic code similarity analyzer using tree-sitter parsers. This tool provides configurable similarity detection for languages without dedicated implementations.

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

To add support for a new language:

1. Create a JSON configuration file with the language's AST structure
2. Identify the tree-sitter node types for functions and types
3. Map the appropriate fields for extracting names, parameters, and bodies
4. Define value nodes that should have their text extracted
5. Optionally define test patterns for test function detection

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

### Using Custom Configuration

```bash
# Create a configuration for a new language
cat > kotlin.json << EOF
{
  "language": "kotlin",
  "function_nodes": ["function_declaration"],
  "type_nodes": ["class_declaration"],
  "field_mappings": {
    "name_field": "simple_identifier",
    "params_field": "value_parameters",
    "body_field": "function_body"
  },
  "value_nodes": ["simple_identifier", "string_literal"]
}
EOF

# Use the custom configuration
similarity-generic app.kt --config kotlin.json
```

## Performance Considerations

The generic parser uses tree-sitter, which is generally slower than specialized parsers. For languages with dedicated implementations (Python, TypeScript, Rust), use those tools for better performance:

- `similarity-py` - ~10x faster for Python
- `similarity-ts` - Uses oxc_parser for superior TypeScript/JavaScript performance
- `similarity-rs` - (planned) Optimized Rust implementation

## Contributing

To contribute support for a new language:

1. Create a well-tested configuration file
2. Include sample code that demonstrates the parser working correctly
3. Submit a pull request with the configuration and examples

## License

MIT