use crate::function_extractor::FunctionDefinition;
use crate::tree_sitter_parser::TreeSitterParser;
use std::error::Error;
use tree_sitter::{Node, Parser, Query, QueryCursor};

pub struct TreeSitterFunctionExtractor {
    js_parser: Parser,
    ts_parser: Parser,
    js_function_query: Query,
    ts_function_query: Query,
}

impl TreeSitterFunctionExtractor {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        let mut js_parser = Parser::new();
        js_parser.set_language(&tree_sitter_javascript::LANGUAGE.into())?;
        
        let mut ts_parser = Parser::new();
        ts_parser.set_language(&tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into())?;
        
        // Query for JavaScript functions
        let js_function_query = Query::new(
            &tree_sitter_javascript::LANGUAGE.into(),
            r#"
            [
                (function_declaration
                    name: (identifier) @name
                    parameters: (formal_parameters) @params
                    body: (statement_block) @body
                ) @function
                
                (variable_declarator
                    name: (identifier) @name
                    value: (arrow_function
                        parameters: (formal_parameters) @params
                        body: (_) @body
                    )
                ) @function
                
                (variable_declarator
                    name: (identifier) @name
                    value: (function_expression
                        parameters: (formal_parameters) @params
                        body: (statement_block) @body
                    )
                ) @function
                
                (method_definition
                    name: (property_identifier) @name
                    parameters: (formal_parameters) @params
                    body: (statement_block) @body
                ) @function
            ]
            "#,
        )?;
        
        // Query for TypeScript functions (includes all JS patterns plus type annotations)
        let ts_function_query = Query::new(
            &tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into(),
            r#"
            [
                (function_declaration
                    name: (identifier) @name
                    parameters: (formal_parameters) @params
                    body: (statement_block) @body
                ) @function
                
                (variable_declarator
                    name: (identifier) @name
                    value: (arrow_function
                        parameters: (formal_parameters) @params
                        body: (_) @body
                    )
                ) @function
                
                (variable_declarator
                    name: (identifier) @name
                    value: (function_expression
                        parameters: (formal_parameters) @params
                        body: (statement_block) @body
                    )
                ) @function
                
                (method_definition
                    name: (property_identifier) @name
                    parameters: (formal_parameters) @params
                    body: (statement_block) @body
                ) @function
            ]
            "#,
        )?;
        
        Ok(Self {
            js_parser,
            ts_parser,
            js_function_query,
            ts_function_query,
        })
    }
    
    pub fn extract_functions(
        &mut self,
        filename: &str,
        source: &str,
        is_typescript: bool,
    ) -> Result<Vec<FunctionDefinition>, Box<dyn Error>> {
        let (parser, query) = if is_typescript {
            (&mut self.ts_parser, &self.ts_function_query)
        } else {
            (&mut self.js_parser, &self.js_function_query)
        };
        
        let tree = parser
            .parse(source, None)
            .ok_or("Failed to parse source")?;
        
        let root_node = tree.root_node();
        let mut cursor = QueryCursor::new();
        let matches = cursor.matches(query, root_node, source.as_bytes());
        
        let mut functions = Vec::new();
        
        for match_ in matches.into_iter() {
            let mut name = None;
            let mut params = None;
            let mut body = None;
            let mut function_node = None;
            
            for capture in match_.captures {
                match query.capture_names()[capture.index as usize] {
                    "name" => name = Some(capture.node),
                    "params" => params = Some(capture.node),
                    "body" => body = Some(capture.node),
                    "function" => function_node = Some(capture.node),
                    _ => {}
                }
            }
            
            if let (Some(name_node), Some(body_node), Some(fn_node)) = (name, body, function_node) {
                let name = name_node.utf8_text(source.as_bytes())?.to_string();
                let body_text = body_node.utf8_text(source.as_bytes())?.to_string();
                
                // Calculate line numbers
                let start_line = fn_node.start_position().row + 1;
                let end_line = fn_node.end_position().row + 1;
                let body_start_line = body_node.start_position().row + 1;
                let body_end_line = body_node.end_position().row + 1;
                
                functions.push(FunctionDefinition {
                    name,
                    params: self.extract_params(params, source)?,
                    body: body_text,
                    start_line,
                    end_line,
                    body_start_line,
                    body_end_line,
                    filename: filename.to_string(),
                    function_type: self.determine_function_type(fn_node),
                });
            }
        }
        
        Ok(functions)
    }
    
    fn extract_params(&self, params_node: Option<Node>, source: &str) -> Result<Vec<String>, Box<dyn Error>> {
        if let Some(node) = params_node {
            let mut params = Vec::new();
            let mut cursor = node.walk();
            
            for child in node.children(&mut cursor) {
                if child.kind() == "identifier" || child.kind() == "required_parameter" {
                    if let Ok(param_text) = child.utf8_text(source.as_bytes()) {
                        params.push(param_text.to_string());
                    }
                }
            }
            
            Ok(params)
        } else {
            Ok(Vec::new())
        }
    }
    
    fn determine_function_type(&self, node: Node) -> crate::function_extractor::FunctionType {
        match node.kind() {
            "function_declaration" => crate::function_extractor::FunctionType::Function,
            "method_definition" => crate::function_extractor::FunctionType::Method,
            "variable_declarator" => {
                // Check if it's an arrow function or function expression
                crate::function_extractor::FunctionType::Arrow
            }
            _ => crate::function_extractor::FunctionType::Function,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_javascript_functions() {
        let mut extractor = TreeSitterFunctionExtractor::new().unwrap();
        let source = r#"
function hello(name) {
    return `Hello, ${name}!`;
}

const greet = (name) => {
    console.log(`Hi, ${name}`);
};

class Greeter {
    sayHello(name) {
        return `Hello from class, ${name}!`;
    }
}
"#;
        
        let functions = extractor
            .extract_functions("test.js", source, false)
            .unwrap();
        
        assert_eq!(functions.len(), 3);
        assert_eq!(functions[0].name, "hello");
        assert_eq!(functions[1].name, "greet");
        assert_eq!(functions[2].name, "sayHello");
    }
    
    #[test]
    fn test_extract_typescript_functions() {
        let mut extractor = TreeSitterFunctionExtractor::new().unwrap();
        let source = r#"
function add(a: number, b: number): number {
    return a + b;
}

const multiply = (x: number, y: number): number => x * y;

interface Calculator {
    calculate(a: number, b: number): number;
}

class BasicCalculator implements Calculator {
    calculate(a: number, b: number): number {
        return a + b;
    }
}
"#;
        
        let functions = extractor
            .extract_functions("test.ts", source, true)
            .unwrap();
        
        assert_eq!(functions.len(), 3);
        assert_eq!(functions[0].name, "add");
        assert_eq!(functions[1].name, "multiply");
        assert_eq!(functions[2].name, "calculate");
    }
}
