# Vite Application Setup Guide

This guide provides minimal Vite configuration for building web applications with TypeScript. For library bundling, see [bundler.md](bundler.md).

## Prerequisites

- TypeScript configured
- Vite for testing

```bash
pnpm add vite -D
```

## Configuration

### vite.config.ts

Since Vitest uses Vite under the hood, rename `vitest.config.ts` to `vite.config.ts`:

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    // Your existing vitest configuration
    includeSource: ["src/**/*.ts"],
  },
});
```

### Update tsconfig.json

Add Vite-specific compiler options:

```json
{
  "compilerOptions": {
    // ... existing options
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "target": "ES2022"
  }
}
```

### Package.json Scripts

Add the following scripts to your existing `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

The `dev` and `build` commands are the essential additions for Vite development.

## Project Structure

Create the following files:

### index.html (project root)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### src/main.ts

```typescript
// Your application entry point
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<h1>Hello Vite!</h1>`;
```

## Development Workflow

1. **Start Development Server**

   ```bash
   pnpm dev
   ```

   Opens at http://localhost:5173

2. **Build for Production**

   ```bash
   pnpm build
   ```

3. **Preview Production Build**
   ```bash
   pnpm preview
   ```

## Next Steps

1. Add your application code in `src/`
2. Start development with `pnpm dev`
3. Build for production with `pnpm build`
