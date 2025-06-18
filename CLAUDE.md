## Project Goal

Calculate code similarity

## Project Structure

- **Rust implementation (crates/)**: メインの実装。今後の開発はこちらで行う
- **TypeScript implementation (src/)**: プロトタイプ実装。参考用

## Development Stack

### Rust (Main)
- cargo
- clap (CLI framework)

### TypeScript (Prototype)
- pnpm
- typescript
- tsdown

## Coding Rules

### Rust
- Follow standard Rust conventions
- Use clippy for linting

### TypeScript
- file: snake_case
- add `.ts` extensions to import. eg. `import {} from "./x.ts"` for deno compatibility.
- Never use class. Use Function

## Directory Patterns

```
crates/          # Rust implementation (main)
  cli/           # CLI application
  core/          # Core logic
src/             # TypeScript prototype
examples/        # Example files
```
