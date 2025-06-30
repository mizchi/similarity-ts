use anyhow::Result;
use clap::Parser;
use similarity_core::generic_parser_config::GenericParserConfig;
use similarity_core::generic_tree_sitter_parser::GenericTreeSitterParser;
use similarity_core::language_parser::LanguageParser;
use similarity_core::tsed::{calculate_tsed, TSEDOptions};
use similarity_core::APTEDOptions;
use similarity_core::ast_exchange::{ASTExchange, ExchangeFunctionDef, SerializableTreeNode};
use similarity_core::tree::TreeNode;
use std::fs;
use std::path::PathBuf;
use std::rc::Rc;
use std::io::{self, Read};

#[derive(Parser)]
#[command(name = "similarity-generic")]
#[command(about = "Generic code similarity analyzer using tree-sitter")]
struct Cli {
    /// Path to analyze (or '-' for stdin when using --ast-input)
    path: PathBuf,
    
    /// Language configuration file (JSON)
    #[arg(short, long, required_unless_present_any = ["language", "ast_input"])]
    config: Option<PathBuf>,
    
    /// Language name (if using built-in config)
    #[arg(short, long)]
    language: Option<String>,
    
    /// Similarity threshold (0.0-1.0)
    #[arg(short, long, default_value = "0.85")]
    threshold: f64,
    
    /// Show extracted functions
    #[arg(long)]
    show_functions: bool,
    
    /// Read pre-parsed AST from file (JSON format, or '-' for stdin)
    #[arg(long)]
    ast_input: Option<PathBuf>,
    
    /// Output AST to file (JSON format, or '-' for stdout)
    #[arg(long)]
    ast_output: Option<PathBuf>,
}

fn read_ast_exchange(path: &PathBuf) -> Result<ASTExchange> {
    let content = if path.to_str() == Some("-") {
        let mut buffer = String::new();
        io::stdin().read_to_string(&mut buffer)?;
        buffer
    } else {
        fs::read_to_string(path)?
    };
    
    serde_json::from_str(&content)
        .map_err(|e| anyhow::anyhow!("Failed to parse AST JSON: {}", e))
}

fn write_ast_exchange(ast: &ASTExchange, path: &PathBuf) -> Result<()> {
    let json = serde_json::to_string_pretty(ast)?;
    
    if path.to_str() == Some("-") {
        println!("{}", json);
    } else {
        fs::write(path, json)?;
    }
    
    Ok(())
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // If reading pre-parsed AST
    if let Some(ast_input_path) = &cli.ast_input {
        let ast_exchange = read_ast_exchange(ast_input_path)?;
        
        println!("Loaded AST for {} with {} functions", 
            ast_exchange.filename, 
            ast_exchange.functions.len()
        );
        
        if cli.show_functions {
            println!("Functions:");
            for func in &ast_exchange.functions {
                println!("  {} lines {}-{}", func.name, func.start_line, func.end_line);
            }
            println!();
        }
        
        // Compare functions from AST
        if ast_exchange.functions.len() >= 2 {
            println!("Comparing functions for similarity...");
            
            let tsed_options = TSEDOptions {
                apted_options: APTEDOptions {
                    rename_cost: 0.3,
                    delete_cost: 1.0,
                    insert_cost: 1.0,
                    compare_values: false,
                },
                min_lines: 1, // Lower threshold for AST import mode
                min_tokens: None,
                size_penalty: false, // Disable size penalty for imported ASTs
                skip_test: false,
            };
            
            for i in 0..ast_exchange.functions.len() {
                for j in (i + 1)..ast_exchange.functions.len() {
                    let func1 = &ast_exchange.functions[i];
                    let func2 = &ast_exchange.functions[j];
                    
                    let tree1: TreeNode = func1.ast.clone().into();
                    let tree2: TreeNode = func2.ast.clone().into();
                    
                    // For AST import mode, skip line-based filtering
                    let similarity = calculate_tsed(&Rc::new(tree1), &Rc::new(tree2), &tsed_options);
                    
                    if similarity >= cli.threshold {
                        println!(
                            "  {} <-> {}: {:.2}%",
                            func1.name,
                            func2.name,
                            similarity * 100.0
                        );
                    }
                }
            }
        }
        
        return Ok(());
    }
    
    // Normal parsing mode
    let config = if let Some(config_path) = &cli.config {
        GenericParserConfig::from_file(config_path)
            .map_err(|e| anyhow::anyhow!("Failed to load config: {}", e))?
    } else if let Some(lang) = &cli.language {
        match lang.as_str() {
            "python" | "py" => GenericParserConfig::python(),
            "rust" | "rs" => GenericParserConfig::rust(),
            "javascript" | "js" => GenericParserConfig::javascript(),
            "go" => GenericParserConfig::go(),
            "java" => GenericParserConfig::java(),
            "c" => GenericParserConfig::c(),
            "cpp" | "c++" => GenericParserConfig::cpp(),
            "csharp" | "cs" => GenericParserConfig::csharp(),
            "ruby" | "rb" => GenericParserConfig::ruby(),
            // "php" => GenericParserConfig::php(), // Temporarily disabled
            _ => {
                return Err(anyhow::anyhow!("Unknown language: {}. Supported languages: python, rust, javascript, go, java, c, cpp, csharp, ruby", lang));
            }
        }
    } else {
        return Err(anyhow::anyhow!("Either --config or --language must be provided"));
    };
    
    // Create parser based on language
    let language = match config.language.as_str() {
        "python" => tree_sitter_python::LANGUAGE.into(),
        "rust" => tree_sitter_rust::LANGUAGE.into(),
        "javascript" => tree_sitter_javascript::LANGUAGE.into(),
        "go" => tree_sitter_go::LANGUAGE.into(),
        "java" => tree_sitter_java::LANGUAGE.into(),
        "c" => tree_sitter_c::LANGUAGE.into(),
        "cpp" => tree_sitter_cpp::LANGUAGE.into(),
        "csharp" => tree_sitter_c_sharp::LANGUAGE.into(),
        "ruby" => tree_sitter_ruby::LANGUAGE.into(),
        // "php" => tree_sitter_php::language().into(), // Temporarily disabled
        _ => return Err(anyhow::anyhow!("Unsupported language: {}", config.language)),
    };
    
    let mut parser = GenericTreeSitterParser::new(language, config.clone())
        .map_err(|e| anyhow::anyhow!("Failed to create parser: {}", e))?;
    
    // Read file
    let content = fs::read_to_string(&cli.path)?;
    let filename = cli.path.to_string_lossy();
    
    // Parse full AST if needed for output
    let full_ast = if cli.ast_output.is_some() {
        let tree = parser.parse(&content, &filename)
            .map_err(|e| anyhow::anyhow!("Failed to parse full AST: {}", e))?;
        Some(SerializableTreeNode::from(tree.as_ref()))
    } else {
        None
    };
    
    // Extract functions
    let functions = parser.extract_functions(&content, &filename)
        .map_err(|e| anyhow::anyhow!("Failed to extract functions: {}", e))?;
    
    // Generate AST output if requested
    if let Some(ast_output_path) = &cli.ast_output {
        let mut exchange_functions = Vec::new();
        
        for func in &functions {
            // Extract function body and parse it
            let lines: Vec<&str> = content.lines().collect();
            let body = extract_function_body(&lines, func.body_start_line, func.body_end_line);
            
            let tree = parser.parse(&body, &format!("{}:{}", filename, func.name))
                .map_err(|e| anyhow::anyhow!("Failed to parse function {}: {}", func.name, e))?;
            
            exchange_functions.push(ExchangeFunctionDef {
                name: func.name.clone(),
                start_line: func.start_line,
                end_line: func.end_line,
                body_start_line: func.body_start_line,
                body_end_line: func.body_end_line,
                ast: SerializableTreeNode::from(tree.as_ref()),
            });
        }
        
        let ast_exchange = ASTExchange {
            language: config.language.clone(),
            filename: filename.to_string(),
            functions: exchange_functions,
            full_ast,
        };
        
        write_ast_exchange(&ast_exchange, ast_output_path)?;
        eprintln!("AST written to {:?}", ast_output_path);
    }
    
    if cli.show_functions {
        println!("Found {} functions:", functions.len());
        for func in &functions {
            println!(
                "  {} {}:{}-{}",
                func.name, filename, func.start_line, func.end_line
            );
        }
        println!();
    }
    
    // Compare functions
    if functions.len() >= 2 {
        println!("Comparing functions for similarity...");
        
        let tsed_options = TSEDOptions {
            apted_options: APTEDOptions {
                rename_cost: 0.3,
                delete_cost: 1.0,
                insert_cost: 1.0,
                compare_values: false,
            },
            min_lines: 1,
            min_tokens: None,
            size_penalty: false,
            skip_test: false,
        };
        
        for i in 0..functions.len() {
            for j in (i + 1)..functions.len() {
                let func1 = &functions[i];
                let func2 = &functions[j];
                
                // Extract function bodies
                let lines: Vec<&str> = content.lines().collect();
                let body1 = extract_function_body(&lines, func1.body_start_line, func1.body_end_line);
                let body2 = extract_function_body(&lines, func2.body_start_line, func2.body_end_line);
                
                // Parse and compare
                let tree1 = parser.parse(&body1, &format!("{}:{}", filename, func1.name))
                    .map_err(|e| anyhow::anyhow!("Failed to parse function {}: {}", func1.name, e))?;
                let tree2 = parser.parse(&body2, &format!("{}:{}", filename, func2.name))
                    .map_err(|e| anyhow::anyhow!("Failed to parse function {}: {}", func2.name, e))?;
                
                let similarity = calculate_tsed(&tree1, &tree2, &tsed_options);
                
                if similarity >= cli.threshold {
                    println!(
                        "  {} <-> {}: {:.2}%",
                        func1.name,
                        func2.name,
                        similarity * 100.0
                    );
                }
            }
        }
    }
    
    Ok(())
}

fn extract_function_body(lines: &[&str], start_line: u32, end_line: u32) -> String {
    let start_idx = (start_line.saturating_sub(1)) as usize;
    let end_idx = std::cmp::min(end_line as usize, lines.len());
    
    if start_idx >= lines.len() {
        return String::new();
    }
    
    lines[start_idx..end_idx].join("\n")
}