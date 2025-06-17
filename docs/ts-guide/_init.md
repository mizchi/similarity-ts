# Project Setup Guide

This document records the setup process for TypeScript project

## Quick Start

To quickly create a new project using this template:

```bash
# Put this document under your `docs/ts-guide`
npx -y tiged mizchi/ts-guide/docs/ts-guide ./docs/ts-guide
# run with claude code
claude "Setup this project by docs/ts-guide/_init.md"
claude "Eject unused document by docs/ts-guide/eject.md"
```

> **Note**: This Quick Start section describes how to place this documentation itself in your project.
> During actual project execution, this section should be ignored as it serves only as a setup reference for humans.

## For Existing Projects

If your project already has TypeScript and basic tooling configured, **skip to the Post-Actions section** to add specific features:

- [typescript.md](typescript.md) - Advanced TypeScript configuration
- [linter.md](linter.md) - Add ESLint, oxlint, or Biome
- [formatter.md](formatter.md) - Add Prettier or Biome
- [error-handling.md](error-handling.md) - Add Result types
- [fp.md](fp.md) - Functional domain modeling patterns
- [bundler.md](bundler.md) - Bundle TypeScript libraries
- [vite.md](vite.md) - Build web applications with Vite
- [workspace.md](workspace.md) - Convert to monorepo
- [ci.md](ci.md) - Setup GitHub Actions

## Baseline Setup

Always perform baseline setup:

- pnpm
- typescript
- vitest

```bash
pnpm init --init-type module
pnpm add typescript vitest @vitest/coverage-v8 @types/node -D
echo "node_modules\ntmp\ncoverage" > .gitignore
mkdir -p src

# git
git init
git add .
git commit -m "init"
```

package.json

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:cov": "vitest run --coverage",
    "check": "pnpm typecheck && pnpm test"
  },
  "license": "MIT",
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

> **Note**: The `check` script runs all necessary checks before committing. This will be extended with linter and formatter checks when those tools are added.

tsconfig.json

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["vitest/importMeta"]
  }
}
```

vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    includeSource: ["src/**/*.ts"],
    include: ["src/**/*.{test,spec}.{ts}"],
  },
});
```

> **Note**: The `includeSource` pattern should be `["src/**/*.ts"]` without curly braces. Using `["src/**/*.{ts}"]` will cause Vitest to not find in-source tests.

Entry point: src/index.ts

```typescript
/**
 * explanation of this module
 */
export {};
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  test("init", () => {
    expect(true).toBe(true);
  });
}
```

.github/workflows/ci.yaml

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

## Optional: AI Assistant Prompt Setup

See [agent_prompt.md](03_prompt.md) for AI assistant integration options (Claude, Cursor, Cline, Roo).

## Optional: Error Handling

See [error-handling.md](error-handling.md) for Result type options (neverthrow or custom implementation).

## Additional Steps Performed

After the initial setup, the following additional step was required:

```bash
pnpm approve-builds
```

This command was executed to approve the esbuild package build and resolve pnpm warnings related to the `"onlyBuiltDependencies": ["esbuild"]` configuration in package.json.

## Verify Setup

After completing the baseline setup, verify that everything is working correctly:

```bash
pnpm check
```

This command will run:

- Type checking with TypeScript
- All tests with Vitest

If all checks pass, your project is correctly configured and ready for development.

## Post-Actions (Additional Setup Options)

- **TypeScript**: See [typescript.md](typescript.md) for advanced TypeScript configuration and performance optimization
- **Linter**: See [linter.md](linter.md) for ESLint, oxlint, or Biome setup
- **Formatter**: See [formatter.md](formatter.md) for Prettier or Biome setup
- **Error Handling**: See [error-handling.md](error-handling.md) for Result types with neverthrow
- **Domain Modeling**: See [fp.md](fp.md) for functional programming patterns
- **Library Bundling**: See [bundler.md](bundler.md) for Vite Library Mode or tsdown
- **Web Applications**: See [vite.md](vite.md) for Vite application setup
- **Workspace**: See [workspace.md](workspace.md) for monorepo conversion

## Cleanup

See [eject.md](eject.md) for removing this documentation after setup.
