## Project Goal

Calculate code similarity between TypeScript/JavaScript functions and types.

## Project Structure

- **Rust implementation (crates/)**: メインの実装。すべての開発はこちらで行う
- **TypeScript implementation (__deprecated/)**: プロトタイプ実装。参考用のみ（非推奨）

## Development Stack

### Rust (Main)
- cargo
- clap (CLI framework)
- oxc_parser (TypeScript/JavaScript parser)

## Coding Rules

### Rust
- Follow standard Rust conventions
- Use clippy for linting
- Run tests with `cargo test`
- push する前には .github/workflows/rust.yaml 相当の確認のテストを実行して確認

## Directory Patterns

```
crates/          # Rust implementation (main)
  cli/           # CLI application
  core/          # Core logic
examples/        # Example files
__deprecated/    # Deprecated TypeScript prototype
```

## Features

- Function similarity detection using AST-based comparison
- Type similarity detection (interfaces, type aliases, type literals)
- Configurable similarity thresholds
- Cross-file analysis support
- VSCode-compatible output format

```