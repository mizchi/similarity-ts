//! 形態素解析機能のテスト例
//!
//! このサンプルは、Vibratoを使った形態素解析による日本語テキストの類似性検出をデモンストレーションします。
//!
//! 実行方法:
//! ```bash
//! cargo run --example morphological_test
//! ```

use similarity_md::{
    MorphologicalSimilarityCalculator, SectionExtractor, SimilarityCalculator, SimilarityOptions,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== 形態素解析による日本語類似性検出のテスト ===\n");

    // 形態素解析器の初期化を試行
    match MorphologicalSimilarityCalculator::new(None) {
        Ok(morph_calc) => {
            println!("✓ 形態素解析器の初期化に成功しました");
            test_morphological_analysis(&morph_calc)?;
        }
        Err(e) => {
            println!("⚠ 形態素解析器の初期化に失敗しました: {}", e);
            println!("辞書ファイルが見つからない可能性があります。");
            println!("以下のいずれかの方法で辞書を準備してください:");
            println!("1. MeCab辞書をインストール: sudo apt-get install mecab-ipadic-utf8");
            println!("2. 辞書パスを指定: --morphological-dict /path/to/dict");
            println!("\n従来の類似性検出のみでテストを続行します...\n");
        }
    }

    // 従来の類似性検出のテスト
    test_traditional_similarity()?;

    Ok(())
}

fn test_morphological_analysis(
    morph_calc: &MorphologicalSimilarityCalculator,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n--- 形態素解析テスト ---");

    let text1 = "機械学習は、コンピュータがデータから自動的にパターンを学習する技術です。";
    let text2 = "マシンラーニングとは、計算機がデータから自動的にパターンを習得する手法です。";
    let text3 = "今日の天気は晴れです。公園で散歩をしました。";

    println!("テキスト1: {}", text1);
    println!("テキスト2: {}", text2);
    println!("テキスト3: {}", text3);

    // 形態素解析
    println!("\n形態素解析結果:");
    let tokens1 = morph_calc.tokenize(text1)?;
    println!("テキスト1の形態素: {:?}", tokens1.iter().map(|t| &t.surface).collect::<Vec<_>>());

    let tokens2 = morph_calc.tokenize(text2)?;
    println!("テキスト2の形態素: {:?}", tokens2.iter().map(|t| &t.surface).collect::<Vec<_>>());

    // 類似性計算
    println!("\n類似性計算結果:");
    let sim_1_2 = morph_calc.calculate_morpheme_similarity(text1, text2)?;
    let sim_1_3 = morph_calc.calculate_morpheme_similarity(text1, text3)?;

    println!("テキスト1 vs テキスト2: {:.3}", sim_1_2);
    println!("テキスト1 vs テキスト3: {:.3}", sim_1_3);

    // 品詞別類似性
    println!("\n品詞別類似性:");
    let pos_sim = morph_calc.calculate_pos_similarity(text1, text2)?;
    println!("名詞類似性: {:.3}", pos_sim.noun_similarity);
    println!("動詞類似性: {:.3}", pos_sim.verb_similarity);
    println!("形容詞類似性: {:.3}", pos_sim.adjective_similarity);

    Ok(())
}

fn test_traditional_similarity() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n--- 従来の類似性検出テスト ---");

    // サンプルMarkdownファイルを読み込み
    let sample_path = "../../examples/japanese_similarity_test.md";

    if std::path::Path::new(sample_path).exists() {
        println!("サンプルファイルを解析中: {}", sample_path);

        let extractor = SectionExtractor::new(5, 6, false);
        let sections = extractor.extract_from_file(sample_path)?;

        println!("抽出されたセクション数: {}", sections.len());

        // デフォルトの類似性計算
        let calculator = SimilarityCalculator::new();
        let similar_pairs = calculator.find_similar_sections(&sections, 0.5);

        println!("\n類似セクションペア (閾値: 0.5):");
        for (i, pair) in similar_pairs.iter().enumerate() {
            println!("{}. 類似度: {:.3}", i + 1, pair.result.similarity);
            println!("   セクション1: {}", pair.section1.title);
            println!("   セクション2: {}", pair.section2.title);
            println!(
                "   文字レベル: {:.3}, 単語レベル: {:.3}",
                pair.result.char_levenshtein_similarity, pair.result.word_levenshtein_similarity
            );
        }
    } else {
        println!("サンプルファイルが見つかりません: {}", sample_path);
        println!("以下のコマンドでサンプルファイルを作成してください:");
        println!("cargo run --bin similarity-md -- --help");
    }

    Ok(())
}
