use crate::generic_parser_config::GenericParserConfig;
use crate::language_parser::{GenericFunctionDef, GenericTypeDef, Language, LanguageParser};
use crate::tree::TreeNode;
use std::error::Error;
use std::rc::Rc;
use tree_sitter::{Node, Parser};

pub struct GenericTreeSitterParser {
    parser: Parser,
    config: GenericParserConfig,
}

impl GenericTreeSitterParser {
    /// Create a new generic parser with the given tree-sitter language and configuration
    pub fn new(
        language: tree_sitter::Language,
        config: GenericParserConfig,
    ) -> Result<Self, Box<dyn Error + Send + Sync>> {
        let mut parser = Parser::new();
        parser.set_language(&language)
            .map_err(|e| Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to set language: {:?}", e)
            )) as Box<dyn Error + Send + Sync>)?;
        
        Ok(Self { parser, config })
    }
    
    /// Create from a pre-configured language
    pub fn from_language_name(language_name: &str) -> Result<Self, Box<dyn Error + Send + Sync>> {
        let (language, config) = match language_name {
            "go" => (
                tree_sitter_go::LANGUAGE.into(),
                GenericParserConfig::go(),
            ),
            "java" => (
                tree_sitter_java::LANGUAGE.into(),
                GenericParserConfig::java(),
            ),
            "c" => (
                tree_sitter_c::LANGUAGE.into(),
                GenericParserConfig::c(),
            ),
            "cpp" | "c++" => (
                tree_sitter_cpp::LANGUAGE.into(),
                GenericParserConfig::cpp(),
            ),
            "csharp" | "cs" => (
                tree_sitter_c_sharp::LANGUAGE.into(),
                GenericParserConfig::csharp(),
            ),
            "ruby" | "rb" => (
                tree_sitter_ruby::LANGUAGE.into(),
                GenericParserConfig::ruby(),
            ),
            _ => return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("Unsupported language: {}", language_name)
            )) as Box<dyn Error + Send + Sync>),
        };
        
        Self::new(language, config)
    }
    
    fn convert_node(&self, node: Node, source: &str, id_counter: &mut usize) -> TreeNode {
        let current_id = *id_counter;
        *id_counter += 1;
        
        let label = node.kind().to_string();
        let value = if self.config.value_nodes.contains(&node.kind().to_string()) {
            node.utf8_text(source.as_bytes()).unwrap_or("").to_string()
        } else {
            "".to_string()
        };
        
        let mut tree_node = TreeNode::new(label, value, current_id);
        
        for child in node.children(&mut node.walk()) {
            let child_node = self.convert_node(child, source, id_counter);
            tree_node.add_child(Rc::new(child_node));
        }
        
        tree_node
    }
    
    fn extract_functions_from_node(
        &self,
        node: Node,
        source: &str,
        functions: &mut Vec<GenericFunctionDef>,
        class_name: Option<&str>,
    ) {
        let node_kind = node.kind();
        
        // Check if this is a function node
        if self.config.function_nodes.contains(&node_kind.to_string()) {
            if let Some(func_def) = self.extract_function_definition(node, source, class_name) {
                functions.push(func_def);
            }
        }
        
        // Check if this is a type/class node
        if self.config.type_nodes.contains(&node_kind.to_string()) {
            // Extract class name for nested functions
            let new_class_name = node
                .child_by_field_name(&self.config.field_mappings.name_field)
                .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                .unwrap_or("");
            
            // Recursively extract methods from class
            for child in node.children(&mut node.walk()) {
                self.extract_functions_from_node(child, source, functions, Some(new_class_name));
            }
        } else {
            // Continue searching in children
            for child in node.children(&mut node.walk()) {
                self.extract_functions_from_node(child, source, functions, class_name);
            }
        }
    }
    
    fn extract_function_definition(
        &self,
        node: Node,
        source: &str,
        class_name: Option<&str>,
    ) -> Option<GenericFunctionDef> {
        let name_node = node.child_by_field_name(&self.config.field_mappings.name_field)?;
        let name = name_node.utf8_text(source.as_bytes()).ok()?;
        
        let params_node = node.child_by_field_name(&self.config.field_mappings.params_field);
        let body_node = node.child_by_field_name(&self.config.field_mappings.body_field);
        
        let params = self.extract_parameters(params_node, source);
        let decorators = self.extract_decorators(node, source);
        let is_async = self.is_async_function(node, source);
        let is_generator = self.is_generator_function(node, source);
        
        Some(GenericFunctionDef {
            name: name.to_string(),
            start_line: node.start_position().row as u32 + 1,
            end_line: node.end_position().row as u32 + 1,
            body_start_line: body_node
                .map(|n| n.start_position().row as u32 + 1)
                .unwrap_or(0),
            body_end_line: body_node
                .map(|n| n.end_position().row as u32 + 1)
                .unwrap_or(0),
            parameters: params,
            is_method: class_name.is_some(),
            class_name: class_name.map(String::from),
            is_async,
            is_generator,
            decorators,
        })
    }
    
    fn extract_parameters(&self, params_node: Option<Node>, source: &str) -> Vec<String> {
        let Some(node) = params_node else {
            return Vec::new();
        };
        
        let mut params = Vec::new();
        let mut cursor = node.walk();
        
        for child in node.children(&mut cursor) {
            if self.config.value_nodes.contains(&child.kind().to_string()) {
                if let Ok(param_text) = child.utf8_text(source.as_bytes()) {
                    params.push(param_text.to_string());
                }
            } else if let Some(name_child) = child.child_by_field_name(&self.config.field_mappings.name_field) {
                if let Ok(param_text) = name_child.utf8_text(source.as_bytes()) {
                    params.push(param_text.to_string());
                }
            }
        }
        
        params
    }
    
    fn extract_decorators(&self, node: Node, source: &str) -> Vec<String> {
        let mut decorators = Vec::new();
        
        if let Some(decorator_field) = &self.config.field_mappings.decorator_field {
            // Look for decorator nodes
            if let Some(parent) = node.parent() {
                let mut cursor = parent.walk();
                for child in parent.children(&mut cursor) {
                    if child.kind() == decorator_field && child.end_position().row < node.start_position().row {
                        if let Ok(decorator_text) = child.utf8_text(source.as_bytes()) {
                            decorators.push(decorator_text.trim_start_matches('@').to_string());
                        }
                    }
                }
            }
        }
        
        decorators
    }
    
    fn is_async_function(&self, node: Node, source: &str) -> bool {
        // Check if the function definition contains async keyword
        if let Ok(text) = node.utf8_text(source.as_bytes()) {
            return text.starts_with("async ");
        }
        false
    }
    
    fn is_generator_function(&self, node: Node, source: &str) -> bool {
        // Check if function body contains yield
        if let Some(body) = node.child_by_field_name(&self.config.field_mappings.body_field) {
            if let Ok(body_text) = body.utf8_text(source.as_bytes()) {
                return body_text.contains("yield");
            }
        }
        false
    }
    
    fn extract_types_from_node(
        &self,
        node: Node,
        source: &str,
        types: &mut Vec<GenericTypeDef>,
    ) {
        let node_kind = node.kind();
        
        // Check if this is a type node
        if self.config.type_nodes.contains(&node_kind.to_string()) {
            if let Some(type_def) = self.extract_type_definition(node, source) {
                types.push(type_def);
            }
        }
        
        // Continue searching in children
        for child in node.children(&mut node.walk()) {
            self.extract_types_from_node(child, source, types);
        }
    }
    
    fn extract_type_definition(&self, node: Node, source: &str) -> Option<GenericTypeDef> {
        let name_node = node.child_by_field_name(&self.config.field_mappings.name_field)?;
        let name = name_node.utf8_text(source.as_bytes()).ok()?;
        
        Some(GenericTypeDef {
            name: name.to_string(),
            kind: node.kind().to_string(),
            start_line: node.start_position().row as u32 + 1,
            end_line: node.end_position().row as u32 + 1,
            fields: Vec::new(), // TODO: Extract fields based on language
        })
    }
}

impl LanguageParser for GenericTreeSitterParser {
    fn parse(&mut self, source: &str, _filename: &str) -> Result<Rc<TreeNode>, Box<dyn Error + Send + Sync>> {
        let tree = self
            .parser
            .parse(source, None)
            .ok_or_else(|| Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Failed to parse source"
            )) as Box<dyn Error + Send + Sync>)?;
        
        let root_node = tree.root_node();
        let mut id_counter = 0;
        Ok(Rc::new(self.convert_node(root_node, source, &mut id_counter)))
    }
    
    fn extract_functions(
        &mut self,
        source: &str,
        _filename: &str,
    ) -> Result<Vec<GenericFunctionDef>, Box<dyn Error + Send + Sync>> {
        let tree = self
            .parser
            .parse(source, None)
            .ok_or_else(|| Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Failed to parse source"
            )) as Box<dyn Error + Send + Sync>)?;
        
        let root_node = tree.root_node();
        let mut functions = Vec::new();
        self.extract_functions_from_node(root_node, source, &mut functions, None);
        Ok(functions)
    }
    
    fn extract_types(
        &mut self,
        source: &str,
        _filename: &str,
    ) -> Result<Vec<GenericTypeDef>, Box<dyn Error + Send + Sync>> {
        let tree = self
            .parser
            .parse(source, None)
            .ok_or_else(|| Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Failed to parse source"
            )) as Box<dyn Error + Send + Sync>)?;
        
        let root_node = tree.root_node();
        let mut types = Vec::new();
        self.extract_types_from_node(root_node, source, &mut types);
        Ok(types)
    }
    
    fn language(&self) -> Language {
        match self.config.language.as_str() {
            "python" => Language::Python,
            "rust" => Language::Rust,
            "javascript" | "typescript" => Language::TypeScript,
            "go" => Language::Go,
            "java" => Language::Java,
            "c" => Language::C,
            "cpp" => Language::Cpp,
            "csharp" => Language::CSharp,
            "ruby" => Language::Ruby,
            "php" => Language::Php,
            _ => Language::Unknown,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_generic_parser_with_python() {
        let mut parser = GenericTreeSitterParser::from_language_name("python").unwrap();
        
        let source = r#"
def hello(name):
    return f"Hello, {name}!"

class Greeter:
    def greet(self, name):
        return f"Hi, {name}!"
"#;
        
        let functions = parser.extract_functions(source, "test.py").unwrap();
        assert_eq!(functions.len(), 2);
        assert_eq!(functions[0].name, "hello");
        assert_eq!(functions[1].name, "greet");
        assert!(functions[1].is_method);
    }
    
    #[test]
    fn test_generic_parser_with_rust() {
        let mut parser = GenericTreeSitterParser::from_language_name("rust").unwrap();
        
        let source = r#"
fn add(a: i32, b: i32) -> i32 {
    a + b
}

impl Calculator {
    fn multiply(&self, x: i32, y: i32) -> i32 {
        x * y
    }
}
"#;
        
        let functions = parser.extract_functions(source, "test.rs").unwrap();
        assert_eq!(functions.len(), 2);
        assert_eq!(functions[0].name, "add");
        assert_eq!(functions[1].name, "multiply");
    }
}