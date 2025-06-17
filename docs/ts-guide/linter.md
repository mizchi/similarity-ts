# Linter Setup Guide

This document provides concise setup instructions for oxlint, ESLint, and Biome linters.

## oxlint (Recommended)

### Overview

oxlint is a Rust-based linter that provides extremely fast linting with zero configuration. It offers:

- **Blazing Fast Performance**: Written in Rust, it's significantly faster than JavaScript-based linters
- **Comprehensive Rule Set**: Includes most essential ESLint rules and TypeScript-specific rules
- **Zero Configuration**: Works out of the box with sensible defaults
- **Growing Ecosystem**: Actively maintained with regular updates and new rules

### Setup

```bash
# Install oxlint
pnpm add -D oxlint
```

### Package.json Scripts

```json
{
  "scripts": {
    "lint": "oxlint --silent",
    "lint:strict": "oxlint --deny-warnings",
    "check:file": "oxlint"
  }
}
```

> **Note**: The `check:file` command allows linting specific files: `pnpm check:file src/index.ts`

### Configuration (.oxlintrc.json)

```json
{
  "plugins": ["promise", "import", "node"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn"
  },
  "rules": {
    "no-console": "warn",
    "typescript/no-explicit-any": "error"
  },
  "ignorePatterns": ["node_modules", "dist", "build", "coverage", "*.min.js"]
}
```

### CI Integration

```yaml
# In .github/workflows/ci.yaml
- run: pnpm lint
```

## ESLint

### Overview

ESLint is the standard JavaScript/TypeScript linter with extensive plugin ecosystem and customizable rules.

### Setup

```bash
# Install ESLint with TypeScript support
pnpm add -D eslint @eslint/js @types/eslint__js typescript-eslint
```

### Configuration (eslint.config.ts)

```typescript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/explicit-function-return-type": "warn",
    },
  },
  {
    ignores: ["node_modules", "dist", "coverage", "*.min.js"],
  },
);
```

### Package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "check:file": "eslint"
  }
}
```

> **Note**: The `check:file` command allows linting specific files: `pnpm check:file src/index.ts`

### Advanced Configuration

```bash
# Add Prettier compatibility
pnpm add -D eslint-config-prettier
```

```typescript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Your custom rules
    },
  },
);
```

## Biome

### Overview

Biome is an all-in-one toolchain that combines linting, formatting, and import organization. Written in Rust for performance.

### Setup

```bash
# Install Biome
pnpm add -D @biomejs/biome
```

### Configuration (biome.json)

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "off",
        "useConst": "error"
      },
      "correctness": {
        "noUnusedVariables": "error"
      }
    }
  },
  "formatter": {
    "enabled": false
  },
  "files": {
    "ignore": ["node_modules", "dist", "coverage", "*.min.js"]
  }
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "lint": "biome lint .",
    "lint:fix": "biome lint --write .",
    "check:file": "biome lint"
  }
}
```

> **Note**: The `check:file` command allows linting specific files: `pnpm check:file src/index.ts`

Note: If using Biome for linting, you can also enable its formatter and disable other formatters to have a unified toolchain.

## Selection Guidelines

### Choose oxlint when:

- Performance is critical
- You want zero configuration
- You need fast CI/CD feedback
- Your project uses standard linting rules

### Choose ESLint when:

- You need specific plugins or custom rules
- Your team has existing ESLint configurations
- You require deep customization
- You need compatibility with specific tools

### Choose Biome when:

- You want unified linting and formatting
- Performance is important
- You prefer a single tool for code quality
- You're starting a new project

## Integration with check script

When adding a linter, update the main `check` script to include linting:

```json
{
  "scripts": {
    "check": "pnpm typecheck && pnpm test && pnpm format:check && pnpm lint"
  }
}
```

## Migration Strategies

### From ESLint to oxlint

1. Install oxlint
2. Create basic .oxlintrc.json
3. Run both linters in parallel during transition
4. Gradually remove ESLint

### From oxlint to ESLint

1. Install ESLint dependencies
2. Create eslint.config.ts based on oxlint rules
3. Add necessary plugins
4. Remove oxlint

### From ESLint/Prettier to Biome

1. Install Biome
2. Run `biome migrate` to convert configurations
3. Disable Prettier
4. Remove ESLint if using Biome for linting

## Best Practices

### oxlint

- Use for performance-critical projects
- Combine with other tools for comprehensive checking
- Ideal for large codebases
- Good for CI/CD pipelines

### ESLint

- Use with Prettier for formatting
- Extend recommended configurations
- Add project-specific rules gradually
- Use eslint-disable comments sparingly

### Biome

- Use when you want unified linting and formatting
- Excellent performance due to Rust implementation
- Good TypeScript support out of the box
- Consider for new projects or when migrating from multiple tools

## Troubleshooting

### oxlint

- **Missing rules**: Check oxlint documentation for supported rules
- **Configuration**: Ensure .oxlintrc.json is valid JSON
- **File patterns**: Use correct glob patterns for file matching

### ESLint

- **Parsing errors**: Check parser configuration
- **Rule conflicts**: Use eslint-config-prettier
- **Performance**: Use .eslintignore for large files

### Biome

- **Rule conflicts**: Disable conflicting formatters when using Biome
- **Migration**: Use `biome migrate` to convert ESLint config
- **Performance**: Generally faster than ESLint, comparable to oxlint

## CI/CD Integration

All linters support GitHub Actions integration. The `lint` command should be run in CI to ensure code quality consistency across the team.
