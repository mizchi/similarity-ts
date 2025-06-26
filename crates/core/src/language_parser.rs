use crate::tree::TreeNode;
use std::error::Error;
use std::rc::Rc;

/// Supported programming languages
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Language {
    JavaScript,
    TypeScript,
    Python,
    Rust,
    Go,
}

impl Language {
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().as_str() {
            "js" | "mjs" | "cjs" => Some(Language::JavaScript),
            "ts" | "tsx" => Some(Language::TypeScript),
            "py" => Some(Language::Python),
            "rs" => Some(Language::Rust),
            "go" => Some(Language::Go),
            _ => None,
        }
    }

    pub fn from_filename(filename: &str) -> Option<Self> {
        filename.split('.').last().and_then(Self::from_extension)
    }
}

/// Generic function definition that works across languages
#[derive(Debug, Clone)]
pub struct GenericFunctionDef {
    pub name: String,
    pub start_line: u32,
    pub end_line: u32,
    pub body_start_line: u32,
    pub body_end_line: u32,
    pub parameters: Vec<String>,
    pub is_method: bool,
    pub class_name: Option<String>,
}

/// Generic type definition that works across languages
#[derive(Debug, Clone)]
pub struct GenericTypeDef {
    pub name: String,
    pub kind: TypeDefKind,
    pub start_line: u32,
    pub end_line: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub enum TypeDefKind {
    Class,
    Interface,
    TypeAlias,
    Enum,
    Struct,
}

/// Trait for language-specific parsers
pub trait LanguageParser: Send + Sync {
    /// Parse source code into a TreeNode structure
    fn parse(&mut self, source: &str, filename: &str) -> Result<Rc<TreeNode>, Box<dyn Error>>;

    /// Extract function definitions from source code
    fn extract_functions(
        &mut self,
        source: &str,
        filename: &str,
    ) -> Result<Vec<GenericFunctionDef>, Box<dyn Error>>;

    /// Extract type definitions from source code
    fn extract_types(
        &mut self,
        source: &str,
        filename: &str,
    ) -> Result<Vec<GenericTypeDef>, Box<dyn Error>>;

    /// Get the language this parser handles
    fn language(&self) -> Language;
}

/// Factory for creating language-specific parsers
pub struct ParserFactory;

impl ParserFactory {
    pub fn create_parser(language: Language) -> Result<Box<dyn LanguageParser>, Box<dyn Error>> {
        match language {
            Language::JavaScript | Language::TypeScript => {
                Ok(Box::new(crate::oxc_parser_adapter::OxcParserAdapter::new()))
            }
            Language::Python => Ok(Box::new(crate::python_parser::PythonParser::new()?)),
            _ => Err(format!("Language {:?} not yet supported", language).into()),
        }
    }

    pub fn create_parser_for_file(
        filename: &str,
    ) -> Result<Box<dyn LanguageParser>, Box<dyn Error>> {
        let language = Language::from_filename(filename)
            .ok_or_else(|| format!("Cannot determine language for file: {}", filename))?;
        Self::create_parser(language)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_language_detection() {
        assert_eq!(Language::from_filename("test.js"), Some(Language::JavaScript));
        assert_eq!(Language::from_filename("test.ts"), Some(Language::TypeScript));
        assert_eq!(Language::from_filename("test.py"), Some(Language::Python));
        assert_eq!(Language::from_filename("test.rs"), Some(Language::Rust));
        assert_eq!(Language::from_filename("test.go"), Some(Language::Go));
        assert_eq!(Language::from_filename("test.txt"), None);
    }

    #[test]
    fn test_case_insensitive_extension() {
        assert_eq!(Language::from_extension("JS"), Some(Language::JavaScript));
        assert_eq!(Language::from_extension("Py"), Some(Language::Python));
    }
}
