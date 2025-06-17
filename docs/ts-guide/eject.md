# Eject Guide

This guide explains how to clean up the ts-guide documentation after project setup is complete.

## Process

### 1. Generate Project Overview

Analyze the current project implementation and generate a summary:

```bash
# This process will:
# 1. Delete _init.md (no longer needed)
# 2. Analyze package.json, configuration files, and project structure
# 3. Generate docs/overview.md with the adopted technologies
rm docs/ts-guide/_init.md
```

The generated `docs/overview.md` should include:

- **Build Tools**: TypeScript configuration, bundler choice
- **Testing**: Test runner and coverage tools
- **Code Quality**: Linter and formatter selection
- **Error Handling**: Result type implementation
- **Project Structure**: Workspace setup (if applicable)
- **Note**: "This project was bootstrapped from ts-guide and ejected on [DATE]"

### 2. Remove ts-guide Directory

After generating the overview:

```bash
# Remove all ts-guide documentation
rm -rf docs/ts-guide
```

### 3. Example Overview Output

`docs/overview.md` should look like:

```markdown
# Project Overview

This project uses the following stack:

## Core Technologies

- **Language**: TypeScript 5.8+
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm

## Build Configuration

- **TypeScript**: Strict mode enabled, incremental compilation
- **Output**: ESM modules

## Testing

- **Test Runner**: Vitest
- **Coverage**: V8

## Code Quality

- **Linter**: oxlint
- **Formatter**: Biome

## Error Handling

- **Strategy**: neverthrow for Result types

---

_This project was bootstrapped from [ts-guide](https://github.com/mizchi/ts-guide) and ejected on 2024-01-15._
```

## Benefits

This approach:

- Creates a concise record of technology choices
- Removes setup documentation that's no longer relevant
- Preserves attribution to the original template
- Keeps the project documentation focused on actual implementation

## Implementation Checklist

When implementing the eject process:

1. [ ] Parse `package.json` for dependencies and scripts
2. [ ] Check for configuration files (`.eslintrc`, `biome.json`, etc.)
3. [ ] Detect workspace setup (`pnpm-workspace.yaml`, `turbo.json`)
4. [ ] Identify error handling approach (check imports for neverthrow)
5. [ ] Generate comprehensive but concise overview
6. [ ] Include eject timestamp and attribution
7. [ ] Remove all ts-guide files
