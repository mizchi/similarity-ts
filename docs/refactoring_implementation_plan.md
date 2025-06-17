# リファクタリング実装計画

## 分析結果サマリー

- **総重複コード行数**: 205行
- **リファクタリング後の予想行数**: 50-60行
- **コード削減率**: 約71%

### 共通パターン（全実装で共通）
- ✓ null check
- ✓ for-in traversal  
- ✓ skip parent/scope
- ✓ array handling
- ✓ forEach traversal

### 各ファイルの特徴

1. **function_extractor.ts** (122行)
   - パラメータ: `node: any, className?: string`
   - 特徴: 関数定義の抽出に特化
   - 扱うノード: FunctionDeclaration, MethodDefinition, VariableDeclarator, ClassDeclaration, ArrowFunctionExpression

2. **function_body_comparer.ts** (34行)
   - パラメータ: `node: any, inClass: boolean = false`
   - 特徴: シンプルな関数名抽出
   - 扱うノード: function_extractor.tsと同じ

3. **semantic_normalizer.ts** (49行)
   - パラメータ: `node: any`
   - 特徴: セマンティックパターンの抽出
   - 扱うノード: MemberExpression, CallExpression

## 実装手順

### Step 1: 共通AST走査モジュールの作成

```typescript
// src/core/ast_traversal.ts

export interface NodeHandler<T> {
  (node: any, state: T, parent?: any): void;
}

export interface NodeHandlers<T> {
  // ライフサイクルフック
  enter?: NodeHandler<T>;
  leave?: NodeHandler<T>;
  
  // ノードタイプ別ハンドラー
  FunctionDeclaration?: NodeHandler<T>;
  FunctionExpression?: NodeHandler<T>;
  ArrowFunctionExpression?: NodeHandler<T>;
  MethodDefinition?: NodeHandler<T>;
  ClassDeclaration?: NodeHandler<T>;
  ClassExpression?: NodeHandler<T>;
  VariableDeclaration?: NodeHandler<T>;
  VariableDeclarator?: NodeHandler<T>;
  MemberExpression?: NodeHandler<T>;
  CallExpression?: NodeHandler<T>;
  ThisExpression?: NodeHandler<T>;
  Identifier?: NodeHandler<T>;
  
  // 汎用ハンドラー（任意のノードタイプ）
  [nodeType: string]: NodeHandler<T> | undefined;
}

export function traverseAST<T>(
  node: any,
  handlers: NodeHandlers<T>,
  state: T,
  parent?: any
): void {
  if (!node || typeof node !== 'object') return;
  
  // Enter callback
  handlers.enter?.(node, state, parent);
  
  // Node type specific handler
  const handler = handlers[node.type as string];
  if (handler) {
    handler(node, state, parent);
  }
  
  // Traverse children
  for (const key in node) {
    if (key === 'parent' || key === 'scope') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(v => traverseAST(v, handlers, state, node));
    } else if (value && typeof value === 'object') {
      traverseAST(value, handlers, state, node);
    }
  }
  
  // Leave callback
  handlers.leave?.(node, state, parent);
}

// ヘルパー関数
export function createVisitor<T>(handlers: NodeHandlers<T>): NodeHandlers<T> {
  return handlers;
}
```

### Step 2: function_extractor.tsのリファクタリング

```typescript
// src/core/function_extractor.ts (リファクタリング後)

import { traverseAST, createVisitor } from './ast_traversal.ts';

interface ExtractorState {
  functions: FunctionDefinition[];
  className?: string;
  code: string;
  lines: string[];
}

export function extractFunctions(code: string): FunctionDefinition[] {
  const ast = parseTypeScript('temp.ts', code);
  const state: ExtractorState = {
    functions: [],
    className: undefined,
    code,
    lines: code.split('\n')
  };
  
  const visitor = createVisitor<ExtractorState>({
    ClassDeclaration(node, state) {
      const prevClassName = state.className;
      state.className = node.id?.name;
      
      // Note: クラス本体は自動的に走査される
      // leave callbackでclassNameを復元する必要がある
    },
    
    leave(node, state) {
      if (node.type === 'ClassDeclaration') {
        // ClassDeclarationから出る時にclassNameを復元
        // TODO: より良い方法を検討
      }
    },
    
    FunctionDeclaration(node, state) {
      if (node.id) {
        state.functions.push({
          name: node.id.name,
          type: 'function',
          parameters: extractParameters(node.params),
          body: node.body ? extractBodyCode(node.body, state.code) : '',
          ast: node,
          startLine: getLineNumber(node.start ?? 0, state.lines),
          endLine: getLineNumber(node.end ?? 0, state.lines)
        });
      }
    },
    
    MethodDefinition(node, state) {
      if (node.key) {
        const methodName = node.key.name || 'unknown';
        const isConstructor = node.kind === 'constructor';
        
        state.functions.push({
          name: isConstructor ? 'constructor' : methodName,
          type: isConstructor ? 'constructor' : 'method',
          parameters: extractParameters(node.value?.params),
          body: node.value?.body ? extractBodyCode(node.value.body, state.code) : '',
          ast: node.value,
          startLine: getLineNumber(node.start ?? 0, state.lines),
          endLine: getLineNumber(node.end ?? 0, state.lines),
          className: state.className
        });
      }
    },
    
    VariableDeclarator(node, state) {
      // Arrow functions and function expressions
      if (node.init?.type === 'ArrowFunctionExpression' || 
          node.init?.type === 'FunctionExpression') {
        // ... implementation
      }
    }
  });
  
  traverseAST(ast.program, visitor, state);
  return state.functions;
}
```

### Step 3: function_body_comparer.tsのリファクタリング

```typescript
// src/core/function_body_comparer.ts (リファクタリング後)

import { traverseAST, createVisitor } from './ast_traversal.ts';

interface FunctionNameState {
  functions: Array<{ name: string; isMethod: boolean }>;
  inClass: boolean;
}

function extractAllFunctionNames(code: string): Array<{ name: string; isMethod: boolean }> {
  const ast = parseTypeScript('temp.ts', code);
  const state: FunctionNameState = {
    functions: [],
    inClass: false
  };
  
  const visitor = createVisitor<FunctionNameState>({
    ClassDeclaration(node, state) {
      state.inClass = true;
    },
    
    leave(node, state) {
      if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
        state.inClass = false;
      }
    },
    
    FunctionDeclaration(node, state) {
      if (node.id?.name) {
        state.functions.push({ 
          name: node.id.name, 
          isMethod: false 
        });
      }
    },
    
    MethodDefinition(node, state) {
      if (node.key?.name) {
        state.functions.push({ 
          name: node.key.name, 
          isMethod: true 
        });
      }
    },
    
    VariableDeclarator(node, state) {
      if (node.id?.name && 
          (node.init?.type === 'FunctionExpression' || 
           node.init?.type === 'ArrowFunctionExpression')) {
        state.functions.push({ 
          name: node.id.name, 
          isMethod: false 
        });
      }
    }
  });
  
  traverseAST(ast.program, visitor, state);
  return state.functions;
}
```

### Step 4: semantic_normalizer.tsのリファクタリング

```typescript
// src/core/semantic_normalizer.ts (リファクタリング後)

import { traverseAST, createVisitor } from './ast_traversal.ts';

interface PatternState {
  patterns: SemanticPattern[];
  paramSet: Set<string>;
}

function extractSemanticPatterns(
  program: any,
  parameters: string[]
): SemanticPattern[] {
  const state: PatternState = {
    patterns: [],
    paramSet: new Set(parameters)
  };
  
  const visitor = createVisitor<PatternState>({
    MemberExpression(node, state) {
      if (node.object?.type === 'ThisExpression') {
        state.patterns.push({
          type: 'property_access',
          target: 'this',
          identifier: node.property?.name || 'unknown'
        });
      } else if (node.object?.type === 'Identifier') {
        const objName = node.object.name;
        const target = state.paramSet.has(objName) ? 'parameter' : 'external';
        state.patterns.push({
          type: 'property_access',
          target,
          identifier: objName
        });
      }
    },
    
    CallExpression(node, state) {
      if (node.callee?.type === 'MemberExpression') {
        const memberExpr = node.callee;
        if (memberExpr.object?.type === 'ThisExpression') {
          state.patterns.push({
            type: 'method_call',
            target: 'this',
            identifier: memberExpr.property?.name || 'unknown'
          });
        }
      }
    }
  });
  
  traverseAST(program, visitor, state);
  return state.patterns;
}
```

## テスト計画

1. **単体テスト**
   - ast_traversal.tsの基本機能テスト
   - 各ハンドラーの呼び出し確認

2. **統合テスト**
   - リファクタリング前後で同じ結果が得られることを確認
   - パフォーマンステスト

3. **回帰テスト**
   - 既存のテストスイートがすべてパス

## リスク管理

1. **ClassDeclarationのコンテキスト管理**
   - 課題: クラス名のコンテキストを子ノードに渡す
   - 解決案: スタックベースのコンテキスト管理を実装

2. **パフォーマンス**
   - 課題: 関数呼び出しのオーバーヘッド
   - 解決案: ベンチマークテストで確認

## 次のアクション

1. ast_traversal.tsの実装
2. 各ファイルの段階的リファクタリング
3. テストの実行と確認
4. ドキュメントの更新