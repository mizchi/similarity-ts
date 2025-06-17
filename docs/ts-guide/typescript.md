# TypeScript Configuration and Performance Optimization

This document covers advanced TypeScript configuration and performance optimization techniques.

## Base Configuration

The baseline setup uses the following `tsconfig.json` configuration:

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
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/importMeta"]
  }
}
```

### Key Configuration Options

- `target: "esnext"`: Compile to the latest JavaScript features
- `module: "esnext"`: Use ES modules
- `moduleResolution: "bundler"`: Modern module resolution for bundlers
- `allowImportingTsExtensions`: Allow `.ts` extensions in imports (for Deno compatibility)
- `strict: true`: Enable all strict type checking options
- `skipLibCheck`: Skip type checking of declaration files for faster builds
- `noUnusedLocals: true`: Error on unused local variables
- `noUnusedParameters: false`: Allow unused function parameters (useful for interface implementations)

## Performance Optimization with TypeScript Native Preview (Optional)

**When to use**: Large codebases with slow type checking  
**Recommended**: No (experimental, use with caution)

### Installation

```bash
pnpm add @typescript/native-preview -D
```

### Usage

Replace `tsc` with `tsgo` in your scripts:

```json
{
  "scripts": {
    "typecheck": "tsgo --noEmit"
  }
}
```

### VS Code Integration

While you can enable tsgo in VS Code with the following setting, **this is not recommended**:

```json
// .vscode/settings.json
{
  "typescript.experimental.useTsgo": true
}
```

**Why not recommended**: Using tsgo in the IDE can lead to inconsistencies between your editor and the standard TypeScript compiler.

### Benefits

- **Faster Type Checking**: The native implementation can be several times faster than the standard TypeScript compiler
- **Drop-in Replacement**: Works with existing TypeScript configurations
- **Experimental Features**: Access to cutting-edge TypeScript features before they land in the stable release

### Important Considerations

- This is an experimental preview and may have bugs or missing features
- **Only use for the `typecheck` script**, not for builds or IDE integration
- **If you encounter any differences between `tsc` and `tsgo` output, stop using tsgo immediately**
- Not recommended for production builds
- Best suited for development-time type checking to improve iteration speed
- Monitor the [official announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-native-previews/) for updates

### Recommended Approach

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:fast": "tsgo --noEmit"
  }
}
```

Use `typecheck:fast` during development if you need faster feedback, but always verify with standard `tsc` before committing.

## Advanced Configuration Options

### Strict Mode Options

**When to use**: New projects  
**Recommended**: Yes (use `"strict": true`)

```json
{
  "compilerOptions": {
    "strict": true,
    // Or configure individually:
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Output Configuration

**When to use**: Library packages  
**Recommended**: Yes for libraries, No for applications

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

## Building Without Bundlers

**When to use**: Library packages without bundling  
**Recommended**: Yes for publishable libraries

### Separate Output for JavaScript and Type Declarations

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist-types",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "allowImportingTsExtensions": false
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
```

**Note**: When building for distribution, set `allowImportingTsExtensions: false` and remove `.ts` extensions from imports.

### Package.json Exports Configuration

Configure your `package.json` to properly expose both JavaScript and TypeScript types:

```json
{
  "name": "@your-scope/package-name",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist-types/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./utils": {
      "types": "./dist-types/utils.d.ts",
      "import": "./dist/utils.js",
      "default": "./dist/utils.js"
    },
    "./package.json": "./package.json"
  },
  "main": "./dist/index.js",
  "types": "./dist-types/index.d.ts",
  "files": ["dist", "dist-types", "!**/*.test.*", "!**/*.spec.*"],
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rm -rf dist dist-types"
  }
}
```

### Build Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist dist-types",
    "prepublishOnly": "pnpm run clean && pnpm run build"
  }
}
```

### Advanced Exports with Subpath Patterns

**When to use**: Multi-entry point libraries  
**Recommended**: Optional

```json
{
  "exports": {
    ".": {
      "types": "./dist-types/index.d.ts",
      "import": "./dist/index.js"
    },
    "./*": {
      "types": "./dist-types/*.d.ts",
      "import": "./dist/*.js"
    },
    "./components": {
      "types": "./dist-types/components/index.d.ts",
      "import": "./dist/components/index.js"
    },
    "./components/*": {
      "types": "./dist-types/components/*.d.ts",
      "import": "./dist/components/*.js"
    }
  }
}
```
