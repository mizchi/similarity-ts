use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Configuration for a generic tree-sitter based parser
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenericParserConfig {
    /// Language name (e.g., "python", "rust", "javascript")
    pub language: String,
    
    /// Node types that represent functions
    pub function_nodes: Vec<String>,
    
    /// Node types that represent types/classes
    pub type_nodes: Vec<String>,
    
    /// Field mappings for extracting information from nodes
    pub field_mappings: FieldMappings,
    
    /// Node types that should have their text value extracted
    pub value_nodes: Vec<String>,
    
    /// Optional: Patterns to identify test functions
    pub test_patterns: Option<TestPatterns>,
    
    /// Optional: Custom node type mappings
    pub custom_mappings: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldMappings {
    /// Field name for function/method name
    pub name_field: String,
    
    /// Field name for parameters
    pub params_field: String,
    
    /// Field name for function body
    pub body_field: String,
    
    /// Optional: Field name for decorators/attributes
    pub decorator_field: Option<String>,
    
    /// Optional: Field name for parent class
    pub class_field: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestPatterns {
    /// Attribute patterns that indicate test functions
    pub attribute_patterns: Vec<String>,
    
    /// Name prefixes that indicate test functions
    pub name_prefixes: Vec<String>,
    
    /// Name suffixes that indicate test functions
    pub name_suffixes: Vec<String>,
}

impl GenericParserConfig {
    /// Load configuration from a JSON file
    pub fn from_file<P: AsRef<Path>>(path: P) -> std::io::Result<Self> {
        let content = fs::read_to_string(path)?;
        let config = serde_json::from_str(&content)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        Ok(config)
    }
    
    /// Save configuration to a JSON file
    pub fn to_file<P: AsRef<Path>>(&self, path: P) -> std::io::Result<()> {
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        fs::write(path, content)?;
        Ok(())
    }
}

impl Default for GenericParserConfig {
    fn default() -> Self {
        Self {
            language: "unknown".to_string(),
            function_nodes: vec![],
            type_nodes: vec![],
            field_mappings: FieldMappings {
                name_field: "name".to_string(),
                params_field: "parameters".to_string(),
                body_field: "body".to_string(),
                decorator_field: None,
                class_field: None,
            },
            value_nodes: vec!["identifier".to_string(), "string".to_string()],
            test_patterns: None,
            custom_mappings: None,
        }
    }
}

/// Example configurations for common languages
impl GenericParserConfig {
    pub fn python() -> Self {
        Self {
            language: "python".to_string(),
            function_nodes: vec!["function_definition".to_string()],
            type_nodes: vec!["class_definition".to_string()],
            field_mappings: FieldMappings {
                name_field: "name".to_string(),
                params_field: "parameters".to_string(),
                body_field: "body".to_string(),
                decorator_field: Some("decorator".to_string()),
                class_field: Some("class".to_string()),
            },
            value_nodes: vec![
                "identifier".to_string(),
                "string".to_string(),
                "integer".to_string(),
                "float".to_string(),
                "true".to_string(),
                "false".to_string(),
                "none".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec!["pytest".to_string(), "unittest".to_string()],
                name_prefixes: vec!["test_".to_string()],
                name_suffixes: vec!["_test".to_string()],
            }),
            custom_mappings: None,
        }
    }
    
    pub fn rust() -> Self {
        Self {
            language: "rust".to_string(),
            function_nodes: vec!["function_item".to_string()],
            type_nodes: vec!["struct_item".to_string(), "impl_item".to_string()],
            field_mappings: FieldMappings {
                name_field: "name".to_string(),
                params_field: "parameters".to_string(),
                body_field: "body".to_string(),
                decorator_field: Some("attribute_item".to_string()),
                class_field: None,
            },
            value_nodes: vec![
                "identifier".to_string(),
                "string_literal".to_string(),
                "integer_literal".to_string(),
                "float_literal".to_string(),
                "boolean_literal".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec!["#[test]".to_string(), "#[cfg(test)]".to_string()],
                name_prefixes: vec!["test_".to_string()],
                name_suffixes: vec![],
            }),
            custom_mappings: None,
        }
    }
    
    pub fn javascript() -> Self {
        Self {
            language: "javascript".to_string(),
            function_nodes: vec![
                "function_declaration".to_string(),
                "arrow_function".to_string(),
                "function_expression".to_string(),
                "method_definition".to_string(),
            ],
            type_nodes: vec!["class_declaration".to_string()],
            field_mappings: FieldMappings {
                name_field: "name".to_string(),
                params_field: "parameters".to_string(),
                body_field: "body".to_string(),
                decorator_field: None,
                class_field: None,
            },
            value_nodes: vec![
                "identifier".to_string(),
                "string".to_string(),
                "number".to_string(),
                "true".to_string(),
                "false".to_string(),
                "null".to_string(),
                "undefined".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec![],
                name_prefixes: vec!["test".to_string()],
                name_suffixes: vec![".test".to_string(), ".spec".to_string()],
            }),
            custom_mappings: None,
        }
    }
    
    pub fn go() -> Self {
        Self {
            language: "go".to_string(),
            function_nodes: vec![
                "function_declaration".to_string(),
                "method_declaration".to_string(),
            ],
            type_nodes: vec![
                "type_declaration".to_string(),
                "struct_type".to_string(),
                "interface_type".to_string(),
            ],
            field_mappings: FieldMappings {
                name_field: "name".to_string(),
                params_field: "parameters".to_string(),
                body_field: "body".to_string(),
                decorator_field: None,
                class_field: None,
            },
            value_nodes: vec![
                "identifier".to_string(),
                "interpreted_string_literal".to_string(),
                "raw_string_literal".to_string(),
                "int_literal".to_string(),
                "float_literal".to_string(),
                "true".to_string(),
                "false".to_string(),
                "nil".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec![],
                name_prefixes: vec!["Test".to_string(), "Benchmark".to_string()],
                name_suffixes: vec!["_test".to_string()],
            }),
            custom_mappings: None,
        }
    }
    
    pub fn java() -> Self {
        Self {
            language: "java".to_string(),
            function_nodes: vec![
                "method_declaration".to_string(),
                "constructor_declaration".to_string(),
            ],
            type_nodes: vec![
                "class_declaration".to_string(),
                "interface_declaration".to_string(),
                "enum_declaration".to_string(),
            ],
            field_mappings: FieldMappings {
                name_field: "name".to_string(),
                params_field: "parameters".to_string(),
                body_field: "body".to_string(),
                decorator_field: Some("annotation".to_string()),
                class_field: None,
            },
            value_nodes: vec![
                "identifier".to_string(),
                "string_literal".to_string(),
                "integer_literal".to_string(),
                "floating_point_literal".to_string(),
                "true".to_string(),
                "false".to_string(),
                "null_literal".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec!["@Test".to_string(), "@ParameterizedTest".to_string()],
                name_prefixes: vec!["test".to_string()],
                name_suffixes: vec!["Test".to_string()],
            }),
            custom_mappings: None,
        }
    }
    
    pub fn c() -> Self {
        Self {
            language: "c".to_string(),
            function_nodes: vec!["function_definition".to_string()],
            type_nodes: vec![
                "struct_specifier".to_string(),
                "enum_specifier".to_string(),
                "type_definition".to_string(),
            ],
            field_mappings: FieldMappings {
                name_field: "declarator".to_string(),
                params_field: "declarator".to_string(),
                body_field: "body".to_string(),
                decorator_field: None,
                class_field: None,
            },
            value_nodes: vec![
                "identifier".to_string(),
                "string_literal".to_string(),
                "number_literal".to_string(),
                "true".to_string(),
                "false".to_string(),
                "null".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec![],
                name_prefixes: vec!["test_".to_string()],
                name_suffixes: vec!["_test".to_string()],
            }),
            custom_mappings: None,
        }
    }
    
    pub fn cpp() -> Self {
        Self {
            language: "cpp".to_string(),
            function_nodes: vec![
                "function_definition".to_string(),
                "lambda_expression".to_string(),
            ],
            type_nodes: vec![
                "class_specifier".to_string(),
                "struct_specifier".to_string(),
                "enum_specifier".to_string(),
            ],
            field_mappings: FieldMappings {
                name_field: "declarator".to_string(),
                params_field: "declarator".to_string(),
                body_field: "body".to_string(),
                decorator_field: None,
                class_field: None,
            },
            value_nodes: vec![
                "identifier".to_string(),
                "string_literal".to_string(),
                "number_literal".to_string(),
                "true".to_string(),
                "false".to_string(),
                "nullptr".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec![],
                name_prefixes: vec!["test_".to_string(), "Test".to_string()],
                name_suffixes: vec!["_test".to_string(), "Test".to_string()],
            }),
            custom_mappings: None,
        }
    }
    
    pub fn csharp() -> Self {
        Self {
            language: "csharp".to_string(),
            function_nodes: vec![
                "method_declaration".to_string(),
                "constructor_declaration".to_string(),
                "lambda_expression".to_string(),
            ],
            type_nodes: vec![
                "class_declaration".to_string(),
                "interface_declaration".to_string(),
                "struct_declaration".to_string(),
                "enum_declaration".to_string(),
            ],
            field_mappings: FieldMappings {
                name_field: "name".to_string(),
                params_field: "parameters".to_string(),
                body_field: "body".to_string(),
                decorator_field: Some("attribute".to_string()),
                class_field: None,
            },
            value_nodes: vec![
                "identifier".to_string(),
                "string_literal".to_string(),
                "integer_literal".to_string(),
                "real_literal".to_string(),
                "true".to_string(),
                "false".to_string(),
                "null_literal".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec!["[Test]".to_string(), "[TestMethod]".to_string(), "[Fact]".to_string()],
                name_prefixes: vec!["Test".to_string()],
                name_suffixes: vec!["Test".to_string(), "Tests".to_string()],
            }),
            custom_mappings: None,
        }
    }
    
    pub fn ruby() -> Self {
        Self {
            language: "ruby".to_string(),
            function_nodes: vec![
                "method".to_string(),
                "singleton_method".to_string(),
            ],
            type_nodes: vec![
                "class".to_string(),
                "module".to_string(),
            ],
            field_mappings: FieldMappings {
                name_field: "name".to_string(),
                params_field: "parameters".to_string(),
                body_field: "body".to_string(),
                decorator_field: None,
                class_field: None,
            },
            value_nodes: vec![
                "identifier".to_string(),
                "string".to_string(),
                "integer".to_string(),
                "float".to_string(),
                "true".to_string(),
                "false".to_string(),
                "nil".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec![],
                name_prefixes: vec!["test_".to_string()],
                name_suffixes: vec!["_test".to_string(), "_spec".to_string()],
            }),
            custom_mappings: None,
        }
    }
    
    pub fn php() -> Self {
        Self {
            language: "php".to_string(),
            function_nodes: vec![
                "function_definition".to_string(),
                "method_declaration".to_string(),
            ],
            type_nodes: vec![
                "class_declaration".to_string(),
                "interface_declaration".to_string(),
                "trait_declaration".to_string(),
            ],
            field_mappings: FieldMappings {
                name_field: "name".to_string(),
                params_field: "parameters".to_string(),
                body_field: "body".to_string(),
                decorator_field: Some("attribute_list".to_string()),
                class_field: None,
            },
            value_nodes: vec![
                "name".to_string(),
                "string".to_string(),
                "integer".to_string(),
                "float".to_string(),
                "true".to_string(),
                "false".to_string(),
                "null".to_string(),
            ],
            test_patterns: Some(TestPatterns {
                attribute_patterns: vec!["@test".to_string(), "@Test".to_string()],
                name_prefixes: vec!["test".to_string()],
                name_suffixes: vec!["Test".to_string()],
            }),
            custom_mappings: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_config_serialization() {
        let config = GenericParserConfig::python();
        let json = serde_json::to_string_pretty(&config).unwrap();
        let deserialized: GenericParserConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config.language, deserialized.language);
    }
    
    #[test]
    fn test_config_examples() {
        let python_config = GenericParserConfig::python();
        assert_eq!(python_config.language, "python");
        assert!(python_config.function_nodes.contains(&"function_definition".to_string()));
        
        let rust_config = GenericParserConfig::rust();
        assert_eq!(rust_config.language, "rust");
        assert!(rust_config.function_nodes.contains(&"function_item".to_string()));
        
        let js_config = GenericParserConfig::javascript();
        assert_eq!(js_config.language, "javascript");
        assert!(js_config.function_nodes.contains(&"arrow_function".to_string()));
    }
}