# ts-similarity: TypeScript/JavaScriptの重複コードを見つけるツール

TypeScript/JavaScriptプロジェクトで似たような関数を書いてしまうこと、ありますよね。`ts-similarity`は、そんな重複コードを自動で見つけてくれるCLIツールです。

## なぜ作ったか

大きなプロジェクトでは、似たような処理があちこちに散らばりがち。コードレビューで「これ、別のところにも似たようなのなかった？」みたいな指摘、よくありますよね。

このツールは、ASTベースの構造比較で「意味的に似ている」コードを検出します。変数名が違っても、処理の流れが似ていれば検出できるのがポイントです。

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

## リンク

- [GitHub](https://github.com/mizchi/ts-similarity)
- [Issues](https://github.com/mizchi/ts-similarity/issues)