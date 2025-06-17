# Library Bundler Setup Guide

This document provides setup instructions for bundling TypeScript libraries with Vite Library Mode and tsdown.

## Vite (Library Mode)

### Overview

Vite can bundle TypeScript libraries using its Library Mode. For application development, see [vite.md](vite.md).

### Setup for Libraries

```bash
# Install Vite
pnpm add -D vite
```

### Library Configuration (vite.config.ts)

```typescript
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MyLibrary",
      fileName: "my-library",
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
  // Remove in-source testing code from production builds
  define: {
    "import.meta.vitest": "undefined",
  },
});
```

### Package.json for Library

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/my-library.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc && vite build",
    "prepublishOnly": "pnpm build"
  }
}
```

### Use Cases

- Publishing npm packages
- Building component libraries
- Creating utility libraries

## tsdown

### Overview

tsdown is a fast library bundler based on Rolldown with TypeScript support.

### Setup

```bash
# Install tsdown
pnpm add tsdown -D
```

### Basic Usage

```bash
# Build library
npx tsdown
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "tsdown",
    "prepublishOnly": "pnpm build"
  }
}
```

### Configuration (tsdown.config.ts)

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: ["esm"],
  dts: true,
  clean: true,
  define: {
    "import.meta.vitest": "undefined",
  },
});
```

### Use Cases

- Library development and publishing
- Migration from tsup
- Fast builds with type definitions
- TypeScript-first projects

## Comparison

| Feature          | Vite            | tsdown            |
| ---------------- | --------------- | ----------------- |
| Speed            | Fast dev server | Ultra-fast builds |
| Use Case         | Web apps        | Libraries         |
| HMR              | Yes             | No                |
| Type Definitions | Manual          | Automatic         |
| Ecosystem        | Large           | Growing           |

## Best Practices

### In-Source Testing

When using Vitest's in-source testing feature, add the following to your bundler config:

```typescript
define: {
  "import.meta.vitest": "undefined"
}
```

This ensures that test code is removed from production builds.

### Vite

- Use for frontend applications
- Leverage plugins for framework integration
- Configure build.lib for library mode
- Add define config for in-source testing

### tsdown

- Use for library publishing
- Migrate gradually from tsup
- Enable DTS generation for TypeScript libraries
- Add define config for in-source testing
