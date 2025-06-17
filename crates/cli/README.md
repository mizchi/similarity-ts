# ts-similarity CLI (Rust版)

TypeScriptコードの類似度を計算するコマンドラインツールです。

## インストール

```bash
# リポジトリのルートディレクトリで
cargo build --release

# バイナリは以下に生成されます
./target/release/ts-similarity
```

## 使い方

### 基本的な使い方（2つのファイルを比較）

```bash
# デフォルトのパラメータで比較
./target/release/ts-similarity file1.ts file2.ts

# または compareサブコマンドを使用
./target/release/ts-similarity compare file1.ts file2.ts
```

### 詳細なパラメータ指定

```bash
./target/release/ts-similarity compare file1.ts file2.ts \
  --rename-cost 0.3 \
  --delete-cost 1.0 \
  --insert-cost 1.0
```

### 単一ファイル内の類似関数検出

```bash
# デフォルトの閾値（70%）で検出
./target/release/ts-similarity functions src/utils.ts

# 閾値を指定（80%以上の類似度）
./target/release/ts-similarity functions src/utils.ts -t 0.8

# rename costも調整
./target/release/ts-similarity functions src/utils.ts -t 0.8 --rename-cost 0.2
```

### 複数ファイル間の類似関数検出

```bash
# 複数ファイル間で類似関数を検出
./target/release/ts-similarity cross-file src/file1.ts src/file2.ts src/file3.ts

# 閾値を指定
./target/release/ts-similarity cross-file src/*.ts -t 0.85
```

## サブコマンド

### `compare` - ファイル全体の比較

2つのTypeScriptファイル全体の類似度を計算します。

**オプション:**
- `--rename-cost` (デフォルト: 0.3) - ノードの名前変更コスト
- `--delete-cost` (デフォルト: 1.0) - ノードの削除コスト
- `--insert-cost` (デフォルト: 1.0) - ノードの挿入コスト

**出力例:**
```
TSED Similarity: 85.50%
Distance: 0.1450
```

### `functions` - 単一ファイル内の類似関数検出

1つのファイル内で類似した関数を検出します。

**オプション:**
- `-t, --threshold` (デフォルト: 0.7) - 類似度の閾値（0.0〜1.0）
- `--rename-cost` (デフォルト: 0.3) - ノードの名前変更コスト

**出力例:**
```
Similar functions in src/utils.ts:
============================================================

function calculateTotal (lines 3-9) <-> function computeSum (lines 11-17)
Similarity: 88.00%

arrow getTotalPrice (lines 25-27) <-> function calculateOrderTotal (lines 29-35)
Similarity: 90.00%
```

### `cross-file` - 複数ファイル間の類似関数検出

複数のファイル間で類似した関数を検出します。

**オプション:**
- `-t, --threshold` (デフォルト: 0.7) - 類似度の閾値（0.0〜1.0）
- `--rename-cost` (デフォルト: 0.3) - ノードの名前変更コスト

**出力例:**
```
Similar functions across files:
============================================================

file1.ts:processUser (lines 5-10) <-> file2.ts:handleUser (lines 3-8)
Similarity: 92.00%

file1.ts:validateInput (lines 15-20) <-> file3.ts:checkInput (lines 7-12)
Similarity: 85.00%
```

## アルゴリズム

このツールは以下のアルゴリズムを使用しています：

- **APTED (All Path Tree Edit Distance)**: 構造的な類似度を計算
- **TSED (Tree Similarity of Edit Distance)**: 0〜1の範囲に正規化された類似度スコア

## パフォーマンス

Rust実装はTypeScript実装と比較して：
- 中規模ファイル: 約16倍高速
- 大規模ファイル: メモリ効率が良く、TypeScript版でメモリ不足になるケースでも処理可能

## 注意事項

- TypeScriptとJavaScriptファイルの両方をサポート
- oxc-parserを使用して高速にパース
- 関数の構造的な類似性を重視した比較

## 例

### コードの重複検出

```bash
# プロジェクト内の重複コードを検出
./target/release/ts-similarity functions src/main.ts -t 0.9
```

### リファクタリング前後の比較

```bash
# リファクタリング前後でコードの類似度を確認
./target/release/ts-similarity compare old_version.ts new_version.ts
```

### 複数ファイルでの重複関数チェック

```bash
# utilsディレクトリ内の全ファイルで重複関数をチェック
./target/release/ts-similarity cross-file src/utils/*.ts -t 0.85
```