# Dead Code Elimination

## Overview

This document explains how to detect dead code in TypeScript projects.

## Tool: ts-remove-unused (tsr)

### Installation and Execution

```bash
# Run directly with npx (recommended)
npx -y tsr [options] [...entrypoints]

# Or, run with old package name (deprecated)
npx -y @line/ts-remove-unused  # -> warns to use tsr
```

### Basic Usage

1. **Check help**

```bash
npx -y tsr --help
```

2. **Check with single entrypoint**

```bash
npx -y tsr 'src/index\.ts$'
```

3. **Check with multiple entrypoints**

```bash
npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$'
```

4. **Check including test files**

```bash
npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$' 'test/.*\.ts$' 'src/.*_test\.ts$'
```

### Options

- `-w, --write`: Write changes directly to files
- `-r, --recursive`: Recursively check until project is clean
- `-p, --project <file>`: Path to custom tsconfig.json
- `--include-d-ts`: Include .d.ts files in the check

## Real Analysis Example

### 1. Initial Run

```bash
$ npx -y tsr 'src/index\.ts$'
```

Results:

- 67 unused exports
- 15 unused files

### 2. Run including CLI

```bash
$ npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$'
```

Results:

- Unused files reduced to 14 (excluding those used by CLI)

### 3. Run including test files

```bash
$ npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$' 'test/.*\.ts$' 'src/.*_test\.ts$'
```

Results:

- Unused files reduced to 4 (excluding those used in tests)

## Interpreting Analysis Results

### Types of Unused Exports

1. **Type Definitions** (`oxc_types.ts`)

   - Many AST types are exported but unused
   - Action: Export only actually used types

2. **Internal Utility Functions**

   - Example: `getNodeLabel`, `getNodeChildren` (apted.ts)
   - Action: Remove `export` as they are internal implementation

3. **Helper Functions**
   - Example: `collectNodes`, `findNode` (ast_traversal.ts)
   - Action: Consider if needed as public API

### Types of Unused Files

1. **Test-only Files**

   - `*_test.ts` files
   - Action: Include as test entrypoints

2. **Duplicate Functionality**

   - Example: `function_body_comparer.ts` (integrated elsewhere)
   - Action: Delete

3. **Experimental Code**
   - Example: `ast_traversal_with_context.ts`
   - Action: Delete or move to `experimental/`

## Recommended Workflow

1. **First run analysis only**

```bash
npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$'
```

2. **Review results and decide action plan**

- Items that can be deleted
- Items to remove export but keep as internal implementation
- Items to keep for future use

3. **Clean up incrementally**

- First delete obviously unnecessary items
- Then remove `export` from internal implementations
- Finally organize type definitions

4. **Automatic fixes (carefully)**

```bash
# Take backup before running
git stash
npx -y tsr --write 'src/index\.ts$' 'src/cli/cli\.ts$'
git diff  # Check changes
```

## Notes

1. **Dynamic imports**: tsr uses static analysis and cannot detect dynamic imports
2. **Type-only exports**: `export type` is also detected as unused
3. **Re-exports**: Be careful with barrel files (index.ts)

## Example in This Project

1. **Unused code found in diagnostics**

   - Unused imports in `semantic_normalizer.ts`
   - `extractSemanticPatterns` function (commented out for potential future use)

2. **Actions taken**

   - Removed unused imports
   - Kept potentially useful code commented out

3. **Results**
   - Cleaner codebase
   - Expected reduction in build size
