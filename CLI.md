# TypeScript Function Similarity CLI

A command-line tool for finding similar functions across TypeScript codebases using Abstract Syntax Tree (AST) analysis.

## Installation

```bash
npm install -g ts-similarity
```

## Usage

```bash
ts-similarity <directory> [options]
```

## Options

- `-p, --pattern <glob>` - File pattern to match (default: `"**/*.ts"`)
- `-t, --threshold <num>` - Similarity threshold 0-1 (default: `0.7`)
- `-o, --output <file>` - Output file (default: console)
- `-j, --json` - Output as JSON
- `-h, --help` - Show help

## Examples

### Basic usage - find similar functions in src directory:

```bash
ts-similarity ./src
```

### Custom pattern and threshold:

```bash
ts-similarity ./src -p "**/*.ts" -t 0.8
```

### JSON output to file:

```bash
ts-similarity ./src -j -o results.json
```

### Only scan specific subdirectories:

```bash
ts-similarity ./src -p "services/**/*.ts" -t 0.9
```

## Output

The CLI provides color-coded output for different similarity levels:

- 🔴 **Very High Similarity (≥90%)** - Potential code clones that should be refactored
- 🟡 **High Similarity (80-90%)** - Similar code that might benefit from abstraction
- 🟢 **Medium Similarity (70-80%)** - Code with similar patterns

## How it Works

1. **Function Extraction**: The tool parses all TypeScript files and extracts:

   - Function declarations
   - Function expressions
   - Arrow functions
   - Class methods

2. **AST Comparison**: Each function is converted to an Abstract Syntax Tree (AST) and compared using the APTED (All Path Tree Edit Distance) algorithm.

3. **Efficient Comparison**: For large codebases, the tool uses MinHash and LSH (Locality-Sensitive Hashing) to efficiently find candidates before detailed comparison.

4. **Similarity Calculation**: The similarity score is calculated based on the structural similarity of the AST, with configurable costs for:
   - Node deletion
   - Node insertion
   - Node renaming (lower cost for identifier changes)

## JSON Output Format

When using the `-j` flag, the output is formatted as:

```json
[
  {
    "function1": {
      "name": "functionName",
      "file": "relative/path/to/file.ts",
      "line": 10
    },
    "function2": {
      "name": "similarFunction",
      "file": "another/file.ts",
      "line": 25
    },
    "similarity": 0.95
  }
]
```

## Performance

The tool is optimized for large codebases:

- Uses parallel processing for function extraction
- Implements efficient similarity algorithms (MinHash/LSH)
- Shows progress indicators for long-running operations

## Use Cases

1. **Code Review**: Find duplicate code before merging
2. **Refactoring**: Identify similar functions that can be consolidated
3. **Quality Assurance**: Detect copy-paste programming
4. **Code Analysis**: Understand code patterns in large projects

## Limitations

- Only supports TypeScript files
- Requires valid TypeScript syntax (parse errors are handled gracefully)
- Memory usage scales with the number of functions in the codebase
