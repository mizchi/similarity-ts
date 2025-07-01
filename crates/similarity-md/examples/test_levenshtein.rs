//! Levenshtein距離計算のテスト

use similarity_md::{levenshtein_similarity, word_levenshtein_similarity};

fn main() {
    println!("=== Levenshtein距離計算テスト ===\n");

    // 基本的なテスト
    let text1 = "機械学習について";
    let text2 = "マシンラーニングの概要";

    println!("テキスト1: '{text1}'");
    println!("テキスト2: '{text2}'");

    let char_sim = levenshtein_similarity(text1, text2);
    let word_sim = word_levenshtein_similarity(text1, text2);

    println!("文字レベル類似性: {char_sim:.4}");
    println!("単語レベル類似性: {word_sim:.4}");
    println!();

    // より類似したテキストのテスト
    let text3 = "機械学習は、コンピュータがデータから自動的にパターンを学習する技術です。";
    let text4 = "マシンラーニングとは、計算機がデータから自動的にパターンを習得する手法です。";

    println!("テキスト3: '{text3}'");
    println!("テキスト4: '{text4}'");

    let char_sim2 = levenshtein_similarity(text3, text4);
    let word_sim2 = word_levenshtein_similarity(text3, text4);

    println!("文字レベル類似性: {char_sim2:.4}");
    println!("単語レベル類似性: {word_sim2:.4}");
    println!();

    // 英語のテスト
    let en1 = "machine learning";
    let en2 = "machine learning";

    println!("英語テキスト1: '{en1}'");
    println!("英語テキスト2: '{en2}'");

    let char_sim3 = levenshtein_similarity(en1, en2);
    let word_sim3 = word_levenshtein_similarity(en1, en2);

    println!("文字レベル類似性: {char_sim3:.4}");
    println!("単語レベル類似性: {word_sim3:.4}");
    println!();

    // 完全に異なるテキスト
    let diff1 = "今日の天気は晴れです";
    let diff2 = "プログラミング言語";

    println!("異なるテキスト1: '{diff1}'");
    println!("異なるテキスト2: '{diff2}'");

    let char_sim4 = levenshtein_similarity(diff1, diff2);
    let word_sim4 = word_levenshtein_similarity(diff1, diff2);

    println!("文字レベル類似性: {char_sim4:.4}");
    println!("単語レベル類似性: {word_sim4:.4}");
}
