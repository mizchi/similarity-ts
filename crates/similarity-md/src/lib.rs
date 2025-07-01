pub mod levenshtein;
pub mod markdown_parser;
pub mod section_extractor;
pub mod similarity_calculator;

pub use levenshtein::{
    levenshtein_distance, levenshtein_similarity, word_levenshtein_distance,
    word_levenshtein_similarity,
};
pub use markdown_parser::{MarkdownParser, MarkdownSection};
pub use section_extractor::{ExtractedSection, SectionExtractor, SimilarTitlePair};
pub use similarity_calculator::{
    SimilarSectionPair, SimilarityCalculator, SimilarityOptions, SimilarityResult,
};
