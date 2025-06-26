# Performance Baseline (oxc_parser)

This document establishes the performance baseline using oxc_parser before transitioning to tree-sitter.

## Current Performance Metrics

### Function Comparison Benchmarks

#### Within File Analysis
- **Small file (4 functions)**: ~8.3µs
- **Medium file (8 functions)**: ~59.6µs  
- **Large file (9 functions)**: ~66.7µs

#### Cross-File Analysis
- **2 small files**: ~17.2µs
- **3 mixed files**: ~165.9µs
- **4 mixed files (worst case)**: ~192.2µs

#### Fast Mode (Bloom Filter)
- **Small file**: ~8.1µs
- **Medium file**: ~41.0µs
- **Large file**: ~85.1µs
- **3 mixed files cross-file**: ~126.5µs

### TSED (Tree Similarity Edit Distance) Benchmarks

#### Full Calculation
- **Small files**: ~15.8µs
- **Medium files**: ~12.7µs

#### Parsing Only
- **Small file**: ~2.2µs
- **Medium file**: ~5.9µs

#### Tree Edit Distance Computation
- **Small trees**: ~10.8µs
- **Medium trees**: ~194ns

#### Large Scale
- **100 small file comparisons**: ~1.69ms

## Performance Targets for tree-sitter

To ensure tree-sitter integration is viable, we should aim for:

1. **Parsing overhead**: < 2x slower than oxc_parser
2. **Overall performance**: Within 50% of current metrics
3. **Memory usage**: Comparable or better
4. **Multi-language support**: Justifies any performance trade-offs

## Key Performance Considerations

1. **oxc_parser advantages**:
   - Zero-copy parsing
   - Optimized specifically for JS/TS
   - Minimal allocations
   - Type-safe AST

2. **tree-sitter potential advantages**:
   - Incremental parsing
   - Error recovery
   - Language agnostic
   - Query-based extraction

3. **Critical paths to optimize**:
   - AST to TreeNode conversion
   - Function/type extraction
   - Tree traversal