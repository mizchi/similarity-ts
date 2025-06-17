# CLI Application Guide

This guide explains how to create a command-line interface (CLI) application using Node.js built-in `parseArgs` from `node:util`.

## Basic CLI Structure

### 1. Create the main CLI file

Create `src/cli.ts`:

```typescript
#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    name: {
      type: "string",
      short: "n",
      default: "World",
    },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: my-cli [options]

Options:
  -h, --help       Show help
  -n, --name       Name to greet (default: World)

Example:
  my-cli --name Alice
`);
  process.exit(0);
}

// Main logic
console.log(`Hello, ${values.name}!`);
if (positionals.length > 0) {
  console.log(`Additional arguments: ${positionals.join(", ")}`);
}
```

### 2. Update package.json

Add the bin field to make your CLI executable:

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "my-cli": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts"
  }
}
```

1. Ensure `bin` field in package.json points to the compiled JavaScript
2. Add a shebang line (`#!/usr/bin/env node`) to your CLI entry point

### 3. Making it Executable

After building:

```bash
# Build the TypeScript files
pnpm run build

# Make it globally available
pnpm link --global

# Now you can use it anywhere
my-cli --help
```

## Testing CLI Applications

First, install zx as a dev dependency:

```bash
pnpm add -D zx
```

Create `src/cli.test.ts`:

```typescript
import { test, expect } from "vitest";
import { $ } from "zx";

test("CLI shows help", async () => {
  const result = await $`tsx src/cli.ts --help`.nothrow();
  expect(result.stdout).toContain("Usage:");
  expect(result.exitCode).toBe(0);
});

test("CLI greets with default name", async () => {
  const result = await $`tsx src/cli.ts`.nothrow();
  expect(result.stdout).toContain("Hello, World!");
  expect(result.exitCode).toBe(0);
});

test("CLI greets with custom name", async () => {
  const result = await $`tsx src/cli.ts --name Alice`.nothrow();
  expect(result.stdout).toContain("Hello, Alice!");
  expect(result.exitCode).toBe(0);
});

test("CLI accepts positional arguments", async () => {
  const result = await $`tsx src/cli.ts extra args`.nothrow();
  expect(result.stdout).toContain("Additional arguments: extra, args");
  expect(result.exitCode).toBe(0);
});
```
