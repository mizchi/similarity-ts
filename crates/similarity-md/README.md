# similarity-md

Vibrato を使った形態素解析による日本語 Markdown ドキュメントの類似性検出ツール

## 概要

このツールは、Markdown ドキュメント内のセクション間の類似性を検出します。特に日本語テキストに対して、Vibrato ライブラリを使用した形態素解析による高精度な類似性検出を提供します。

## 機能

- **文字レベル類似性**: Levenshtein 距離による文字単位の比較
- **単語レベル類似性**: 単語単位での Levenshtein 距離による比較
- **形態素解析類似性**: Vibrato を使った日本語形態素解析による意味的類似性
- **タイトル類似性**: セクションタイトルの類似性
- **長さ類似性**: コンテンツ長の類似性
- **階層考慮**: Markdown の見出しレベルを考慮した比較

## インストール

### 前提条件

形態素解析機能を使用するには、MeCab 辞書が必要です：

```bash
# Ubuntu/Debian
sudo apt-get install mecab-ipadic-utf8

# macOS (Homebrew)
brew install mecab mecab-ipadic

# または手動で辞書をダウンロード
wget https://github.com/taku910/mecab/releases/download/mecab-0.996/mecab-ipadic-2.7.0-20070801.tar.gz
```

### ビルド

```bash
cd crates/similarity-md
cargo build --release
```

## 使用方法

### 基本的な使用方法

```bash
# デフォルト設定で現在のディレクトリを解析
cargo run --bin similarity-md

# 特定のファイルを解析
cargo run --bin similarity-md path/to/document.md

# 閾値を指定
cargo run --bin similarity-md --threshold 0.8
```

### 形態素解析を有効にする

```bash
# 形態素解析を有効化（デフォルト辞書を使用）
cargo run --bin similarity-md --use-morphological --morphological-weight 0.3

# カスタム辞書パスを指定
cargo run --bin similarity-md --use-morphological --morphological-dict /path/to/dict --morphological-weight 0.3
```

### 重み調整

```bash
# 各類似性指標の重みを調整
cargo run --bin similarity-md \
  --char-weight 0.2 \
  --word-weight 0.2 \
  --morphological-weight 0.4 \
  --title-weight 0.1 \
  --length-weight 0.1 \
  --use-morphological
```

### その他のオプション

```bash
# JSON形式で出力
cargo run --bin similarity-md --format json

# セクション内容も表示
cargo run --bin similarity-md --print

# 最小単語数を指定
cargo run --bin similarity-md --min-words 20

# 同一ファイル内のみ比較
cargo run --bin similarity-md --same-file-only

# 異なるファイル間のみ比較
cargo run --bin similarity-md --cross-file-only
```

## 例

### 日本語テキストの類似性検出

```bash
# サンプルファイルで形態素解析をテスト
cargo run --example morphological_test

# 日本語Markdownファイルを解析
cargo run --bin similarity-md examples/japanese_similarity_test.md \
  --use-morphological \
  --morphological-weight 0.4 \
  --threshold 0.6 \
  --print
```

### 出力例

```
Similar sections found:
--------------------------------------------------------------------------------

1. Similarity: 87.50%
   Character-level: 85.20%, Word-level: 82.30%, Morphological: 92.10%, Title: 95.00%, Length: 88.70%
   examples/japanese_similarity_test.md:8 | L8-12 | 機械学習について (Level 2)
   examples/japanese_similarity_test.md:14 | L14-18 | マシンラーニングの概要 (Level 2)

2. Similarity: 84.20%
   Character-level: 82.10%, Word-level: 79.80%, Morphological: 89.30%, Title: 88.50%, Length: 91.20%
   examples/japanese_similarity_test.md:20 | L20-22 | 深層学習の基礎 (Level 2)
   examples/japanese_similarity_test.md:24 | L24-26 | ディープラーニングの原理 (Level 2)
```

## API 使用例

```rust
use similarity_md::{
    MorphologicalSimilarityCalculator,
    SimilarityCalculator,
    SimilarityOptions,
    SectionExtractor
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 形態素解析器を初期化
    let morph_calc = MorphologicalSimilarityCalculator::new(None)?;

    // 日本語テキストの類似性を計算
    let text1 = "機械学習は人工知能の一分野です。";
    let text2 = "マシンラーニングはAIの一領域です。";

    let similarity = morph_calc.calculate_morpheme_similarity(text1, text2)?;
    println!("形態素解析による類似性: {:.3}", similarity);

    // 統合された類似性計算器を使用
    let options = SimilarityOptions {
        use_morphological_analysis: true,
        morphological_weight: 0.4,
        ..Default::default()
    };

    let calculator = SimilarityCalculator::with_options(options)?;

    // Markdownファイルから類似セクションを検出
    let extractor = SectionExtractor::default();
    let sections = extractor.extract_from_file("document.md")?;
    let similar_pairs = calculator.find_similar_sections(&sections, 0.7);

    for pair in similar_pairs {
        println!("類似度: {:.3} - {} vs {}",
            pair.result.similarity,
            pair.section1.title,
            pair.section2.title
        );
    }

    Ok(())
}
```

## 設定

### 重みの調整指針

- **char_weight**: 文字レベルの類似性（タイポや表記揺れに敏感）
- **word_weight**: 単語レベルの類似性（語順の違いに敏感）
- **morphological_weight**: 形態素解析による類似性（日本語の意味的類似性に最適）
- **title_weight**: タイトルの類似性（セクションの主題の類似性）
- **length_weight**: 長さの類似性（コンテンツ量の類似性）

日本語テキストの場合、`morphological_weight`を高めに設定することを推奨します。

### 辞書の選択

- **IPAdic**: 一般的な用途に適した標準辞書
- **UniDic**: より詳細な言語学的情報が必要な場合
- **NEologd**: 新語や固有名詞を多く含む現代的なテキストに適用

## トラブルシューティング

### 形態素解析器の初期化に失敗する場合

1. MeCab 辞書がインストールされているか確認
2. 辞書パスを明示的に指定: `--morphological-dict /path/to/dict`
3. 辞書ファイルの権限を確認

### パフォーマンスの問題

1. 最小単語数を増やして小さなセクションを除外: `--min-words 20`
2. 最大見出しレベルを制限: `--max-level 3`
3. 形態素解析を無効化して従来の方法のみ使用

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。特に以下の分野での貢献を求めています：

- 他の形態素解析器のサポート
- 多言語対応
- パフォーマンスの改善
- 新しい類似性指標の追加
