# similarity-ts: TypeScript/JavaScript の重複コードを見つけるツール

AI に TypeScript を書かせていると、 `_enhanced` だとか `_fixed` だとか、似たようなファイルが増え続けます。

それらを検知するツールを作りました。

https://github.com/mizchi/similarity-ts

similarity-ts は AST ベースの構造比較で意味的に似ている関数同士を検出します。現時点では、まず関数(+アロー関数)の比較をターゲットにしています。

Rust で書きました。 `cargo install` でインストールできます：

```bash
# crates.ioからインストール
cargo install similarity-ts
```

## 使ってみる

プロジェクトのルートで実行するだけです。

```bash
$ similarity-ts
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
$ similarity-ts . --print

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

っぽいのが検出されましたね。

変数名は違うけど、やってることはほぼ同じです。
細かいオプションは `--help` を見てください。

実際のユースケースでは、この出力を AI に食わせます。

## 内部実装の解説

(ここから先はほとんど AI に書かせています。人間の仕事は終わり。)

最初は arXiv で[TSED（Type Structure Edit Distance）の論文](https://arxiv.org/abs/2103.16765)を見つけました。

この論文では、APTED（木構造の編集距離アルゴリズム）を使ってコードの類似度を計算し、さらに実際のコードの分量でペナルティを付けてスコアを出すという手法が紹介されていました。

これを最初は TypeScript で実装してみたんですが、大きなプロジェクトで実行するとすべての関数ペアを比較するため計算量が膨大になり、V8 のヒープエラーでクラッシュすることが多発しました。

そこで、Rust 版の oxc_parser クレートを直接使って、Rust で再実装することにしました。TypeScript 版と同じ結果が出るように差分テストをして、多少の誤差は許容しつつほぼ同じ結果になるように実装しました。

Rust 版でクラッシュはしなくなりましたが、結局アルゴリズムの問題で計算が重いことは変わりません。n 個の関数があると n(n-1)/2 回の比較が必要で、大規模プロジェクトでは非現実的です。

そこで、さらなる最適化を実施しました：

### 1. ブルームフィルタによる事前フィルタリング

まず、各関数に含まれる AST ノードの出現数でブルームフィルタを作成します。これにより、明らかに異なる関数のペアを高速に除外できます。

```rust
// 各関数のAST指紋を作成
let fingerprint = create_ast_fingerprint(&function_ast);

// SIMDを使った高速比較
if !fingerprints_similar_simd(&fp1, &fp2) {
    continue; // 明らかに異なるのでスキップ
}
```

このチェックは誤検出を避けるため意図的に甘めに設定し、疑わしいペアだけを次の段階に進めます。

### 2. TSED アルゴリズムの適用

ブルームフィルタを通過したペアに対してのみ、本来やりたかった TSED の編集距離を計算します：

### 3. マルチスレッド処理

さらに、似たような oxc_parser を使っている oxc linter の実装を参考に、並列処理を導入しました。LintService のアーキテクチャを参考に、ファイルの読み込みと解析を並列化します。

### Claude Code との開発

...という実装はほぼすべて Claude Code を通して行いました。自分がやったのは：

- 検出したいコードパターンの例示
- TSED の論文の提示
- アルゴリズムの方向性の指示

だけです。あとは Claude Code が実装してくれました。

途中で`cargo bench`を導入してパフォーマンスを計測しながら最適化を進めました。詳細な記録は残っていませんが、おおよその改善は：

- **ブルームフィルタ導入**: 約 5 倍高速化
- **マルチスレッド化**: 約 4 倍高速化
- **合計**: 他の諸々含めてだいたい 50 倍の高速化を実現

試しに 60000 行ほどのプロジェクトで動かしてみましたが、1 秒以内にレスポンスが返ってきます。やりましたね。

Claude Code とのペアプログラミングは、特に Rust のような型安全な言語では非常に効率的でした。コンパイラエラーが明確なので、Claude Code が正確に問題を修正でき、人間は高レベルな設計に集中できます。

この開発体験から、AI アシスタントを使った開発の新しい形が見えてきました。人間が「何を作りたいか」を明確に伝え、AI が「どう実装するか」を担当する。これからのソフトウェア開発の一つの形かもしれません。

## 達成できたこと

現在のバージョンで実現できていること：

- **高速な関数重複検出**: 大規模プロジェクトでも実用的な速度
- **構造ベースの比較**: 変数名の違いを超えた本質的な類似度検出
- **実用的なパフォーマンス**: ブルームフィルタとマルチスレッドで約 20 倍の高速化

## 今後やりたいこと

現在は主に関数同士の比較に焦点を当てていますが、今後は以下の機能を追加したいと考えています：

### 1. 型定義リテラルの重複検知の高速化

型定義リテラルの比較機能（`--types`オプション）は実装済みですが、まだ低速なため、デフォルトでは無効化しています。これを実用的な速度まで最適化したいです。

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

## まとめ

`similarity-ts`を使えば、プロジェクト内の重複コードを簡単に見つけられます。定期的に実行して、コードの品質向上に役立ててください。

機能要望があれば以下まで。

https://github.com/mizchi/similarity-ts/issues
