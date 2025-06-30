use similarity_core::function_extractor::extract_functions;
use similarity_core::language_parser::{
    GenericFunctionDef, GenericTypeDef, Language, LanguageParser,
};
use similarity_core::parser::parse_and_convert_to_tree;
use similarity_core::tree::TreeNode;
use similarity_core::type_extractor::{extract_types_from_code, TypeKind};
use std::error::Error;
use std::rc::Rc;

pub struct TypeScriptParser;

impl TypeScriptParser {
    pub fn new() -> Self {
        Self
    }
}

impl Default for TypeScriptParser {
    fn default() -> Self {
        Self::new()
    }
}

impl LanguageParser for TypeScriptParser {
    fn parse(&mut self, source: &str, filename: &str) -> Result<Rc<TreeNode>, Box<dyn Error + Send + Sync>> {
        parse_and_convert_to_tree(filename, source)
            .map_err(|e| Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                e
            )) as Box<dyn Error + Send + Sync>)
    }

    fn extract_functions(
        &mut self,
        source: &str,
        filename: &str,
    ) -> Result<Vec<GenericFunctionDef>, Box<dyn Error + Send + Sync>> {
        let functions =
            extract_functions(filename, source).map_err(|e| Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                e
            )) as Box<dyn Error + Send + Sync>)?;

        Ok(functions
            .into_iter()
            .map(|f| GenericFunctionDef {
                name: f.name,
                start_line: f.start_line,
                end_line: f.end_line,
                body_start_line: f.body_span.start,
                body_end_line: f.body_span.end,
                parameters: f.parameters,
                is_method: matches!(
                    f.function_type,
                    similarity_core::function_extractor::FunctionType::Method
                ),
                class_name: f.class_name,
                is_async: false,        // TODO: Extract async information from AST
                is_generator: false, // TypeScript/JavaScript doesn't have generators in our current model
                decorators: Vec::new(), // TypeScript/JavaScript doesn't have decorators in our current model
            })
            .collect())
    }

    fn extract_types(
        &mut self,
        source: &str,
        filename: &str,
    ) -> Result<Vec<GenericTypeDef>, Box<dyn Error + Send + Sync>> {
        let types = extract_types_from_code(source, filename)
            .map_err(|e| Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                e
            )) as Box<dyn Error + Send + Sync>)?;

        Ok(types
            .into_iter()
            .map(|t| GenericTypeDef {
                name: t.name,
                kind: match t.kind {
                    TypeKind::Interface => "interface".to_string(),
                    TypeKind::TypeAlias => "type_alias".to_string(),
                    TypeKind::TypeLiteral => "type_literal".to_string(),
                },
                start_line: t.start_line as u32,
                end_line: t.end_line as u32,
                fields: t.properties.into_iter().map(|p| p.name).collect(),
            })
            .collect())
    }

    fn language(&self) -> Language {
        Language::TypeScript
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_typescript_parser_functions() {
        let mut parser = TypeScriptParser::new();
        let source = r#"
function hello(name) {
    return `Hello, ${name}!`;
}

const greet = (name) => {
    console.log(`Hi, ${name}`);
};
"#;

        let functions = parser.extract_functions(source, "test.js").unwrap();
        assert_eq!(functions.len(), 2);
        assert_eq!(functions[0].name, "hello");
        assert_eq!(functions[1].name, "greet");
    }

    #[test]
    fn test_typescript_parser_types() {
        let mut parser = TypeScriptParser::new();
        let source = r#"
interface User {
    name: string;
    age: number;
}

type UserID = string | number;
"#;

        let types = parser.extract_types(source, "test.ts").unwrap();
        assert_eq!(types.len(), 2);
        assert_eq!(types[0].name, "User");
        assert_eq!(types[0].kind, "interface");
        assert_eq!(types[1].name, "UserID");
        assert_eq!(types[1].kind, "type_alias");
    }
}