//! 類似性計算のデバッグ用プログラム

use similarity_md::{SectionExtractor, SimilarityCalculator, SimilarityOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== 類似性計算デバッグ ===\n");

    // サンプルファイルを読み込み
    let sample_path = "../../examples/japanese_similarity_test.md";

    if !std::path::Path::new(sample_path).exists() {
        println!("サンプルファイルが見つかりません: {}", sample_path);
        return Ok(());
    }

    // セクションを抽出
    let extractor = SectionExtractor::new(1, 6, true);
    let sections = extractor.extract_from_file(sample_path)?;

    println!("抽出されたセクション数: {}", sections.len());

    for (i, section) in sections.iter().enumerate() {
        println!(
            "{}. タイトル: '{}' (レベル: {}, 単語数: {})",
            i + 1,
            section.title,
            section.level,
            section.word_count
        );
        println!("   内容: '{}'", section.plain_content.chars().take(100).collect::<String>());
        println!();
    }

    if sections.len() < 2 {
        println!("比較するには少なくとも2つのセクションが必要です。");
        return Ok(());
    }

    // 類似性計算器を作成
    let options = SimilarityOptions {
        char_levenshtein_weight: 0.5,
        word_levenshtein_weight: 0.3,
        morphological_weight: 0.0,
        title_weight: 0.1,
        length_weight: 0.1,
        min_length_ratio: 0.1,
        normalize_text: true,
        consider_hierarchy: false,
        max_level_diff: 10,
        use_morphological_analysis: false,
        morphological_dict_path: None,
    };

    let calculator = SimilarityCalculator::with_options(options)?;

    // 全ペアの類似性を計算
    println!("=== 全ペアの類似性計算 ===");
    for i in 0..sections.len() {
        for j in (i + 1)..sections.len() {
            let section1 = &sections[i];
            let section2 = &sections[j];

            // 同じセクション判定のデバッグ
            let is_same = section1.file_path == section2.file_path
                && section1.line_start == section2.line_start;

            let result = calculator.calculate_similarity(section1, section2);

            println!(
                "セクション {} vs {}: 類似度 {:.4} (同じセクション: {})",
                i + 1,
                j + 1,
                result.similarity,
                is_same
            );
            println!(
                "  文字レベル: {:.4}, 単語レベル: {:.4}, 形態素: {:.4}, タイトル: {:.4}, 長さ: {:.4}",
                result.char_levenshtein_similarity,
                result.word_levenshtein_similarity,
                result.morphological_similarity,
                result.title_similarity,
                result.length_similarity
            );
            println!(
                "  セクション1: '{}' ({}:{}-{})",
                section1.title, section1.file_path, section1.line_start, section1.line_end
            );
            println!(
                "  セクション2: '{}' ({}:{}-{})",
                section2.title, section2.file_path, section2.line_start, section2.line_end
            );

            // 内容の一部を表示
            println!("  内容1: '{}'", section1.plain_content.chars().take(50).collect::<String>());
            println!("  内容2: '{}'", section2.plain_content.chars().take(50).collect::<String>());
            println!();
        }
    }

    // 閾値0.01で類似セクションを検索
    println!("=== 閾値0.01での類似セクション検索 ===");
    let similar_pairs = calculator.find_similar_sections(&sections, 0.01);

    if similar_pairs.is_empty() {
        println!("類似セクションが見つかりませんでした。");
    } else {
        for (i, pair) in similar_pairs.iter().enumerate() {
            println!("{}. 類似度: {:.4}", i + 1, pair.result.similarity);
            println!("   セクション1: '{}'", pair.section1.title);
            println!("   セクション2: '{}'", pair.section2.title);
        }
    }

    Ok(())
}
