# リファクタリング計画: AST走査の重複解消

## 現状分析

関数重複検出ツールを使って自身のコードベースを分析した結果、以下の重複が発見されました：

### 1. visitNode関数の重複（優先度：高）

3つのファイルで同じようなAST走査パターンが実装されています：

- `src/core/function_extractor.ts` - 4450文字のvisitNode関数
- `src/core/function_body_comparer.ts` - 1131文字のvisitNode関数  
- `src/core/semantic_normalizer.ts` - 1474文字のvisitNode関数

類似度：
- function_extractor.ts vs function_body_comparer.ts: 74.8%
- function_extractor.ts vs semantic_normalizer.ts: 68.5%
- function_body_comparer.ts vs semantic_normalizer.ts: 55.8%

### 2. その他の重複

- `extractFunctions` - 2ファイルに存在
- `calculateSimilarity` - 2ファイルに存在
- `calculateAPTEDSimilarity` - 2ファイルに存在

## リファクタリング計画

### Phase 1: 共通AST走査モジュールの作成

#### 1.1 `src/core/ast_traversal.ts`の作成

```typescript
export interface TraversalState {
  [key: string]: any;
}

export interface NodeVisitor<T extends TraversalState = TraversalState> {
  enter?: (node: any, state: T) => void;
  leave?: (node: any, state: T) => void;
  
  // Specific node handlers
  FunctionDeclaration?: (node: any, state: T) => void;
  FunctionExpression?: (node: any, state: T) => void;
  ArrowFunctionExpression?: (node: any, state: T) => void;
  MethodDefinition?: (node: any, state: T) => void;
  ClassDeclaration?: (node: any, state: T) => void;
  VariableDeclarator?: (node: any, state: T) => void;
  MemberExpression?: (node: any, state: T) => void;
  ThisExpression?: (node: any, state: T) => void;
  // 必要に応じて追加
}

export function traverseAST<T extends TraversalState>(
  node: any,
  visitor: NodeVisitor<T>,
  state: T
): void
```

#### 利点
- DRY原則の遵守
- 一貫性のあるAST走査
- 型安全性の向上
- 保守性の向上

### Phase 2: 各ファイルのリファクタリング

#### 2.1 `function_extractor.ts`のリファクタリング

現在のvisitNodeを削除し、traverseASTを使用：

```typescript
interface ExtractorState extends TraversalState {
  functions: FunctionDefinition[];
  className?: string;
  code: string;
  lines: string[];
}

export function extractFunctions(code: string): FunctionDefinition[] {
  const state: ExtractorState = {
    functions: [],
    className: undefined,
    code,
    lines: code.split('\n')
  };
  
  traverseAST(ast.program, {
    FunctionDeclaration(node, state) {
      // 関数抽出ロジック
    },
    ClassDeclaration(node, state) {
      state.className = node.id?.name;
    },
    // 他のハンドラー
  }, state);
  
  return state.functions;
}
```

#### 2.2 `function_body_comparer.ts`のリファクタリング

同様にtraverseASTを使用するように変更。

#### 2.3 `semantic_normalizer.ts`のリファクタリング

同様にtraverseASTを使用するように変更。

### Phase 3: テストとバリデーション

1. 既存のテストがすべてパスすることを確認
2. リファクタリング前後で同じ結果が得られることを確認
3. パフォーマンスの比較

### Phase 4: その他の重複の解決

1. `extractFunctions`の重複
   - cli.tsの実装を確認し、必要に応じて統合

2. `calculateSimilarity`の重複
   - ast.tsとindex.tsの実装を比較
   - 適切な場所に統一

## 実装スケジュール

1. **Day 1**: ast_traversal.tsの実装とテスト
2. **Day 2**: function_extractor.tsのリファクタリング
3. **Day 3**: function_body_comparer.tsとsemantic_normalizer.tsのリファクタリング
4. **Day 4**: 統合テストと微調整
5. **Day 5**: ドキュメント更新とコードレビュー

## 期待される成果

- コード行数の削減: 約200-300行
- 保守性の向上: visitNodeロジックが1箇所に集約
- 拡張性の向上: 新しいノードタイプの追加が容易に
- バグリスクの低減: 走査ロジックのバグが全体に影響しない

## リスクと対策

### リスク
1. 既存機能への影響
2. パフォーマンスの低下
3. 型安全性の低下

### 対策
1. 包括的なテストスイートの実行
2. ベンチマークテストの実施
3. TypeScriptの型を活用した安全な実装

## 次のステップ

1. このリファクタリング計画のレビュー
2. ast_traversal.tsの実装開始
3. 段階的なリファクタリングの実施