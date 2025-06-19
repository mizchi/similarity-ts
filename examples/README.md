# Examples

Simple, clear examples to understand similarity-ts functionality.

## Directory Structure

- `specs/` - Specification examples demonstrating core features
  - `duplicate-functions.ts` - Function similarity detection
  - `duplicate-types.ts` - Type similarity detection
  - `sample_project/` - Multi-file project example
  - Other test files for specific features

## Quick Test

```bash
# Test function detection
similarity-ts examples/specs/duplicate-functions.ts --threshold 0.8 --min-tokens 20

# Test type detection
similarity-ts examples/specs/duplicate-types.ts --experimental-types --threshold 0.8

# Test multi-file project
similarity-ts examples/specs/sample_project/ --threshold 0.85
```

See `specs/README.md` for expected results.