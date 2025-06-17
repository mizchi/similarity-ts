# Monorepo Setup Guide

This document describes how to convert this project into a monorepo structure using `packages/*`.

## Directory Structure

```
project-root/
├── packages/
│   ├── package-a/
│   │   ├── package.json
│   │   ├── src/
│   │   └── ...
│   ├── package-b/
│   │   ├── package.json
│   │   ├── src/
│   │   └── ...
│   └── ...
├── package.json (workspace root)
├── pnpm-workspace.yaml
└── ...
```

## Setup Steps

### 1. Create pnpm-workspace.yaml

Create `pnpm-workspace.yaml` in the project root:

```yaml
packages:
  - "packages/*"
```

### 2. Update Root package.json

Update the root `package.json` to include workspace configuration:

```json
{
  "name": "your-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "dev": "pnpm -r dev"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@vitest/coverage-v8": "3.2.3",
    "typescript": "^5.8.3",
    "vitest": "^3.2.3"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  }
}
```

### 3. Create Package Structure

For each package in `packages/`, create:

#### packages/[package-name]/package.json

```json
{
  "name": "@your-scope/package-name",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:cov": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "neverthrow": "^8.2.0"
  },
  "devDependencies": {
    "@types/node": "workspace:*",
    "@vitest/coverage-v8": "workspace:*",
    "typescript": "workspace:*",
    "vitest": "workspace:*"
  }
}
```

#### packages/[package-name]/tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

#### packages/[package-name]/src/index.ts

```typescript
/**
 * Package description
 */

// Export the main function that matches the package name
export function packageName() {
  // Implementation
}

// Private functions and utilities
function privateHelper() {
  // Implementation
}
```

### 4. Workspace Commands

Common pnpm workspace commands:

```bash
# Install dependencies for all packages
pnpm install

# Run a command in all packages
pnpm -r build
pnpm -r test
pnpm -r typecheck

# Run a command in a specific package
pnpm --filter @your-scope/package-name build

# Add a dependency to a specific package
pnpm --filter @your-scope/package-name add lodash

# Add a workspace dependency
pnpm --filter @your-scope/package-a add @your-scope/package-b
```

### 5. Cross-Package Dependencies

To use one package in another:

```typescript
// In packages/package-a/src/index.ts
import { packageB } from "@your-scope/package-b";

export function packageA() {
  return packageB();
}
```

Make sure to add the dependency in package.json:

```json
{
  "dependencies": {
    "@your-scope/package-b": "workspace:*"
  }
}
```

### 6. Build Order

pnpm automatically handles build order based on dependencies. For manual control, you can use:

```bash
# Build packages in dependency order
pnpm -r --workspace-concurrency=1 build
```

## Migration from Single Package

1. Move existing `src/` to `packages/core/src/`
2. Create `packages/core/package.json` based on the template above
3. Update imports in other packages to use `@your-scope/core`
4. Create `pnpm-workspace.yaml`
5. Update root `package.json`
6. Run `pnpm install` to link workspace dependencies

## Best Practices

- Use consistent naming: `@your-scope/package-name`
- Keep packages focused and cohesive
- Use workspace dependencies (`workspace:*`) for internal packages
- Maintain shared configuration in the root
- Use `pnpm -r` commands for operations across all packages
- Consider using changesets for versioning and publishing

## Turborepo Integration

### Overview

Turborepo is a high-performance build system for JavaScript and TypeScript codebases, providing intelligent caching and parallel execution.

### Setup

```bash
# Install Turborepo
pnpm add turbo -D
```

### Configuration (turbo.json)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts", "test/**/*.tsx"]
    },
    "lint": {
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "*.js", "*.ts"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalDependencies": ["**/.env.*local"]
}
```

### Update Package Scripts

```json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev"
  }
}
```

### Advanced Turborepo Features

```bash
# Run with cache
turbo run build

# Force rebuild without cache
turbo run build --force

# Run specific packages
turbo run build --filter=@your-scope/package-a

# Parallel execution with concurrency limit
turbo run test --concurrency=4

# Generate dependency graph
turbo run build --graph
```

## Comparison: Basic vs Turborepo

| Feature             | Basic pnpm | Turborepo   |
| ------------------- | ---------- | ----------- |
| Caching             | No         | Intelligent |
| Parallel Execution  | Limited    | Optimized   |
| Dependency Tracking | Manual     | Automatic   |
| Remote Caching      | No         | Yes         |
| Build Analytics     | No         | Yes         |
| Setup Complexity    | Simple     | Moderate    |

## Troubleshooting

### Common Issues

#### Dependency Resolution

```bash
# Clear node_modules and reinstall
rm -rf node_modules packages/*/node_modules
pnpm install

# Check workspace dependencies
pnpm list --depth=0
```

#### Build Order Issues

```bash
# Force sequential builds
pnpm -r --workspace-concurrency=1 build

# Check dependency graph
pnpm why @your-scope/package-name
```

#### TypeScript Path Resolution

```json
// Root tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@your-scope/*": ["packages/*/src"]
    }
  }
}
```

#### TypeScript Project References (Optional)

For large monorepos, TypeScript Project References can improve build performance and provide better IDE support:

```json
// Root tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" },
    { "path": "./packages/api" },
    { "path": "./packages/web" }
  ]
}
```

```json
// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": []
}
```

```json
// packages/api/tsconfig.json (depends on core)
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../core" }]
}
```

**Benefits of Project References:**

- Incremental builds across packages
- Better editor performance with large codebases
- Enforces dependency constraints at compile time
- Parallel compilation of independent packages

**Usage:**

```bash
# Build with project references
tsc --build

# Build specific package and dependencies
tsc --build packages/api

# Clean build outputs
tsc --build --clean
```

### Performance Optimization

#### pnpm Configuration (.npmrc)

```
# Enable hoisting for better performance
hoist-pattern[]=*eslint*
hoist-pattern[]=*prettier*

# Reduce package-lock noise
package-import-method=hardlink

# Enable strict peer dependencies
strict-peer-dependencies=true
```

#### Turborepo Optimization

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "inputs": ["src/**", "package.json", "tsconfig.json"]
    }
  },
  "remoteCache": {
    "signature": true
  }
}
```

## CI/CD Integration

### GitHub Actions Configuration for Workspace

When working with workspace projects, GitHub Actions workflows need to be adapted to handle multiple packages efficiently. This section covers various strategies for building, testing, and deploying workspace-based projects.

### Basic Workspace Workflow

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build All Packages
        run: pnpm -r build

      - name: Test All Packages
        run: pnpm -r test

      - name: Lint All Packages
        run: pnpm -r lint

      - name: Type Check All Packages
        run: pnpm -r typecheck
```

### Workflow Examples for Multi-Package Setup

#### 1. Matrix Strategy for Package-Specific Jobs

```yaml
name: Multi-Package CI
on: [push, pull_request]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.changes.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Detect changed packages
        id: changes
        run: |
          CHANGED_PACKAGES=$(git diff --name-only HEAD~1 HEAD | grep '^packages/' | cut -d'/' -f2 | sort -u | jq -R -s -c 'split("\n")[:-1]')
          echo "packages=$CHANGED_PACKAGES" >> $GITHUB_OUTPUT

  build-and-test:
    needs: detect-changes
    if: needs.detect-changes.outputs.packages != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJson(needs.detect-changes.outputs.packages) }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build package
        run: pnpm --filter @your-scope/${{ matrix.package }} build

      - name: Test package
        run: pnpm --filter @your-scope/${{ matrix.package }} test

      - name: Lint package
        run: pnpm --filter @your-scope/${{ matrix.package }} lint
```

#### 2. Dependency-Aware Build Order

```yaml
name: Dependency-Aware CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # Build packages in dependency order
      - name: Build Core Packages
        run: pnpm --filter "@your-scope/utils" --filter "@your-scope/types" build

      - name: Build Application Packages
        run: pnpm --filter "@your-scope/api" --filter "@your-scope/web" build

      - name: Build Integration Packages
        run: pnpm --filter "@your-scope/cli" build

      # Test all packages after build
      - name: Test All Packages
        run: pnpm -r test
```

### Efficient CI/CD for Workspace Projects

#### 1. Turborepo Integration with Change Detection

```yaml
name: Turborepo CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # Only build/test changed packages and their dependents
      - name: Build Changed Packages
        run: pnpm turbo run build --filter=...[HEAD^1]

      - name: Test Changed Packages
        run: pnpm turbo run test --filter=...[HEAD^1]

      - name: Lint Changed Packages
        run: pnpm turbo run lint --filter=...[HEAD^1]

      - name: Type Check Changed Packages
        run: pnpm turbo run typecheck --filter=...[HEAD^1]
```

#### 2. Parallel Jobs with Dependency Management

```yaml
name: Parallel Workspace CI
on: [push, pull_request]

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Cache workspace
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
          key: ${{ runner.os }}-workspace-${{ hashFiles('pnpm-lock.yaml') }}

  lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Restore workspace cache
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
          key: ${{ runner.os }}-workspace-${{ hashFiles('pnpm-lock.yaml') }}

      - run: pnpm -r lint

  typecheck:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Restore workspace cache
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
          key: ${{ runner.os }}-workspace-${{ hashFiles('pnpm-lock.yaml') }}

      - run: pnpm -r typecheck

  build-and-test:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Restore workspace cache
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
          key: ${{ runner.os }}-workspace-${{ hashFiles('pnpm-lock.yaml') }}

      - run: pnpm -r build
      - run: pnpm -r test
```

### Package-specific Build and Test Strategies

#### 1. Conditional Package Building

```yaml
name: Conditional Package CI
on: [push, pull_request]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      core: ${{ steps.changes.outputs.core }}
      api: ${{ steps.changes.outputs.api }}
      web: ${{ steps.changes.outputs.web }}
      cli: ${{ steps.changes.outputs.cli }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            core:
              - 'packages/core/**'
            api:
              - 'packages/api/**'
              - 'packages/core/**'
            web:
              - 'packages/web/**'
              - 'packages/core/**'
            cli:
              - 'packages/cli/**'
              - 'packages/core/**'

  build-core:
    needs: changes
    if: needs.changes.outputs.core == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @your-scope/core build
      - run: pnpm --filter @your-scope/core test

  build-api:
    needs: [changes, build-core]
    if: needs.changes.outputs.api == 'true' && (success() || needs.build-core.result == 'skipped')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @your-scope/api... build
      - run: pnpm --filter @your-scope/api test

  build-web:
    needs: [changes, build-core]
    if: needs.changes.outputs.web == 'true' && (success() || needs.build-core.result == 'skipped')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @your-scope/web... build
      - run: pnpm --filter @your-scope/web test

  build-cli:
    needs: [changes, build-core]
    if: needs.changes.outputs.cli == 'true' && (success() || needs.build-core.result == 'skipped')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @your-scope/cli... build
      - run: pnpm --filter @your-scope/cli test
```

#### 2. Package-Specific Deployment

```yaml
name: Deploy Packages
on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'packages/api/')
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @your-scope/api... build
      - name: Deploy API
        run: |
          # Deploy API package
          echo "Deploying API package..."

  deploy-web:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'packages/web/')
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @your-scope/web... build
      - name: Deploy Web
        run: |
          # Deploy web package
          echo "Deploying Web package..."
```

### Workspace Cache Strategies

#### 1. Multi-Level Caching

```yaml
name: Advanced Caching CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      # Cache node_modules
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
          key: ${{ runner.os }}-deps-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-deps-

      # Cache build outputs
      - name: Cache build outputs
        uses: actions/cache@v4
        with:
          path: |
            packages/*/dist
            packages/*/build
          key: ${{ runner.os }}-build-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-build-

      # Cache Turborepo
      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build test lint
```

#### 2. Remote Caching with Turborepo

```yaml
name: Remote Cache CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # Use Turborepo remote caching
      - name: Build with remote cache
        run: pnpm turbo run build --token=${{ secrets.TURBO_TOKEN }} --team=${{ secrets.TURBO_TEAM }}
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Test with remote cache
        run: pnpm turbo run test --token=${{ secrets.TURBO_TOKEN }} --team=${{ secrets.TURBO_TEAM }}
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

### Migration from Single Package Workflows

#### Before: Single Package Workflow

```yaml
# Old single package workflow
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run lint
```

#### After: Workspace Workflow

```yaml
# New workspace workflow
name: Workspace CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # Build only changed packages and their dependents
      - run: pnpm turbo run build --filter=...[HEAD^1]
      - run: pnpm turbo run test --filter=...[HEAD^1]
      - run: pnpm turbo run lint --filter=...[HEAD^1]
```

### Best Practices for Workspace CI/CD

#### 1. Optimization Strategies

- **Use change detection**: Only build/test packages that have changed
- **Leverage caching**: Cache dependencies, build outputs, and Turborepo cache
- **Parallel execution**: Run independent packages in parallel
- **Dependency awareness**: Build packages in correct dependency order
- **Selective deployment**: Deploy only changed packages

#### 2. Performance Considerations

```yaml
# Example of optimized workflow
name: Optimized Workspace CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      # Install with frozen lockfile for reproducibility
      - run: pnpm install --frozen-lockfile

      # Use Turborepo for intelligent caching and parallel execution
      - name: Build, test, and lint changed packages
        run: |
          pnpm turbo run build test lint \
            --filter=...[HEAD^1] \
            --concurrency=4 \
            --cache-dir=.turbo
        env:
          # Enable remote caching if available
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

#### 3. Error Handling and Debugging

```yaml
name: Robust Workspace CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v4
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # Continue on error to run all checks
      - name: Build packages
        run: pnpm turbo run build --filter=...[HEAD^1]
        continue-on-error: true
        id: build

      - name: Test packages
        run: pnpm turbo run test --filter=...[HEAD^1]
        continue-on-error: true
        id: test

      - name: Lint packages
        run: pnpm turbo run lint --filter=...[HEAD^1]
        continue-on-error: true
        id: lint

      # Fail the job if any step failed
      - name: Check results
        if: steps.build.outcome == 'failure' || steps.test.outcome == 'failure' || steps.lint.outcome == 'failure'
        run: exit 1

      # Upload build artifacts on failure for debugging
      - name: Upload build logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: build-logs
          path: |
            packages/*/dist
            .turbo/runs
```

## Advanced Patterns

### Shared Configuration Packages

Create a shared config package:

```bash
mkdir packages/config
```

```json
// packages/config/package.json
{
  "name": "@your-scope/config",
  "version": "0.1.0",
  "main": "index.js",
  "files": ["*.js", "*.json"],
  "dependencies": {
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Workspace Protocols

```json
{
  "dependencies": {
    "@your-scope/shared": "workspace:*",
    "@your-scope/utils": "workspace:^1.0.0",
    "@your-scope/config": "workspace:~1.0.0"
  }
}
```

### Publishing Strategy

```bash
# Install changesets
pnpm add @changesets/cli -D

# Initialize changesets
pnpm changeset init

# Create changeset
pnpm changeset

# Version packages
pnpm changeset version

# Publish packages
pnpm changeset publish
```

## Migration Strategies

### From Lerna to pnpm Workspaces

1. Remove lerna.json
2. Create pnpm-workspace.yaml
3. Update package.json scripts
4. Migrate bootstrap to pnpm install
5. Update CI/CD configurations

### From Yarn Workspaces to pnpm

1. Remove yarn.lock
2. Update package.json workspaces to pnpm-workspace.yaml
3. Replace yarn commands with pnpm equivalents
4. Update CI/CD to use pnpm

### Adding Turborepo to Existing Monorepo

1. Install turbo
2. Create turbo.json with basic pipeline
3. Test with single package
4. Gradually add more packages
5. Optimize pipeline configuration

## Best Practices Summary

### Structure

- Use consistent package naming with scopes
- Keep packages small and focused
- Separate shared utilities into dedicated packages
- Use workspace protocols for internal dependencies

### Performance

- Enable Turborepo for large monorepos
- Use appropriate caching strategies
- Optimize dependency graphs
- Consider remote caching for teams

### Maintenance

- Use changesets for versioning
- Implement proper CI/CD pipelines
- Regular dependency updates
- Monitor build performance
