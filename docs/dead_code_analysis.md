# デッドコード分析レポート

## 実行コマンド
```bash
npx -y tsr 'src/index\.ts$' 'src/cli/cli\.ts$' 'test/.*\.ts$' 'src/.*_test\.ts$'
```

## 分析結果

### 1. 未使用のエクスポート (67個)

#### oxc_types.ts (58個)
多数のAST型定義がエクスポートされているが未使用:
- `Declaration`, `IdentifierName`, `BindingIdentifier`
- `ArrayExpression`, `ObjectExpression`, `ArrowFunctionExpression`
- `BinaryExpression`, `UnaryExpression`, `UpdateExpression`
- など多数

**推奨対応**: 
- 実際に使用される型のみをエクスポート
- または、型定義専用ファイルとして保持（将来の拡張のため）

#### 内部ユーティリティ関数
- `src/core/apted.ts`: 内部実装の詳細（`getNodeLabel`, `getNodeChildren`など）
- `src/core/hash.ts`: 内部ハッシュ関数（`generateHashFunctions`, `hashBand`など）
- `src/core/ast_traversal.ts`: ヘルパー関数（`collectNodes`, `findNode`）

**推奨対応**: 
- 内部実装として`export`を削除
- または明示的に`@internal`とマーク

### 2. 未使用のファイル (4個)

1. **src/benchmark.ts**
   - ベンチマーク用のコード
   - **推奨**: `examples/`に移動

2. **src/core/ast_traversal_with_context.ts**
   - 高度なコンテキスト管理用（将来の拡張用）
   - **推奨**: 現時点では削除または`_experimental`フォルダへ

3. **src/core/function_body_comparer.ts**
   - function_extractorに統合された古いコード
   - **推奨**: 削除

4. **src/core/index.ts**
   - 未使用のインデックスファイル
   - **推奨**: 削除

### 3. 修正済み

- `semantic_normalizer.ts`: 未使用のインポートを削除
- 未使用の`patterns`変数をコメントアウト

## アクションアイテム

### 優先度: 高
1. [ ] `function_body_comparer.ts`を削除（重複機能）
2. [ ] `src/core/index.ts`を削除（未使用）
3. [ ] 未使用のインポートをクリーンアップ

### 優先度: 中
1. [ ] `benchmark.ts`を`examples/`に移動
2. [ ] 内部関数の`export`を削除

### 優先度: 低
1. [ ] `oxc_types.ts`の型定義を整理
2. [ ] `ast_traversal_with_context.ts`の扱いを決定

## メトリクス

- **削減可能なエクスポート**: 67個
- **削除可能なファイル**: 2-4個
- **コードベースのスリム化**: 約10-15%