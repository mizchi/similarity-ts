use crate::markdown_parser::{MarkdownParser, MarkdownSection};
use std::fs;
use std::path::Path;

/// Section extractor for markdown documents
pub struct SectionExtractor {
    /// Minimum word count for a section to be considered
    pub min_words: usize,
    /// Maximum heading level to consider (1-6)
    pub max_level: u32,
    /// Whether to include empty sections
    pub include_empty: bool,
}

impl Default for SectionExtractor {
    fn default() -> Self {
        Self { min_words: 10, max_level: 6, include_empty: false }
    }
}

impl SectionExtractor {
    /// Create a new section extractor with custom options
    pub fn new(min_words: usize, max_level: u32, include_empty: bool) -> Self {
        Self { min_words, max_level, include_empty }
    }

    /// Extract sections from markdown content
    pub fn extract_from_content(&self, content: &str, file_path: &str) -> Vec<ExtractedSection> {
        let sections = MarkdownParser::parse(content);

        sections
            .into_iter()
            .filter(|section| self.should_include_section(section))
            .map(|section| {
                let plain_content = section.get_plain_content();
                let word_count = section.word_count();
                ExtractedSection {
                    title: section.title,
                    level: section.level,
                    content: section.content,
                    plain_content,
                    word_count,
                    line_start: section.line_start,
                    line_end: section.line_end,
                    path: section.path,
                    file_path: file_path.to_string(),
                }
            })
            .collect()
    }

    /// Extract sections from a markdown file
    pub fn extract_from_file<P: AsRef<Path>>(
        &self,
        file_path: P,
    ) -> Result<Vec<ExtractedSection>, std::io::Error> {
        let content = fs::read_to_string(&file_path)?;
        let path_str = file_path.as_ref().to_string_lossy().to_string();
        Ok(self.extract_from_content(&content, &path_str))
    }

    /// Extract sections from multiple files
    pub fn extract_from_files<P: AsRef<Path>>(&self, file_paths: &[P]) -> Vec<ExtractedSection> {
        let mut all_sections = Vec::new();

        for file_path in file_paths {
            match self.extract_from_file(file_path) {
                Ok(mut sections) => {
                    all_sections.append(&mut sections);
                }
                Err(e) => {
                    eprintln!("Error reading {}: {}", file_path.as_ref().display(), e);
                }
            }
        }

        all_sections
    }

    /// Check if a section should be included based on the extractor's criteria
    fn should_include_section(&self, section: &MarkdownSection) -> bool {
        // Check level
        if section.level > self.max_level {
            return false;
        }

        // Check if empty
        if section.is_empty() && !self.include_empty {
            return false;
        }

        // Check word count
        if section.word_count() < self.min_words {
            return false;
        }

        true
    }

    /// Group sections by their hierarchical level
    pub fn group_by_level<'a>(
        &self,
        sections: &'a [ExtractedSection],
    ) -> std::collections::HashMap<u32, Vec<&'a ExtractedSection>> {
        let mut groups = std::collections::HashMap::new();

        for section in sections {
            groups.entry(section.level).or_insert_with(Vec::new).push(section);
        }

        groups
    }

    /// Find sections with similar titles
    pub fn find_similar_titles(
        &self,
        sections: &[ExtractedSection],
        threshold: f64,
    ) -> Vec<SimilarTitlePair> {
        use crate::levenshtein::levenshtein_similarity;

        let mut similar_pairs = Vec::new();

        for i in 0..sections.len() {
            for j in (i + 1)..sections.len() {
                let section1 = &sections[i];
                let section2 = &sections[j];

                // Skip if same file and same section
                if section1.file_path == section2.file_path
                    && section1.line_start == section2.line_start
                {
                    continue;
                }

                let similarity = levenshtein_similarity(&section1.title, &section2.title);

                if similarity >= threshold {
                    similar_pairs.push(SimilarTitlePair {
                        section1: section1.clone(),
                        section2: section2.clone(),
                        similarity,
                    });
                }
            }
        }

        // Sort by similarity (highest first)
        similar_pairs.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());

        similar_pairs
    }
}

/// Represents an extracted section with additional metadata
#[derive(Debug, Clone, serde::Serialize)]
pub struct ExtractedSection {
    /// The heading title of the section
    pub title: String,
    /// The heading level (1-6)
    pub level: u32,
    /// The raw content of the section (with markdown formatting)
    pub content: String,
    /// The plain text content (without markdown formatting)
    pub plain_content: String,
    /// Word count of the plain content
    pub word_count: usize,
    /// Starting line number in the file
    pub line_start: usize,
    /// Ending line number in the file
    pub line_end: usize,
    /// Hierarchical path to this section
    pub path: Vec<String>,
    /// File path where this section was found
    pub file_path: String,
}

impl ExtractedSection {
    /// Get the full path as a string
    pub fn get_path_string(&self) -> String {
        self.path.join(" > ")
    }

    /// Get a summary of the section content
    pub fn get_summary(&self, max_words: usize) -> String {
        let words: Vec<&str> = self.plain_content.split_whitespace().collect();

        if words.len() <= max_words {
            self.plain_content.clone()
        } else {
            words[..max_words].join(" ") + "..."
        }
    }

    /// Get relative file path
    pub fn get_relative_path(&self) -> String {
        if let Ok(current_dir) = std::env::current_dir() {
            std::path::Path::new(&self.file_path)
                .strip_prefix(&current_dir)
                .unwrap_or(std::path::Path::new(&self.file_path))
                .to_string_lossy()
                .to_string()
        } else {
            self.file_path.clone()
        }
    }
}

/// Represents a pair of sections with similar titles
#[derive(Debug, Clone)]
pub struct SimilarTitlePair {
    pub section1: ExtractedSection,
    pub section2: ExtractedSection,
    pub similarity: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_extract_from_content() {
        let content = r#"# Introduction

This is the introduction with more than ten words to meet the minimum requirement.

## Getting Started

This section explains how to get started with the project and has enough content.

### Quick Start

Short content.

# Advanced Topics

This section covers advanced topics and contains sufficient content for analysis.
"#;

        let extractor = SectionExtractor::default();
        let sections = extractor.extract_from_content(content, "test.md");

        // Should have 3 sections (Quick Start filtered out due to word count)
        assert_eq!(sections.len(), 3);

        assert_eq!(sections[0].title, "Introduction");
        assert_eq!(sections[0].level, 1);
        assert!(sections[0].word_count >= 10);

        assert_eq!(sections[1].title, "Getting Started");
        assert_eq!(sections[1].level, 2);

        assert_eq!(sections[2].title, "Advanced Topics");
        assert_eq!(sections[2].level, 1);
    }

    #[test]
    fn test_extract_from_file() {
        let content = r#"# Test Document

This is a test document with sufficient content for testing purposes.

## Section One

This section has enough content to pass the minimum word count filter.
"#;

        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(content.as_bytes()).unwrap();

        let extractor = SectionExtractor::default();
        let sections = extractor.extract_from_file(temp_file.path()).unwrap();

        assert_eq!(sections.len(), 2);
        assert_eq!(sections[0].title, "Test Document");
        assert_eq!(sections[1].title, "Section One");
    }

    #[test]
    fn test_find_similar_titles() {
        let sections = vec![
            ExtractedSection {
                title: "Introduction".to_string(),
                level: 1,
                content: "Content".to_string(),
                plain_content: "Content".to_string(),
                word_count: 10,
                line_start: 1,
                line_end: 5,
                path: vec!["Introduction".to_string()],
                file_path: "file1.md".to_string(),
            },
            ExtractedSection {
                title: "Introduction".to_string(),
                level: 1,
                content: "Different content".to_string(),
                plain_content: "Different content".to_string(),
                word_count: 10,
                line_start: 1,
                line_end: 5,
                path: vec!["Introduction".to_string()],
                file_path: "file2.md".to_string(),
            },
            ExtractedSection {
                title: "Getting Started".to_string(),
                level: 1,
                content: "Content".to_string(),
                plain_content: "Content".to_string(),
                word_count: 10,
                line_start: 10,
                line_end: 15,
                path: vec!["Getting Started".to_string()],
                file_path: "file1.md".to_string(),
            },
        ];

        let extractor = SectionExtractor::default();
        let similar_pairs = extractor.find_similar_titles(&sections, 0.9);

        assert_eq!(similar_pairs.len(), 1);
        assert_eq!(similar_pairs[0].similarity, 1.0);
        assert_eq!(similar_pairs[0].section1.title, "Introduction");
        assert_eq!(similar_pairs[0].section2.title, "Introduction");
    }
}
