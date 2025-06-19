# Benchmarks

This directory contains performance benchmarking data and complex test cases.

## Structure

- `data/` - Various TypeScript files for benchmarking and stress testing
  - Performance tests
  - Complex duplication scenarios
  - Real-world code patterns

## Running Benchmarks

```bash
# Basic performance test
time similarity-ts benchmarks/data/ --threshold 0.8

# Memory usage test
/usr/bin/time -v similarity-ts benchmarks/data/ --threshold 0.8

# Stress test with many files
similarity-ts benchmarks/data/ --threshold 0.7 --min-tokens 10
```

## Notes

These files are not meant for understanding the tool's basic functionality.
For specification examples, see `examples/specs/`.