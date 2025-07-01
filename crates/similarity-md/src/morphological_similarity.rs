use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs::File;
use std::path::Path;
use vibrato::{Dictionary, Tokenizer};

#[cfg(feature = "zstd-support")]
use zstd::Decoder;

/// 形態素解析を使った類似性計算器
pub struct MorphologicalSimilarityCalculator {
    tokenizer: Tokenizer,
}

impl MorphologicalSimilarityCalculator {
    /// 新しい形態素解析類似性計算器を作成
    ///
    /// # Arguments
    /// * `dict_path` - 辞書ファイルのパス（Vibratoの辞書）
    pub fn new(dict_path: Option<&str>) -> Result<Self> {
        let dict = if let Some(path) = dict_path {
            Self::load_dictionary(path)?
        } else {
            // デフォルトの辞書パスを試行
            let default_paths = [
                "/usr/share/mecab/dic/ipadic/system.dic",
                "/usr/share/mecab/dic/ipadic/system.dic.zst",
                "/opt/homebrew/lib/mecab/dic/ipadic/system.dic",
                "/opt/homebrew/lib/mecab/dic/ipadic/system.dic.zst",
                "./dict/system.dic",
                "./dict/system.dic.zst",
                "./system.dic",
                "./system.dic.zst",
                "./ipadic-mecab-2_7_0/system.dic.zst",
            ];

            let mut dict = None;
            for path in &default_paths {
                if Path::new(path).exists() {
                    if let Ok(d) = Self::load_dictionary(path) {
                        dict = Some(d);
                        break;
                    }
                }
            }

            dict.context("形態素解析辞書が見つかりません。辞書パスを指定してください。\n利用可能な辞書をダウンロードするには:\nwget https://github.com/daac-tools/vibrato/releases/download/v0.5.0/ipadic-mecab-2_7_0.tar.xz\ntar xf ipadic-mecab-2_7_0.tar.xz")?
        };

        let tokenizer = Tokenizer::new(dict);

        Ok(Self { tokenizer })
    }

    /// 辞書ファイルを読み込む（圧縮ファイルにも対応）
    fn load_dictionary(path: &str) -> Result<Dictionary> {
        let file = File::open(path)
            .with_context(|| format!("辞書ファイルを開けませんでした: {}", path))?;

        // .zstファイルの場合は解凍して読み込み
        if path.ends_with(".zst") {
            #[cfg(feature = "zstd-support")]
            {
                let decoder = Decoder::new(file)
                    .with_context(|| format!("zstdデコーダーの初期化に失敗しました: {}", path))?;
                Dictionary::read(decoder)
                    .with_context(|| format!("圧縮辞書ファイルの読み込みに失敗しました: {}", path))
            }
            #[cfg(not(feature = "zstd-support"))]
            {
                Err(anyhow::anyhow!(
                    "圧縮辞書ファイル（.zst）を読み込むには、zstd-supportフィーチャーを有効にしてください: {}",
                    path
                ))
            }
        } else {
            Dictionary::read(file)
                .with_context(|| format!("辞書ファイルの読み込みに失敗しました: {}", path))
        }
    }

    /// テキストを形態素に分解
    pub fn tokenize(&self, text: &str) -> Result<Vec<MorphemeToken>> {
        let mut worker = self.tokenizer.new_worker();
        worker.reset_sentence(text);
        worker.tokenize();

        let mut tokens = Vec::new();

        for i in 0..worker.num_tokens() {
            let token = worker.token(i);
            let surface = token.surface();
            let features = token.feature();

            // 品詞情報を解析
            let pos_parts: Vec<&str> = features.split(',').collect();
            let pos_main = pos_parts.get(0).unwrap_or(&"").to_string();
            let pos_sub1 = pos_parts.get(1).unwrap_or(&"").to_string();
            let pos_sub2 = pos_parts.get(2).unwrap_or(&"").to_string();
            let base_form = pos_parts.get(6).unwrap_or(&surface).to_string();

            tokens.push(MorphemeToken {
                surface: surface.to_string(),
                base_form,
                pos_main,
                pos_sub1,
                pos_sub2,
                features: features.to_string(),
            });
        }

        Ok(tokens)
    }

    /// 形態素ベースの類似性を計算
    pub fn calculate_morpheme_similarity(&self, text1: &str, text2: &str) -> Result<f64> {
        let tokens1 = self.tokenize(text1)?;
        let tokens2 = self.tokenize(text2)?;

        // 内容語（名詞、動詞、形容詞、副詞）のみを抽出
        let content_words1 = self.extract_content_words(&tokens1);
        let content_words2 = self.extract_content_words(&tokens2);

        // Jaccard係数を計算
        let similarity = self.calculate_jaccard_similarity(&content_words1, &content_words2);

        Ok(similarity)
    }

    /// 品詞別類似性を計算
    pub fn calculate_pos_similarity(&self, text1: &str, text2: &str) -> Result<PosSimilarity> {
        let tokens1 = self.tokenize(text1)?;
        let tokens2 = self.tokenize(text2)?;

        let nouns1 = self.extract_by_pos(&tokens1, "名詞");
        let nouns2 = self.extract_by_pos(&tokens2, "名詞");
        let noun_similarity = self.calculate_jaccard_similarity(&nouns1, &nouns2);

        let verbs1 = self.extract_by_pos(&tokens1, "動詞");
        let verbs2 = self.extract_by_pos(&tokens2, "動詞");
        let verb_similarity = self.calculate_jaccard_similarity(&verbs1, &verbs2);

        let adjectives1 = self.extract_by_pos(&tokens1, "形容詞");
        let adjectives2 = self.extract_by_pos(&tokens2, "形容詞");
        let adjective_similarity = self.calculate_jaccard_similarity(&adjectives1, &adjectives2);

        Ok(PosSimilarity { noun_similarity, verb_similarity, adjective_similarity })
    }

    /// 内容語を抽出（名詞、動詞、形容詞、副詞）
    fn extract_content_words(&self, tokens: &[MorphemeToken]) -> Vec<String> {
        tokens
            .iter()
            .filter(|token| matches!(token.pos_main.as_str(), "名詞" | "動詞" | "形容詞" | "副詞"))
            .map(|token| token.base_form.clone())
            .collect()
    }

    /// 指定された品詞の語を抽出
    fn extract_by_pos(&self, tokens: &[MorphemeToken], pos: &str) -> Vec<String> {
        tokens
            .iter()
            .filter(|token| token.pos_main == pos)
            .map(|token| token.base_form.clone())
            .collect()
    }

    /// Jaccard係数を計算
    fn calculate_jaccard_similarity(&self, words1: &[String], words2: &[String]) -> f64 {
        if words1.is_empty() && words2.is_empty() {
            return 1.0;
        }

        let set1: std::collections::HashSet<_> = words1.iter().collect();
        let set2: std::collections::HashSet<_> = words2.iter().collect();

        let intersection = set1.intersection(&set2).count();
        let union = set1.union(&set2).count();

        if union == 0 {
            0.0
        } else {
            intersection as f64 / union as f64
        }
    }

    /// TF-IDF風の重み付き類似性を計算
    pub fn calculate_weighted_similarity(
        &self,
        text1: &str,
        text2: &str,
        corpus: &[String],
    ) -> Result<f64> {
        let tokens1 = self.tokenize(text1)?;
        let tokens2 = self.tokenize(text2)?;

        let content_words1 = self.extract_content_words(&tokens1);
        let content_words2 = self.extract_content_words(&tokens2);

        // 語の出現頻度を計算
        let freq1 = self.calculate_word_frequency(&content_words1);
        let freq2 = self.calculate_word_frequency(&content_words2);

        // コーパス全体での語の出現頻度を計算（簡易版IDF）
        let corpus_freq = self.calculate_corpus_frequency(corpus)?;

        // 重み付きコサイン類似度を計算
        let similarity = self.calculate_weighted_cosine_similarity(&freq1, &freq2, &corpus_freq);

        Ok(similarity)
    }

    /// 語の出現頻度を計算
    fn calculate_word_frequency(&self, words: &[String]) -> HashMap<String, f64> {
        let mut freq = HashMap::new();
        let total = words.len() as f64;

        for word in words {
            *freq.entry(word.clone()).or_insert(0.0) += 1.0;
        }

        // 正規化
        for value in freq.values_mut() {
            *value /= total;
        }

        freq
    }

    /// コーパス全体での語の出現頻度を計算
    fn calculate_corpus_frequency(&self, corpus: &[String]) -> Result<HashMap<String, f64>> {
        let mut doc_count = HashMap::new();
        let total_docs = corpus.len() as f64;

        for text in corpus {
            let tokens = self.tokenize(text)?;
            let content_words = self.extract_content_words(&tokens);
            let unique_words: std::collections::HashSet<_> = content_words.into_iter().collect();

            for word in unique_words {
                *doc_count.entry(word).or_insert(0.0) += 1.0;
            }
        }

        // IDFを計算
        let mut idf = HashMap::new();
        for (word, count) in doc_count {
            idf.insert(word, (total_docs / count).ln());
        }

        Ok(idf)
    }

    /// 重み付きコサイン類似度を計算
    fn calculate_weighted_cosine_similarity(
        &self,
        freq1: &HashMap<String, f64>,
        freq2: &HashMap<String, f64>,
        idf: &HashMap<String, f64>,
    ) -> f64 {
        let mut dot_product = 0.0;
        let mut norm1 = 0.0;
        let mut norm2 = 0.0;

        let all_words: std::collections::HashSet<_> = freq1.keys().chain(freq2.keys()).collect();

        for word in all_words {
            let tf1 = freq1.get(word).unwrap_or(&0.0);
            let tf2 = freq2.get(word).unwrap_or(&0.0);
            let idf_weight = idf.get(word).unwrap_or(&1.0);

            let weight1 = tf1 * idf_weight;
            let weight2 = tf2 * idf_weight;

            dot_product += weight1 * weight2;
            norm1 += weight1 * weight1;
            norm2 += weight2 * weight2;
        }

        if norm1 == 0.0 || norm2 == 0.0 {
            0.0
        } else {
            dot_product / (norm1.sqrt() * norm2.sqrt())
        }
    }
}

/// 形態素トークン
#[derive(Debug, Clone)]
pub struct MorphemeToken {
    /// 表層形
    pub surface: String,
    /// 基本形
    pub base_form: String,
    /// 主品詞
    pub pos_main: String,
    /// 品詞細分類1
    pub pos_sub1: String,
    /// 品詞細分類2
    pub pos_sub2: String,
    /// 全品詞情報
    pub features: String,
}

/// 品詞別類似性
#[derive(Debug, Clone)]
pub struct PosSimilarity {
    /// 名詞の類似性
    pub noun_similarity: f64,
    /// 動詞の類似性
    pub verb_similarity: f64,
    /// 形容詞の類似性
    pub adjective_similarity: f64,
}

impl PosSimilarity {
    /// 重み付き総合類似性を計算
    pub fn weighted_average(&self, noun_weight: f64, verb_weight: f64, adj_weight: f64) -> f64 {
        let total_weight = noun_weight + verb_weight + adj_weight;
        if total_weight == 0.0 {
            0.0
        } else {
            (self.noun_similarity * noun_weight
                + self.verb_similarity * verb_weight
                + self.adjective_similarity * adj_weight)
                / total_weight
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // 注意: テストを実行するには適切な辞書ファイルが必要です
    #[test]
    #[ignore] // 辞書ファイルが必要なためデフォルトでは無視
    fn test_tokenize() {
        let calculator = MorphologicalSimilarityCalculator::new(None).unwrap();
        let tokens = calculator.tokenize("これは日本語のテストです。").unwrap();

        assert!(!tokens.is_empty());
        // 実際のトークン数は辞書によって異なる可能性があります
    }

    #[test]
    #[ignore] // 辞書ファイルが必要なためデフォルトでは無視
    fn test_morpheme_similarity() {
        let calculator = MorphologicalSimilarityCalculator::new(None).unwrap();

        let text1 = "これは日本語の文書です。";
        let text2 = "これは日本語のドキュメントです。";

        let similarity = calculator.calculate_morpheme_similarity(text1, text2).unwrap();
        assert!(similarity > 0.0);
        assert!(similarity <= 1.0);
    }
}
