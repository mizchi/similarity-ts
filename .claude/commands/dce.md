# デッドコード検出 (Dead Code Elimination)

## 概要

このドキュメントでは、TypeScriptプロジェクトでデッドコードを検出する方法を説明します。

## ツール: ts-remove-unused (tsr)

### インストールと実行

```bash
# npxで直接実行（推奨）
npx -y tsr [options] [...entrypoints]

# または、旧パッケージ名での実行（非推奨）
npx -y @line/ts-remove-unused  # -> tsrを使うよう警告が出る
```

### 基本的な使い方

1. **ヘルプの確認**
```bash
npx -y tsr --help
```

2. **単一エントリーポイントでの検査**
```bash
npx -y tsr 'src/index\.ts$'
```

3. **複数エントリーポイントでの検査**
```bash
npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$'
```

4. **テストファイルを含めた検査**
```bash
npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$' 'test/.*\.ts$' 'src/.*_test\.ts$'
```

### オプション

- `-w, --write`: 変更を直接ファイルに書き込む
- `-r, --recursive`: プロジェクトがクリーンになるまで再帰的に検査
- `-p, --project <file>`: カスタムtsconfig.jsonのパス
- `--include-d-ts`: .d.tsファイルも検査対象に含める

## 実際の分析例

### 1. 初回実行
```bash
$ npx -y tsr 'src/index\.ts$'
```

結果：
- 67個の未使用エクスポート
- 15個の未使用ファイル

### 2. CLIを含めた実行
```bash
$ npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$'
```

結果：
- 未使用ファイルが14個に減少（CLIで使用されているものを除外）

### 3. テストファイルを含めた実行
```bash
$ npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$' 'test/.*\.ts$' 'src/.*_test\.ts$'
```

結果：
- 未使用ファイルが4個に減少（テストで使用されているものを除外）

## 分析結果の解釈

### 未使用エクスポートの種類

1. **型定義** (`oxc_types.ts`)
   - 多数のAST型がエクスポートされているが未使用
   - 対応: 実際に使用される型のみをエクスポート

2. **内部ユーティリティ関数**
   - 例: `getNodeLabel`, `getNodeChildren` (apted.ts)
   - 対応: 内部実装なので`export`を削除

3. **ヘルパー関数**
   - 例: `collectNodes`, `findNode` (ast_traversal.ts)
   - 対応: 公開APIとして必要か検討

### 未使用ファイルの種類

1. **テスト専用ファイル**
   - `*_test.ts`ファイル
   - 対応: テストエントリーポイントとして含める

2. **重複機能**
   - 例: `function_body_comparer.ts`（他に統合済み）
   - 対応: 削除

3. **実験的コード**
   - 例: `ast_traversal_with_context.ts`
   - 対応: 削除または`experimental/`へ移動

## 推奨ワークフロー

1. **まず分析のみ実行**
```bash
npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$'
```

2. **結果を確認して対応方針を決定**
- 削除可能なもの
- 内部実装としてexportを削除するもの
- 将来のために残すもの

3. **段階的にクリーンアップ**
- まず明らかに不要なものを削除
- 次に内部実装の`export`を削除
- 最後に型定義を整理

4. **自動修正（慎重に）**
```bash
# バックアップを取ってから実行
git stash
npx -y tsr --write 'src/index\.ts$' 'src/cli/cli\.ts$'
git diff  # 変更内容を確認
```

## 注意事項

1. **動的インポート**: tsrは静的解析のため、動的インポートは検出できない
2. **型のみのエクスポート**: `export type`も未使用として検出される
3. **再エクスポート**: バレルファイル（index.ts）の扱いに注意

## このプロジェクトでの実例

1. **診断で発見した未使用コード**
   - `semantic_normalizer.ts`の未使用インポート
   - `extractSemanticPatterns`関数（将来使用の可能性ありとしてコメントアウト）

2. **対応**
   - 未使用インポートを削除
   - 将来使用する可能性のあるコードはコメントアウトして保持

3. **結果**
   - コードベースがよりクリーンに
   - ビルドサイズの削減が期待できる