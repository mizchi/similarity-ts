# Performance Optimization Design

## Current Implementation

Currently, the similarity-ts tool processes files sequentially:

1. Collect all files from given paths
2. For each file:
   - Read file content
   - Parse TypeScript/JavaScript code
   - Extract functions/types
   - Compare within file or across files

This approach has several performance bottlenecks:
- Sequential file I/O
- Sequential parsing
- Redundant parsing when running both function and type analysis
- No caching of results

## Proposed Optimizations

### 1. Parallel Parsing

**Implementation approach:**
- Use `rayon` crate for data parallelism
- Add `--threads` or `-j` flag to control concurrency (default: number of CPU cores)
- Parallelize at file level (each file parsed independently)

**Example code structure:**
```rust
use rayon::prelude::*;

let parsed_files: Vec<_> = files
    .par_iter()  // Parallel iterator
    .map(|file| {
        // Read and parse file
        let content = fs::read_to_string(file)?;
        parse_file(&file, &content)
    })
    .collect();
```

**Benefits:**
- Linear speedup with number of cores for parsing phase
- Particularly effective for large codebases
- No changes to comparison algorithms needed

### 2. Incremental Mode with Caching

**Implementation approach:**
- Add `--incremental` flag
- Cache directory: `.similarity-ts-cache/`
- Cache key: file path + modification time + file hash
- Cache value: Extracted functions/types (not full AST)

**Cache structure:**
```
.similarity-ts-cache/
├── manifest.json  # Version, settings
├── functions/
│   ├── <hash>.json  # Cached function definitions
│   └── ...
└── types/
    ├── <hash>.json  # Cached type definitions
    └── ...
```

**Why not cache full AST:**
- oxc AST contains references and isn't easily serializable
- Function/type definitions are smaller and sufficient
- Can use serde for JSON serialization

**Example flow:**
1. Check if cache exists and is valid
2. For each file:
   - Compute cache key (path + mtime + hash)
   - If cached: load from cache
   - If not cached: parse and extract, then cache
3. Run similarity analysis on cached/extracted data

### 3. Shared AST Between Analyzers (Visitor Pattern)

**Current issue:**
When running default mode (both functions and types), each file is parsed twice.

**Solution:**
Implement a visitor pattern that traverses the AST once and collects all needed information.

**Visitor Pattern Design:**

```rust
// Define visitor trait
trait AstVisitor {
    fn visit_function(&mut self, func: &FunctionDeclaration);
    fn visit_method(&mut self, method: &MethodDefinition);
    fn visit_arrow_function(&mut self, arrow: &ArrowFunction);
    fn visit_interface(&mut self, interface: &InterfaceDeclaration);
    fn visit_type_alias(&mut self, type_alias: &TypeAliasDeclaration);
    fn visit_type_literal(&mut self, literal: &TypeLiteral, context: TypeLiteralContext);
}

// Combined visitor that collects everything
struct CombinedExtractor {
    functions: Vec<FunctionDefinition>,
    types: Vec<TypeDefinition>,
    type_literals: Vec<TypeLiteralDefinition>,
}

impl AstVisitor for CombinedExtractor {
    fn visit_function(&mut self, func: &FunctionDeclaration) {
        self.functions.push(extract_function_definition(func));
    }
    
    fn visit_interface(&mut self, interface: &InterfaceDeclaration) {
        self.types.push(extract_interface_definition(interface));
    }
    
    fn visit_type_alias(&mut self, type_alias: &TypeAliasDeclaration) {
        self.types.push(extract_type_alias_definition(type_alias));
    }
    
    // ... other visitor methods
}

// AST traversal function
fn traverse_ast<V: AstVisitor>(program: &Program, visitor: &mut V) {
    for stmt in &program.body {
        match stmt {
            Statement::FunctionDeclaration(func) => visitor.visit_function(func),
            Statement::TSInterfaceDeclaration(interface) => visitor.visit_interface(interface),
            Statement::TSTypeAliasDeclaration(alias) => visitor.visit_type_alias(alias),
            // ... handle other statement types
        }
    }
}

// Single-pass analysis
fn analyze_file(file: &Path) -> Result<ParsedData> {
    let content = fs::read_to_string(file)?;
    let ast = parse(file, &content)?;
    
    let mut extractor = CombinedExtractor::default();
    traverse_ast(&ast.program, &mut extractor);
    
    Ok(ParsedData {
        functions: extractor.functions,
        types: extractor.types,
        type_literals: extractor.type_literals,
    })
}
```

**Benefits of Visitor Pattern:**
1. **Single traversal**: Walk the AST only once
2. **Extensibility**: Easy to add new extractors without modifying traversal logic
3. **Separation of concerns**: Traversal logic separate from extraction logic
4. **Composability**: Can combine multiple visitors if needed
5. **Type safety**: Compiler ensures all node types are handled

**Alternative: Modular Visitors**
For even more flexibility, visitors can be composed:

```rust
struct VisitorChain {
    visitors: Vec<Box<dyn AstVisitor>>,
}

impl AstVisitor for VisitorChain {
    fn visit_function(&mut self, func: &FunctionDeclaration) {
        for visitor in &mut self.visitors {
            visitor.visit_function(func);
        }
    }
    // ... forward all visits to chain
}

// Usage
let mut chain = VisitorChain::new();
chain.add(Box::new(FunctionExtractor::new()));
chain.add(Box::new(TypeExtractor::new()));
chain.add(Box::new(TypeLiteralExtractor::new()));
traverse_ast(&ast, &mut chain);
```

## Performance Considerations

### Memory Usage
- Parallel parsing increases memory usage (multiple ASTs in memory)
- Consider memory limit flag for very large codebases
- Stream processing for cross-file analysis

### Cache Invalidation
- File modification time is primary indicator
- Also check file size/hash for safety
- Version cache format for compatibility

### Benchmarking
- Measure parsing time vs comparison time
- Test with various codebase sizes
- Compare sequential vs parallel performance

## Implementation Priority

1. **Shared AST** (easiest, immediate benefit)
2. **Parallel parsing** (medium complexity, high impact)
3. **Incremental caching** (highest complexity, best for repeated use)

## Example Usage

```bash
# Parallel processing with 8 threads
similarity-ts -j 8 src/

# Incremental mode (uses cache)
similarity-ts --incremental src/

# Combined for maximum performance
similarity-ts --incremental -j 8 src/
```