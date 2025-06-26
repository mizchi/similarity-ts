use crate::tree::TreeNode;
use std::error::Error;
use std::rc::Rc;
use tree_sitter::{Node, Parser};

pub struct TreeSitterParser {
    js_parser: Parser,
    ts_parser: Parser,
}

impl TreeSitterParser {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        let mut js_parser = Parser::new();
        js_parser.set_language(&tree_sitter_javascript::LANGUAGE.into())?;

        let mut ts_parser = Parser::new();
        ts_parser.set_language(&tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into())?;

        Ok(Self { js_parser, ts_parser })
    }

    pub fn parse(&mut self, source: &str, is_typescript: bool) -> Result<TreeNode, Box<dyn Error>> {
        let parser = if is_typescript { &mut self.ts_parser } else { &mut self.js_parser };

        let tree = parser.parse(source, None).ok_or("Failed to parse source")?;

        let root_node = tree.root_node();
        let mut id_counter = 0;
        Ok(self.convert_node(root_node, source, &mut id_counter))
    }

    fn convert_node(&self, node: Node, source: &str, id_counter: &mut usize) -> TreeNode {
        let current_id = *id_counter;
        *id_counter += 1;

        let label = node.kind().to_string();
        let value = self.get_node_value(node, source);

        let mut tree_node = TreeNode::new(label, value, current_id);

        for child in node.children(&mut node.walk()) {
            let child_node = self.convert_node(child, source, id_counter);
            tree_node.add_child(Rc::new(child_node));
        }

        tree_node
    }

    fn get_node_value(&self, node: Node, source: &str) -> String {
        match node.kind() {
            "identifier" | "string" | "template_string" | "number" | "true" | "false" | "null" => {
                node.utf8_text(source.as_bytes()).unwrap_or("").to_string()
            }
            "function_declaration"
            | "function_expression"
            | "arrow_function"
            | "method_definition" => {
                if let Some(name_node) = node.child_by_field_name("name") {
                    name_node.utf8_text(source.as_bytes()).unwrap_or("anonymous").to_string()
                } else {
                    "anonymous".to_string()
                }
            }
            "class_declaration" | "class_expression" => {
                if let Some(name_node) = node.child_by_field_name("name") {
                    name_node.utf8_text(source.as_bytes()).unwrap_or("AnonymousClass").to_string()
                } else {
                    "AnonymousClass".to_string()
                }
            }
            "interface_declaration" | "type_alias_declaration" => {
                if let Some(name_node) = node.child_by_field_name("name") {
                    name_node.utf8_text(source.as_bytes()).unwrap_or("").to_string()
                } else {
                    "".to_string()
                }
            }
            _ => "".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_javascript_function() {
        let mut parser = TreeSitterParser::new().unwrap();
        let source = "function hello() { return 'world'; }";
        let tree = parser.parse(source, false).unwrap();

        assert_eq!(tree.label, "program");
        assert!(!tree.children.is_empty());
    }

    #[test]
    fn test_parse_typescript_interface() {
        let mut parser = TreeSitterParser::new().unwrap();
        let source = "interface User { name: string; age: number; }";
        let tree = parser.parse(source, true).unwrap();

        assert_eq!(tree.label, "program");
        assert!(!tree.children.is_empty());
    }

    #[test]
    fn test_parse_performance() {
        let mut parser = TreeSitterParser::new().unwrap();
        let source = r#"
            function factorial(n) {
                if (n <= 1) return 1;
                return n * factorial(n - 1);
            }
            
            function fibonacci(n) {
                if (n <= 1) return n;
                return fibonacci(n - 1) + fibonacci(n - 2);
            }
            
            const add = (a, b) => a + b;
            const multiply = (a, b) => a * b;
        "#;

        let start = std::time::Instant::now();
        let tree = parser.parse(source, false).unwrap();
        let duration = start.elapsed();

        println!("Tree-sitter parsing took: {:?}", duration);
        assert!(!tree.children.is_empty());
    }
}
