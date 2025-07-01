use similarity_core::language_parser::{
    GenericFunctionDef, GenericTypeDef, Language, LanguageParser,
};
use similarity_core::tree::TreeNode;
use std::error::Error;
use std::rc::Rc;
use tree_sitter::{Node, Parser};

pub struct ElixirParser {
    parser: Parser,
}

impl ElixirParser {
    pub fn new() -> Result<Self, Box<dyn Error + Send + Sync>> {
        let mut parser = Parser::new();
        parser
            .set_language(&tree_sitter_elixir::LANGUAGE.into())
            .map_err(|e| format!("Failed to set Elixir language: {e:?}"))?;
        Ok(Self { parser })
    }

    fn extract_functions_from_node(
        &self,
        node: Node,
        source: &str,
        functions: &mut Vec<GenericFunctionDef>,
        module_name: Option<&str>,
    ) {
        let node_kind = node.kind();

        // Check if this is a call node that could be a function or module
        if node_kind == "call" {
            if let Some(target_node) = node.child_by_field_name("target") {
                if let Ok(target_text) = target_node.utf8_text(source.as_bytes()) {
                    match target_text {
                        // Function definitions
                        "def" | "defp" | "defmacro" | "defmacrop" => {
                            if let Some(func_def) =
                                self.extract_function_definition(node, source, module_name)
                            {
                                functions.push(func_def);
                            }
                            return; // Don't traverse children
                        }
                        // Module definitions
                        "defmodule" | "defprotocol" | "defimpl" => {
                            // Extract module name
                            let new_module_name = node
                                .child_by_field_name("arguments")
                                .and_then(|args| args.child(0))
                                .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                                .unwrap_or("");

                            // Process do_block
                            let do_block = node.child(2).filter(|n| n.kind() == "do_block");
                            if let Some(do_block) = do_block {
                                for child in do_block.children(&mut do_block.walk()) {
                                    self.extract_functions_from_node(
                                        child,
                                        source,
                                        functions,
                                        Some(new_module_name),
                                    );
                                }
                            }
                            return; // Don't traverse children normally
                        }
                        _ => {} // Continue normal traversal
                    }
                }
            }
        }

        // Continue searching in children
        for child in node.children(&mut node.walk()) {
            self.extract_functions_from_node(child, source, functions, module_name);
        }
    }

    fn extract_function_definition(
        &self,
        node: Node,
        source: &str,
        module_name: Option<&str>,
    ) -> Option<GenericFunctionDef> {
        // Extract function name from arguments -> first call -> target
        let name_string = node
            .child(1)
            .filter(|n| n.kind() == "arguments")
            .and_then(|args| args.child(0))
            .and_then(|call_node| {
                if call_node.kind() == "call" {
                    call_node.child_by_field_name("target")
                } else {
                    None
                }
            })
            .and_then(|n| n.utf8_text(source.as_bytes()).ok())
            .map(String::from)?;

        // Extract parameters
        let params_node = node
            .child(1)
            .filter(|n| n.kind() == "arguments")
            .and_then(|args| args.child(0))
            .and_then(|call_node| {
                if call_node.kind() == "call" {
                    call_node.child(1).filter(|n| n.kind() == "arguments")
                } else {
                    None
                }
            });

        // Extract do_block (may not exist for one-liner functions)
        let body_node = node.child(2).filter(|n| n.kind() == "do_block");

        let params = self.extract_parameters(params_node, source);

        Some(GenericFunctionDef {
            name: name_string,
            start_line: node.start_position().row as u32 + 1,
            end_line: node.end_position().row as u32 + 1,
            body_start_line: body_node.map(|n| n.start_position().row as u32 + 1).unwrap_or(0),
            body_end_line: body_node.map(|n| n.end_position().row as u32 + 1).unwrap_or(0),
            parameters: params,
            is_method: module_name.is_some(),
            class_name: module_name.map(String::from),
            is_async: false,
            is_generator: false,
            decorators: Vec::new(),
        })
    }

    fn extract_parameters(&self, params_node: Option<Node>, source: &str) -> Vec<String> {
        let Some(node) = params_node else {
            return Vec::new();
        };

        let mut params = Vec::new();
        for child in node.children(&mut node.walk()) {
            if child.kind() == "identifier" {
                if let Ok(param_text) = child.utf8_text(source.as_bytes()) {
                    params.push(param_text.to_string());
                }
            }
        }
        params
    }

    fn build_tree_from_node(&self, node: Node, source: &str, id: &mut usize) -> TreeNode {
        let label = node.kind().to_string();
        let value = if node.child_count() == 0 {
            node.utf8_text(source.as_bytes()).ok().unwrap_or_default().to_string()
        } else {
            String::new()
        };

        let current_id = *id;
        *id += 1;

        let mut tree_node = TreeNode::new(label, value, current_id);

        for child in node.children(&mut node.walk()) {
            let child_node = self.build_tree_from_node(child, source, id);
            tree_node.add_child(Rc::new(child_node));
        }

        tree_node
    }
}

impl LanguageParser for ElixirParser {
    fn language(&self) -> Language {
        Language::Unknown // TODO: Add Language::Elixir to core
    }

    fn parse(
        &mut self,
        source: &str,
        _path: &str,
    ) -> Result<Rc<TreeNode>, Box<dyn Error + Send + Sync>> {
        let tree = self.parser.parse(source, None).ok_or("Failed to parse Elixir code")?;
        let mut id = 0;
        Ok(Rc::new(self.build_tree_from_node(tree.root_node(), source, &mut id)))
    }

    fn extract_functions(
        &mut self,
        source: &str,
        _path: &str,
    ) -> Result<Vec<GenericFunctionDef>, Box<dyn Error + Send + Sync>> {
        let tree = self.parser.parse(source, None).ok_or("Failed to parse Elixir code")?;

        let mut functions = Vec::new();
        self.extract_functions_from_node(tree.root_node(), source, &mut functions, None);
        Ok(functions)
    }

    fn extract_types(
        &mut self,
        source: &str,
        _path: &str,
    ) -> Result<Vec<GenericTypeDef>, Box<dyn Error + Send + Sync>> {
        let tree = self.parser.parse(source, None).ok_or("Failed to parse Elixir code")?;

        let mut types = Vec::new();
        self.extract_types_from_node(tree.root_node(), source, &mut types);
        Ok(types)
    }
}

impl ElixirParser {
    fn extract_types_from_node(&self, node: Node, source: &str, types: &mut Vec<GenericTypeDef>) {
        if node.kind() == "call" {
            if let Some(target_node) = node.child_by_field_name("target") {
                if let Ok(target_text) = target_node.utf8_text(source.as_bytes()) {
                    if matches!(target_text, "defmodule" | "defprotocol" | "defimpl") {
                        // Extract type name
                        let name = node
                            .child_by_field_name("arguments")
                            .and_then(|args| args.child(0))
                            .and_then(|n| n.utf8_text(source.as_bytes()).ok())
                            .unwrap_or("");

                        types.push(GenericTypeDef {
                            name: name.to_string(),
                            start_line: node.start_position().row as u32 + 1,
                            end_line: node.end_position().row as u32 + 1,
                            kind: match target_text {
                                "defmodule" => "module",
                                "defprotocol" => "protocol",
                                "defimpl" => "implementation",
                                _ => "unknown",
                            }
                            .to_string(),
                            fields: Vec::new(),
                        });
                    }
                }
            }
        }

        // Continue searching in children
        for child in node.children(&mut node.walk()) {
            self.extract_types_from_node(child, source, types);
        }
    }
}
