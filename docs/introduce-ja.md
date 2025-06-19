# ts-similarity: TypeScript/JavaScriptの重複コードを見つけるツール

TypeScript/JavaScriptプロジェクトで似たような関数を書いてしまうこと、ありますよね。`ts-similarity`は、そんな重複コードを自動で見つけてくれるCLIツールです。

## なぜ作ったか

大きなプロジェクトでは、似たような処理があちこちに散らばりがち。コードレビューで「これ、別のところにも似たようなのなかった？」みたいな指摘、よくありますよね。

最近では、AIアシスタントを使った開発も増えてきました。でも、AIには困った癖があります。「このコードを改善して」と頼むと、元のファイルをまるごとコピーして `getUserById_enhanced.ts` や `processData_fixed.ts` みたいなファイルを作りがち。気づいたらプロジェクトが似たようなファイルだらけに...

このツールは、ASTベースの構造比較で「意味的に似ている」コードを検出します。変数名が違っても、処理の流れが似ていれば検出できるのがポイントです。AIが作った `_enhanced` 系のファイルも、元のコードとの類似度が高ければすぐに見つかります。


## インストール

Rustの環境があれば、cargoで簡単にインストールできます：

```bash
# GitHubから直接インストール
cargo install --git https://github.com/mizchi/ts-similarity

# または、リポジトリをクローンしてから
git clone https://github.com/mizchi/ts-similarity
cd ts-similarity
cargo install --path crates/cli
```

## 使ってみる

プロジェクトのルートで実行するだけ：

```bash
ts-similarity .
```

実際の出力例を見てみましょう：

```
Analyzing code similarity...

=== Function Similarity ===
Checking 142 files for duplicates...

Found 8 duplicate pairs:
------------------------------------------------------------

Similarity: 89.09%, Score: 8.0 points (lines 9~9, avg: 9.0)
  src/utils/getUserById.ts:4-12 getUserById
  src/utils/findUserById.ts:8-16 findUserById

Similarity: 88.00%, Score: 14.1 points (lines 15~17, avg: 16.0)
  src/services/productService.ts:23-39 updateProductStock
  src/services/inventoryService.ts:45-60 updateInventoryCount

Similarity: 87.50%, Score: 10.5 points (lines 12~12, avg: 12.0)
  src/components/UserList.tsx:15-26 renderUserItem
  src/components/AdminList.tsx:20-31 renderAdminItem
```

見つかった重複コードの詳細を見たい場合は`--print`オプションを使います：

```bash
ts-similarity . --print
```

すると、実際のコードも表示されます：

```
Similarity: 89.09%, Score: 8.0 points (lines 9~9, avg: 9.0)
  src/utils/getUserById.ts:4-12 getUserById
  src/utils/findUserById.ts:8-16 findUserById

--- src/utils/getUserById.ts:getUserById (lines 4-12) ---
function getUserById(id: string): User | null {
    const users = loadUsers();
    for (const user of users) {
        if (user.id === id) {
            return user;
        }
    }
    return null;
}

--- src/utils/findUserById.ts:findUserById (lines 8-16) ---
function findUserById(userId: string): User | undefined {
    const allUsers = loadUsers();
    for (const u of allUsers) {
        if (u.id === userId) {
            return u;
        }
    }
    return undefined;
}
```

確かに似てますね！変数名は違うけど、やってることはほぼ同じです。

## オプション

よく使うオプション：

- `-t, --threshold <値>`: 類似度の閾値（デフォルト: 0.87）
- `--min-lines <行数>`: 最小行数（デフォルト: 5）
- `--no-size-penalty`: 短い関数のペナルティを無効化
- `-p, --print`: 重複コードの内容を表示

例えば、もっと厳密に90%以上の類似度だけを検出したい場合：

```bash
ts-similarity . -t 0.9
```

短い関数も含めて検査したい場合：

```bash
ts-similarity . --min-lines 3 --no-size-penalty
```

## 特徴

- **高速**: Rustで実装され、並列処理対応
- **賢い比較**: ASTベースで構造を比較するので、変数名の違いを無視
- **親子関係の除外**: ネストした関数との不要な比較を回避
- **アロー関数対応**: 通常の関数とアロー関数の比較も可能

## まとめ

`ts-similarity`を使えば、プロジェクト内の重複コードを簡単に見つけられます。定期的に実行して、コードの品質向上に役立ててください。

似たようなコードを見つけたら、共通化するチャンス。DRY（Don't Repeat Yourself）の原則を守って、メンテナブルなコードベースを保ちましょう！

## 開発の経緯

arXivで[TSED（Type Structure Edit Distance）の論文](https://arxiv.org/abs/2103.16765)を見つけたのがきっかけでした。この論文では、APTED（木構造の編集距離アルゴリズム）を使ってコードの類似度を計算し、さらに実際のコードの分量でペナルティを付けてスコアを出すという手法が紹介されていました。

「これは面白い！」と思って、最初はTypeScriptで実装してみました。oxc-parserを使ってASTを生成し、APTEDアルゴリズムを実装して...

```typescript
// 最初のTypeScript実装
import { parse } from 'oxc-parser-wasm';

function calculateSimilarity(code1: string, code2: string) {
  const ast1 = parse(code1);
  const ast2 = parse(code2);
  // ... 全関数ペアの比較
}
```

しかし、問題が発生しました。大きなプロジェクトで実行すると、すべての関数ペアを比較するため計算量が膨大になり、V8のヒープエラーでクラッシュすることが多発したんです。

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

そこで、Rust版のoxc_parserクレートを直接使って、Rustで再実装することにしました。TypeScript版と同じ結果が出るように差分テストをしながら、着実に移植を進めました。

Rust版でメモリリークはなくなりましたが、計算が重いことは変わりませんでした。n個の関数があるとn(n-1)/2回の比較が必要で、大規模プロジェクトでは非現実的です。

そこで、さらなる最適化を実施しました：

### 1. ブルームフィルタによる事前フィルタリング

まず、各関数に含まれるASTノードの出現数でブルームフィルタを作成します。これにより、明らかに異なる関数のペアを高速に除外できます。

```rust
// 各関数のAST指紋を作成
let fingerprint = create_ast_fingerprint(&function_ast);

// SIMDを使った高速比較
if !fingerprints_similar_simd(&fp1, &fp2) {
    continue; // 明らかに異なるのでスキップ
}
```

このチェックは誤検出を避けるため意図的に甘めに設定し、疑わしいペアだけを次の段階に進めます。

### 2. TSEDアルゴリズムの適用

ブルームフィルタを通過したペアに対してのみ、本来やりたかったTSEDの編集距離を計算します：

```rust
// フィルタを通過したペアのみ詳細比較
let similarity = calculate_tsed(&tree1, &tree2, &options);
```

### 3. マルチスレッド処理

さらに、oxc linter自体の実装を参考に、並列処理を導入しました。LintServiceのアーキテクチャを参考に、ファイルの読み込みと解析を並列化：

```rust
// rayonによる並列処理
files.par_iter()
    .map(|file| parse_file(file))
    .collect()
```

これらの最適化により：
- 100ファイルのプロジェクトで約10倍高速化
- ブルームフィルタで約80%の比較をスキップ
- 並列処理で50ファイル以上では2-3倍高速化

計算量の多いアルゴリズムでも、適切な最適化で実用的なツールになることを学びました。

### Claude Codeとの開発

実は、このツールの実装はほぼすべて[Claude Code](https://claude.ai/code)を通して行いました。私がやったのは：

- 検出したいコードパターンの例示
- TSEDの論文の提示
- アルゴリズムの方向性の指示

だけです。あとはClaude Codeが実装してくれました。

途中で`cargo bench`を導入してパフォーマンスを計測しながら最適化を進めました。詳細な記録は残っていませんが、おおよその改善は：

- **ブルームフィルタ導入**: 約5倍高速化
- **マルチスレッド化**: 約4倍高速化
- **合計**: 約20倍の高速化を実現

Claude Codeとのペアプログラミングは、特にRustのような型安全な言語では非常に効率的でした。コンパイラエラーが明確なので、Claude Codeが正確に問題を修正でき、人間は高レベルな設計に集中できます。

この開発体験から、AIアシスタントを使った開発の新しい形が見えてきました。人間が「何を作りたいか」を明確に伝え、AIが「どう実装するか」を担当する。これからのソフトウェア開発の一つの形かもしれません。

## 達成できたこと

現在のバージョンで実現できていること：

- **高速な関数重複検出**: 大規模プロジェクトでも実用的な速度
- **構造ベースの比較**: 変数名の違いを超えた本質的な類似度検出
- **実用的なパフォーマンス**: ブルームフィルタとマルチスレッドで約20倍の高速化

## 今後やりたいこと

現在は主に関数同士の比較に焦点を当てていますが、今後は以下の機能を追加したいと考えています：

### 1. 型定義の高速化

型定義の比較機能（`--types`オプション）は実装済みですが、まだ低速なため、デフォルトでは無効化しています。これを実用的な速度まで最適化したいです。

### 2. コード品質の測定

単なる重複検出を超えて、コード品質の指標も提供したい：

- 重複率の計算（プロジェクト全体の何％が重複か）
- 複雑度の高い重複の検出（リファクタリング優先度の提示）
- 時系列での重複率の推移追跡

### 3. より高度な検出

- クラスと関数の相互変換パターンの検出
- 部分的な重複の検出（関数の一部が似ている場合）
- セマンティックな類似度（異なる実装でも同じ目的のコード）

これらの機能により、単なる重複検出ツールから、コード品質の継続的な改善を支援するツールへと進化させたいと考えています。

## リンク

- [GitHub](https://github.com/mizchi/ts-similarity)
- [Issues](https://github.com/mizchi/ts-similarity/issues)