# AI Assistant Prompt Setup Guide

This guide covers setup for known coding agents:

- Claude (Anthropic)
- Cursor IDE
- Cline (VS Code extension)
- Roo Code
- GitHub Copilot

## Base Prompt (Shared)

All AI assistants use this common base prompt:

```
## Coding Rules
- File naming convention: `src/<lowerCamelCase>.ts`
- Add tests in `src/*.test.ts` for `src/*.ts`
- Use functions and function scope instead of classes
- Add `.ts` extension to imports for deno compatibility
- Do not disable any lint rules without explicit user approval
- Export a function that matches the filename, keep everything else private
- All lint errors must be fixed before committing code
- .oxlintrc.json must not be modified without user permission
- When importing Node.js standard library modules, use the `node:` namespace prefix (e.g., `import path from "node:path"`, `import fs from "node:fs"`)
- **IMPORTANT**: Always run `pnpm check` before committing to ensure all tests pass and code meets quality standards

## Error Handling Policy
- Do not throw exceptions in application code
- Use Result types for error handling instead of throwing
- Choose between neverthrow library or custom Result type from `src/utils/result.ts`
- All functions that can fail should return Result<T, E> instead of throwing
```

## Assistant Configurations

### Claude

**When to use:** Claude API integration

**Base file:** `CLAUDE.md`
**Additional files:** `.claude/settings.json`, `.mcp.json`

### Cursor

**When to use:** Cursor IDE with built-in AI

**Base file:** `.cursor/rules/rules.md`

### Cline

**When to use:** VS Code with Cline extension

**Base file:** `.clinerules`

### Roo

**When to use:** Roo Code assistant

**Base file:** `.roo/rules/rules.md`

### GitHub Copilot

**When to use:** GitHub Copilot integration

**Base file:** `.github/copilot-instructions.md`
