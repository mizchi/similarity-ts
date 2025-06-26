## Project Goal

Calculate code similarity between functions and types across multiple programming languages.

## Project Structure

### Crates Organization Policy

- **crates/core (similarity-ts-core)**: 言語非依存のコア機能
  - AST比較アルゴリズム (APTED, TSED)
  - 共通パーサーインターフェース (`LanguageParser` trait)
  - CLI共通ユーティリティ (`cli_parallel`, `cli_output`, `cli_file_utils`)
  
- **crates/similarity-ts**: TypeScript/JavaScript専用CLI
  - oxc_parser を使用した高速パース
  - 型システムの類似性検出 (type_comparator, type_extractor)
  - JSX/TSX サポート
  
- **crates/similarity-py**: Python専用CLI
  - tree-sitter-python を使用
  - Python固有の構文サポート
  - クラス・メソッドの検出
  
- **__deprecated/**: TypeScriptプロトタイプ実装（参考用のみ）

### Multi-Language Support Policy

1. **言語ごとに独立したCLIパッケージを提供**
   - `similarity-ts`: TypeScript/JavaScript専用
   - `similarity-py`: Python専用
   - 将来: `similarity-rs` (Rust), `similarity-go` (Go) など

2. **言語固有機能は各パッケージに実装**
   - TypeScript: 型システム、インターフェース、ジェネリクス、JSX
   - Python: デコレータ、内包表記、インデント構造
   - 各言語の特性に最適化した検出パターン

3. **共通機能はcoreに集約**
   - AST比較アルゴリズム
   - 並列処理フレームワーク
   - ファイル操作ユーティリティ
   - 将来のクロス言語比較の基盤

## Development Stack

### Rust (Main)
- cargo (workspace構成)
- clap (CLI framework)
- oxc_parser (TypeScript/JavaScript parser - 高速)
- tree-sitter (Python, その他の言語 - 汎用的だが約10倍遅い)
- rayon (並列処理)

## Coding Rules

### Rust
- Follow standard Rust conventions
- Use clippy for linting
- Run tests with `cargo test`
- push する前には .github/workflows/rust.yaml 相当の確認のテストを実行して確認

## Directory Patterns

```
crates/              # Rust implementation (main)
  core/              # Language-agnostic core logic
  similarity-ts/     # TypeScript/JavaScript CLI
  similarity-py/     # Python CLI
examples/            # Example files
  mixed_language_project/  # Multi-language examples
__deprecated/        # Deprecated TypeScript prototype
```

## Features

### Common Features (All Languages)
- Function similarity detection using AST-based comparison
- Configurable similarity thresholds
- Cross-file analysis support
- VSCode-compatible output format
- Parallel processing for performance

### TypeScript/JavaScript Specific
- Type similarity detection (interfaces, type aliases, type literals)
- JSX/TSX support
- ES6+ syntax support (arrow functions, classes, etc.)
- Fast parsing with oxc_parser

### Python Specific
- Class and method detection
- Decorator support
- Python 3.x syntax support
- Indentation-based structure analysis

## Future Language Expansion

新しい言語を追加する場合:

1. `crates/similarity-{lang}` ディレクトリを作成
2. `LanguageParser` trait を実装
3. 言語固有の機能を実装
4. 統合テストを追加

```