use crate::levenshtein::{levenshtein_similarity, word_levenshtein_similarity};
use crate::morphological_similarity::MorphologicalSimilarityCalculator;
use crate::section_extractor::ExtractedSection;
use serde::{Deserialize, Serialize};

/// Options for similarity calculation
#[derive(Debug, Clone)]
pub struct SimilarityOptions {
    /// Weight for character-level Levenshtein similarity (0.0-1.0)
    pub char_levenshtein_weight: f64,
    /// Weight for word-level Levenshtein similarity (0.0-1.0)
    pub word_levenshtein_weight: f64,
    /// Weight for morphological similarity (0.0-1.0)
    pub morphological_weight: f64,
    /// Weight for title similarity (0.0-1.0)
    pub title_weight: f64,
    /// Weight for content length similarity (0.0-1.0)
    pub length_weight: f64,
    /// Minimum content length ratio to avoid penalizing very different sizes
    pub min_length_ratio: f64,
    /// Whether to normalize text before comparison (lowercase, remove punctuation)
    pub normalize_text: bool,
    /// Whether to consider section hierarchy in comparison
    pub consider_hierarchy: bool,
    /// Maximum level difference for hierarchy comparison
    pub max_level_diff: u32,
    /// Whether to use morphological analysis for Japanese text
    pub use_morphological_analysis: bool,
    /// Path to morphological analysis dictionary
    pub morphological_dict_path: Option<String>,
}

impl Default for SimilarityOptions {
    fn default() -> Self {
        Self {
            char_levenshtein_weight: 0.3,
            word_levenshtein_weight: 0.2,
            morphological_weight: 0.3,
            title_weight: 0.1,
            length_weight: 0.1,
            min_length_ratio: 0.3,
            normalize_text: true,
            consider_hierarchy: true,
            max_level_diff: 2,
            use_morphological_analysis: false,
            morphological_dict_path: None,
        }
    }
}

impl SimilarityOptions {
    /// Validate that weights sum to 1.0
    pub fn validate(&self) -> Result<(), String> {
        let total_weight = self.char_levenshtein_weight
            + self.word_levenshtein_weight
            + self.morphological_weight
            + self.title_weight
            + self.length_weight;

        if (total_weight - 1.0).abs() > 0.001 {
            return Err(format!("Weights must sum to 1.0, got {total_weight:.3}"));
        }

        Ok(())
    }
}

/// Result of similarity calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarityResult {
    /// Overall similarity score (0.0-1.0)
    pub similarity: f64,
    /// Character-level Levenshtein similarity
    pub char_levenshtein_similarity: f64,
    /// Word-level Levenshtein similarity
    pub word_levenshtein_similarity: f64,
    /// Morphological similarity (Japanese text analysis)
    pub morphological_similarity: f64,
    /// Title similarity
    pub title_similarity: f64,
    /// Content length similarity
    pub length_similarity: f64,
    /// Whether sections are from the same hierarchy level
    pub same_level: bool,
    /// Level difference between sections
    pub level_diff: u32,
}

/// Pair of similar sections
#[derive(Debug, Clone, Serialize)]
pub struct SimilarSectionPair {
    pub section1: ExtractedSection,
    pub section2: ExtractedSection,
    pub result: SimilarityResult,
}

/// Main similarity calculator for markdown sections
pub struct SimilarityCalculator {
    options: SimilarityOptions,
    morphological_calculator: Option<MorphologicalSimilarityCalculator>,
}

impl SimilarityCalculator {
    /// Create a new similarity calculator with default options
    pub fn new() -> Self {
        Self { options: SimilarityOptions::default(), morphological_calculator: None }
    }

    /// Create a new similarity calculator with custom options
    pub fn with_options(options: SimilarityOptions) -> Result<Self, anyhow::Error> {
        options.validate().map_err(anyhow::Error::msg)?;

        let morphological_calculator = if options.use_morphological_analysis {
            match MorphologicalSimilarityCalculator::new(options.morphological_dict_path.as_deref())
            {
                Ok(calc) => Some(calc),
                Err(e) => {
                    eprintln!("Warning: Failed to initialize morphological analyzer: {e}");
                    eprintln!("Falling back to non-morphological analysis");
                    None
                }
            }
        } else {
            None
        };

        Ok(Self { options, morphological_calculator })
    }

    /// Calculate similarity between two sections
    pub fn calculate_similarity(
        &self,
        section1: &ExtractedSection,
        section2: &ExtractedSection,
    ) -> SimilarityResult {
        // Skip if same section
        if section1.file_path == section2.file_path && section1.line_start == section2.line_start {
            return SimilarityResult {
                similarity: 0.0,
                char_levenshtein_similarity: 0.0,
                word_levenshtein_similarity: 0.0,
                morphological_similarity: 0.0,
                title_similarity: 0.0,
                length_similarity: 0.0,
                same_level: false,
                level_diff: 0,
            };
        }

        // Prepare content for comparison
        let content1 = if self.options.normalize_text {
            self.normalize_text(&section1.plain_content)
        } else {
            section1.plain_content.clone()
        };

        let content2 = if self.options.normalize_text {
            self.normalize_text(&section2.plain_content)
        } else {
            section2.plain_content.clone()
        };

        let title1 = if self.options.normalize_text {
            self.normalize_text(&section1.title)
        } else {
            section1.title.clone()
        };

        let title2 = if self.options.normalize_text {
            self.normalize_text(&section2.title)
        } else {
            section2.title.clone()
        };

        // Calculate individual similarities
        let char_levenshtein_similarity = levenshtein_similarity(&content1, &content2);
        let word_levenshtein_similarity = word_levenshtein_similarity(&content1, &content2);
        let title_similarity = levenshtein_similarity(&title1, &title2);
        let length_similarity = self.calculate_length_similarity(section1, section2);

        // Calculate morphological similarity if available
        let morphological_similarity = if let Some(ref morph_calc) = self.morphological_calculator {
            morph_calc.calculate_morpheme_similarity(&content1, &content2).unwrap_or(0.0)
        } else {
            0.0
        };

        // Calculate hierarchy information
        let level_diff = (section1.level as i32 - section2.level as i32).unsigned_abs();
        let same_level = level_diff == 0;

        // Apply hierarchy penalty if enabled
        let hierarchy_penalty =
            if self.options.consider_hierarchy && level_diff > self.options.max_level_diff {
                0.5 // Reduce similarity for sections at very different levels
            } else {
                1.0
            };

        // Calculate weighted similarity
        let similarity = (char_levenshtein_similarity * self.options.char_levenshtein_weight
            + word_levenshtein_similarity * self.options.word_levenshtein_weight
            + morphological_similarity * self.options.morphological_weight
            + title_similarity * self.options.title_weight
            + length_similarity * self.options.length_weight)
            * hierarchy_penalty;

        SimilarityResult {
            similarity,
            char_levenshtein_similarity,
            word_levenshtein_similarity,
            morphological_similarity,
            title_similarity,
            length_similarity,
            same_level,
            level_diff,
        }
    }

    /// Find similar sections across all provided sections
    pub fn find_similar_sections(
        &self,
        sections: &[ExtractedSection],
        threshold: f64,
    ) -> Vec<SimilarSectionPair> {
        let mut similar_pairs = Vec::new();

        for i in 0..sections.len() {
            for j in (i + 1)..sections.len() {
                let section1 = &sections[i];
                let section2 = &sections[j];

                let result = self.calculate_similarity(section1, section2);

                if result.similarity >= threshold {
                    similar_pairs.push(SimilarSectionPair {
                        section1: section1.clone(),
                        section2: section2.clone(),
                        result,
                    });
                }
            }
        }

        // Sort by similarity (highest first)
        similar_pairs
            .sort_by(|a, b| b.result.similarity.partial_cmp(&a.result.similarity).unwrap());

        similar_pairs
    }

    /// Find similar sections within the same file
    pub fn find_similar_sections_in_file(
        &self,
        sections: &[ExtractedSection],
        file_path: &str,
        threshold: f64,
    ) -> Vec<SimilarSectionPair> {
        let file_sections: Vec<_> = sections.iter().filter(|s| s.file_path == file_path).collect();

        let mut similar_pairs = Vec::new();

        for i in 0..file_sections.len() {
            for j in (i + 1)..file_sections.len() {
                let section1 = file_sections[i];
                let section2 = file_sections[j];

                let result = self.calculate_similarity(section1, section2);

                if result.similarity >= threshold {
                    similar_pairs.push(SimilarSectionPair {
                        section1: section1.clone(),
                        section2: section2.clone(),
                        result,
                    });
                }
            }
        }

        similar_pairs
            .sort_by(|a, b| b.result.similarity.partial_cmp(&a.result.similarity).unwrap());
        similar_pairs
    }

    /// Find similar sections across different files
    pub fn find_similar_sections_across_files(
        &self,
        sections: &[ExtractedSection],
        threshold: f64,
    ) -> Vec<SimilarSectionPair> {
        let mut similar_pairs = Vec::new();

        for i in 0..sections.len() {
            for j in (i + 1)..sections.len() {
                let section1 = &sections[i];
                let section2 = &sections[j];

                // Only compare sections from different files
                if section1.file_path == section2.file_path {
                    continue;
                }

                let result = self.calculate_similarity(section1, section2);

                if result.similarity >= threshold {
                    similar_pairs.push(SimilarSectionPair {
                        section1: section1.clone(),
                        section2: section2.clone(),
                        result,
                    });
                }
            }
        }

        similar_pairs
            .sort_by(|a, b| b.result.similarity.partial_cmp(&a.result.similarity).unwrap());
        similar_pairs
    }

    /// Normalize text for comparison
    fn normalize_text(&self, text: &str) -> String {
        text.to_lowercase()
            .chars()
            .filter(|c| c.is_alphanumeric() || c.is_whitespace())
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// Calculate length similarity between two sections
    fn calculate_length_similarity(
        &self,
        section1: &ExtractedSection,
        section2: &ExtractedSection,
    ) -> f64 {
        let len1 = section1.word_count as f64;
        let len2 = section2.word_count as f64;

        if len1 == 0.0 && len2 == 0.0 {
            return 1.0;
        }

        let ratio = len1.min(len2) / len1.max(len2).max(1.0);

        if ratio < self.options.min_length_ratio {
            ratio / self.options.min_length_ratio
        } else {
            1.0
        }
    }
}

impl Default for SimilarityCalculator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_section(
        title: &str,
        content: &str,
        level: u32,
        file_path: &str,
    ) -> ExtractedSection {
        ExtractedSection {
            title: title.to_string(),
            level,
            content: content.to_string(),
            plain_content: content.to_string(),
            word_count: content.split_whitespace().count(),
            line_start: 1,
            line_end: 10,
            path: vec![title.to_string()],
            file_path: file_path.to_string(),
        }
    }

    #[test]
    fn test_calculate_similarity() {
        let calculator = SimilarityCalculator::new();

        let section1 = create_test_section(
            "Introduction",
            "This is an introduction to the topic with some detailed explanation.",
            1,
            "file1.md",
        );

        let section2 = create_test_section(
            "Introduction",
            "This is an introduction to the subject with some detailed explanation.",
            1,
            "file2.md",
        );

        let result = calculator.calculate_similarity(&section1, &section2);

        assert!(result.similarity > 0.6);
        assert!(result.title_similarity > 0.9);
        assert!(result.char_levenshtein_similarity > 0.8);
        assert_eq!(result.level_diff, 0);
        assert!(result.same_level);
    }

    #[test]
    fn test_find_similar_sections() {
        let calculator = SimilarityCalculator::new();

        let sections = vec![
            create_test_section(
                "Getting Started",
                "This section explains how to get started with the project.",
                1,
                "file1.md",
            ),
            create_test_section(
                "Getting Started",
                "This section explains how to begin with the project.",
                1,
                "file2.md",
            ),
            create_test_section(
                "Advanced Topics",
                "This covers advanced usage patterns.",
                1,
                "file1.md",
            ),
        ];

        let similar_pairs = calculator.find_similar_sections(&sections, 0.6);

        assert_eq!(similar_pairs.len(), 1);
        assert_eq!(similar_pairs[0].section1.title, "Getting Started");
        assert_eq!(similar_pairs[0].section2.title, "Getting Started");
        assert!(similar_pairs[0].result.similarity > 0.6);
    }

    #[test]
    fn test_similarity_options_validation() {
        let mut options = SimilarityOptions::default();
        assert!(options.validate().is_ok());

        options.char_levenshtein_weight = 0.5;
        options.word_levenshtein_weight = 0.5;
        options.title_weight = 0.5;
        options.length_weight = 0.5;

        assert!(options.validate().is_err());
    }

    #[test]
    fn test_normalize_text() {
        let calculator = SimilarityCalculator::new();

        let text = "Hello, World! This is a TEST.";
        let normalized = calculator.normalize_text(text);

        assert_eq!(normalized, "hello world this is a test");
    }
}
