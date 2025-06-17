# Test Runner Setup

This project supports the following test runner options:

## Vitest (Default)

Vitest is a Vite-based fast test runner that provides Jest-compatible APIs with built-in TypeScript support.

### Installation

```bash
pnpm add -D vitest @vitest/coverage-v8
```

### Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/**/*.config.*",
        "src/types/**",
      ],
    },
  },
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest --run",
    "test:watch": "vitest --watch",
    "test:cov": "vitest run --coverage"
  }
}
```

### Example Usage

```typescript
// src/example.test.ts
import { describe, it, expect } from "vitest";
import { add } from "./example.ts";

describe("add", () => {
  it("should add two numbers", () => {
    expect(add(1, 2)).toBe(3);
  });
});
```

### Vitest Workspace Configuration

When working with a monorepo (as described in `docs/setup/workspace.md`), enable Vitest workspace mode by creating `vitest.workspace.ts` in the root:

```typescript
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  // Include all packages
  "packages/*",
  // Or define specific configurations
  {
    extends: "./vitest.config.ts",
    test: {
      name: "unit",
      include: ["packages/*/src/**/*.test.ts"],
    },
  },
  {
    test: {
      name: "integration",
      include: ["packages/*/tests/**/*.test.ts"],
    },
  },
]);
```

Run specific workspace projects:

```bash
# Run all tests
pnpm test

# Run specific project
pnpm vitest --run --project unit
```

## Node.js Test Runner

Node.js 20+ includes a built-in test runner that requires no additional dependencies, suitable for simple testing scenarios.

### Configuration

#### Node.js 22+ Direct TypeScript Execution

Node.js 22+ can execute `.ts` files directly with experimental TypeScript support:

```json
{
  "scripts": {
    "test": "node --test src/**/*.test.ts",
    "test:watch": "node --test --watch src/**/*.test.ts"
  }
}
```

**Important**: When using `allowImportingTsExtensions` in `tsconfig.json`, you must include the `.ts` extension in all imports:

```typescript
// ❌ Without extension won't work with allowImportingTsExtensions
import { add } from "./example";

// ✅ Include the .ts extension
import { add } from "./example.ts";
```

### Example Usage

```typescript
// src/example.test.ts
import { test } from "node:test";
import assert from "node:assert";
import { add } from "./example.ts";

test("add should add two numbers", () => {
  assert.strictEqual(add(1, 2), 3);
});

test("add with async", async (t) => {
  await t.test("nested test", () => {
    assert.strictEqual(add(2, 3), 5);
  });
});
```

## Selection Guidelines

- **Choose Vitest when**:

  - Jest-compatible API is required
  - Advanced mocking features are needed
  - Snapshot testing is required
  - UI-based test execution is desired
  - Detailed coverage reporting is important

- **Choose Node.js Test Runner when**:
  - Minimizing dependencies is a priority
  - Only simple unit tests are needed
  - Staying within Node.js built-in features is preferred
  - Fast startup time is critical

## Test File Organization

Following the rules in CLAUDE.md:

- Create `src/*.test.ts` for each `src/*.ts`
- Export a function matching the filename and keep everything else private
