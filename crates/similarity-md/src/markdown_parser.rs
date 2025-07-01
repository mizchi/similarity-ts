use pulldown_cmark::{Event, Parser, Tag, TagEnd};
use std::collections::HashMap;

/// Markdown parser that extracts structured content
pub struct MarkdownParser;

impl MarkdownParser {
    /// Parse markdown content and extract sections
    pub fn parse(content: &str) -> Vec<MarkdownSection> {
        let parser = Parser::new(content);
        let mut sections = Vec::new();
        let mut current_section: Option<MarkdownSection> = None;
        let mut current_text = String::new();
        let mut heading_stack: Vec<(u32, String)> = Vec::new();
        let mut line_number = 1;

        for event in parser {
            match event {
                Event::Start(Tag::Heading { level: _, .. }) => {
                    // Save previous section if exists
                    if let Some(section) = current_section.take() {
                        sections.push(section);
                    }
                    current_text.clear();
                }
                Event::End(TagEnd::Heading(level)) => {
                    let heading_text = current_text.trim().to_string();
                    let level_u32 = match level {
                        pulldown_cmark::HeadingLevel::H1 => 1,
                        pulldown_cmark::HeadingLevel::H2 => 2,
                        pulldown_cmark::HeadingLevel::H3 => 3,
                        pulldown_cmark::HeadingLevel::H4 => 4,
                        pulldown_cmark::HeadingLevel::H5 => 5,
                        pulldown_cmark::HeadingLevel::H6 => 6,
                    };

                    // Update heading stack
                    heading_stack.retain(|(l, _)| *l < level_u32);
                    heading_stack.push((level_u32, heading_text.clone()));

                    // Create new section
                    current_section = Some(MarkdownSection {
                        title: heading_text,
                        level: level_u32,
                        content: String::new(),
                        line_start: line_number,
                        line_end: line_number,
                        path: heading_stack.iter().map(|(_, title)| title.clone()).collect(),
                    });
                    current_text.clear();
                }
                Event::Text(text) => {
                    current_text.push_str(&text);
                    if let Some(ref mut section) = current_section {
                        section.content.push_str(&text);
                    }
                }
                Event::Code(code) => {
                    current_text.push_str(&code);
                    if let Some(ref mut section) = current_section {
                        section.content.push_str(&code);
                    }
                }
                Event::Start(Tag::CodeBlock(_)) => {
                    // Code blocks are treated as content
                }
                Event::End(TagEnd::CodeBlock) => {
                    if let Some(ref mut section) = current_section {
                        section.content.push('\n');
                    }
                }
                Event::SoftBreak | Event::HardBreak => {
                    line_number += 1;
                    current_text.push('\n');
                    if let Some(ref mut section) = current_section {
                        section.content.push('\n');
                        section.line_end = line_number;
                    }
                }
                _ => {
                    // Handle other markdown elements as needed
                }
            }
        }

        // Add the last section
        if let Some(section) = current_section {
            sections.push(section);
        }

        sections
    }

    /// Extract plain text from markdown, removing all formatting
    pub fn extract_plain_text(content: &str) -> String {
        let parser = Parser::new(content);
        let mut plain_text = String::new();

        for event in parser {
            match event {
                Event::Text(text) | Event::Code(text) => {
                    plain_text.push_str(&text);
                }
                Event::SoftBreak | Event::HardBreak => {
                    plain_text.push('\n');
                }
                _ => {}
            }
        }

        plain_text
    }

    /// Count words in markdown content
    pub fn count_words(content: &str) -> usize {
        Self::extract_plain_text(content).split_whitespace().count()
    }

    /// Extract metadata from markdown (if present)
    pub fn extract_metadata(content: &str) -> HashMap<String, String> {
        let mut metadata = HashMap::new();

        // Simple front matter extraction (YAML-style)
        if content.starts_with("---\n") {
            if let Some(end_pos) = content[4..].find("\n---\n") {
                let front_matter = &content[4..end_pos + 4];
                for line in front_matter.lines() {
                    if let Some(colon_pos) = line.find(':') {
                        let key = line[..colon_pos].trim().to_string();
                        let value = line[colon_pos + 1..].trim().to_string();
                        metadata.insert(key, value);
                    }
                }
            }
        }

        metadata
    }
}

/// Represents a section in a markdown document
#[derive(Debug, Clone)]
pub struct MarkdownSection {
    /// The heading title of the section
    pub title: String,
    /// The heading level (1-6)
    pub level: u32,
    /// The content of the section (without the heading)
    pub content: String,
    /// Starting line number
    pub line_start: usize,
    /// Ending line number
    pub line_end: usize,
    /// Path from root to this section (hierarchical titles)
    pub path: Vec<String>,
}

impl MarkdownSection {
    /// Get the full path as a string
    pub fn get_path_string(&self) -> String {
        self.path.join(" > ")
    }

    /// Get plain text content without markdown formatting
    pub fn get_plain_content(&self) -> String {
        MarkdownParser::extract_plain_text(&self.content)
    }

    /// Count words in the section content
    pub fn word_count(&self) -> usize {
        MarkdownParser::count_words(&self.content)
    }

    /// Check if this section is empty (no meaningful content)
    pub fn is_empty(&self) -> bool {
        self.get_plain_content().trim().is_empty()
    }

    /// Get a summary of the section (first N words)
    pub fn get_summary(&self, max_words: usize) -> String {
        let plain_text = self.get_plain_content();
        let words: Vec<&str> = plain_text.split_whitespace().collect();

        if words.len() <= max_words {
            plain_text
        } else {
            words[..max_words].join(" ") + "..."
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_markdown() {
        let content = r#"# Title 1

Some content here.

## Subtitle 1

More content.

# Title 2

Different content.
"#;

        let sections = MarkdownParser::parse(content);
        assert_eq!(sections.len(), 3);

        assert_eq!(sections[0].title, "Title 1");
        assert_eq!(sections[0].level, 1);
        assert!(sections[0].content.contains("Some content here."));

        assert_eq!(sections[1].title, "Subtitle 1");
        assert_eq!(sections[1].level, 2);
        assert!(sections[1].content.contains("More content."));

        assert_eq!(sections[2].title, "Title 2");
        assert_eq!(sections[2].level, 1);
        assert!(sections[2].content.contains("Different content."));
    }

    #[test]
    fn test_extract_plain_text() {
        let content = "# Heading\n\nSome **bold** and *italic* text with `code`.";
        let plain = MarkdownParser::extract_plain_text(content);
        assert_eq!(plain, "HeadingSome bold and italic text with code.");
    }

    #[test]
    fn test_count_words() {
        let content = "# Heading\n\nThis has five words.";
        assert_eq!(MarkdownParser::count_words(content), 4); // "This has five words"
    }

    #[test]
    fn test_section_path() {
        let content = r#"# Chapter 1

Content

## Section 1.1

More content

### Subsection 1.1.1

Deep content
"#;

        let sections = MarkdownParser::parse(content);
        assert_eq!(sections.len(), 3);

        assert_eq!(sections[0].get_path_string(), "Chapter 1");
        assert_eq!(sections[1].get_path_string(), "Chapter 1 > Section 1.1");
        assert_eq!(sections[2].get_path_string(), "Chapter 1 > Section 1.1 > Subsection 1.1.1");
    }
}
