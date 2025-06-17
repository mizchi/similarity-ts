# Formatter Setup

This project supports multiple code formatting options. Choose the one that best fits your needs.

## Prettier (Popular Choice)

Prettier is an opinionated code formatter with support for many languages.

### Installation

```bash
pnpm add -D prettier
```

### Configuration

Create `.prettierrc.json`:

```json
{
  "semi": true
}
```

Create `.prettierignore`:

```
node_modules
dist
coverage
*.min.js
pnpm-lock.yaml
```

### Package.json Scripts

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check:file": "prettier --check"
  }
}
```

> **Note**: The `check:file` command allows checking specific files: `pnpm check:file src/index.ts`

### VSCode Integration

First, create `.vscode` directory if it doesn't exist:

```bash
mkdir -p .vscode
```

Then create or modify `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

If `.vscode/settings.json` already exists, merge these settings with the existing configuration.

## Biome (All-in-One Tool)

Biome is a fast formatter and linter written in Rust that can replace both Prettier and ESLint.

Now we use formatter.

### Installation

```bash
pnpm add -D @biomejs/biome
```

### Configuration

Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "semicolons": "always"
    }
  },
  "linter": {
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
    "format": "biome format --write .",
    "format:check": "biome format .",
    "check:file": "biome format"
  }
}
```

> **Note**: The `check:file` command allows checking specific files: `pnpm check:file src/index.ts`

### VSCode Integration

Install the Biome extension from VSCode marketplace.

If `.vscode/settings.json` doesn't exist, create it:

```bash
mkdir -p .vscode
```

Then add to `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

If the file already exists, merge these settings carefully with the existing configuration.

## Selection Guidelines

### Choose Prettier when:

- You want a widely adopted, battle-tested formatter
- You need support for many file types (HTML, CSS, Markdown, etc.)
- You prefer minimal configuration with sensible defaults
- Your team is already familiar with Prettier

### Choose Biome when:

- You want a single tool for formatting and linting
- Performance is critical (Biome is significantly faster)
- You want import organization out of the box
- You prefer a more modern, Rust-based toolchain

## Integration with Existing Tools

Both formatters work well with the existing oxlint setup. If using Biome, you may want to disable oxlint to avoid redundancy, as Biome includes its own linter.

### Check Script Integration

When adding a formatter, update the main `check` script to include format checking:

```json
{
  "scripts": {
    "check": "pnpm typecheck && pnpm test && pnpm format:check"
  }
}
```

## CI/CD Integration

The project includes GitHub Actions configuration that runs format checks in CI. The `format:check` command ensures code formatting consistency across the team.

```yaml
# In .github/workflows/ci.yaml
- run: pnpm format:check
```

This prevents unformatted code from being merged. Developers should run `pnpm format` locally before committing to avoid CI failures.

See `docs/setup/ci.md` for complete CI configuration details.
