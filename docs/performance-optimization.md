# Performance Optimization Design

## Current Implementation

Currently, the ts-similarity tool processes files sequentially:

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
- Cache directory: `.ts-similarity-cache/`
- Cache key: file path + modification time + file hash
- Cache value: Extracted functions/types (not full AST)

**Cache structure:**
```
.ts-similarity-cache/
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

### 3. Shared AST Between Analyzers

**Current issue:**
When running default mode (both functions and types), each file is parsed twice.

**Solution:**
Create a unified analyzer that:
1. Parses file once
2. Extracts both functions and types in single pass
3. Runs both similarity analyses

**Implementation approach:**
```rust
struct ParsedData {
    functions: Vec<FunctionDefinition>,
    types: Vec<TypeDefinition>,
    type_literals: Vec<TypeLiteralDefinition>,
}

fn analyze_file(file: &Path) -> Result<ParsedData> {
    let content = fs::read_to_string(file)?;
    let ast = parse(file, &content)?;
    
    Ok(ParsedData {
        functions: extract_functions(&ast)?,
        types: extract_types(&ast)?,
        type_literals: extract_type_literals(&ast)?,
    })
}
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
ts-similarity -j 8 src/

# Incremental mode (uses cache)
ts-similarity --incremental src/

# Combined for maximum performance
ts-similarity --incremental -j 8 src/
```