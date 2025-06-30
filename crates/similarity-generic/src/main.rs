use anyhow::Result;
use clap::Parser;
use similarity_core::generic_parser_config::GenericParserConfig;
use similarity_core::generic_tree_sitter_parser::GenericTreeSitterParser;
use similarity_core::language_parser::LanguageParser;
use similarity_core::tsed::{calculate_tsed, TSEDOptions};
use similarity_core::APTEDOptions;
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "similarity-generic")]
#[command(about = "Generic code similarity analyzer using tree-sitter")]
struct Cli {
    /// Path to analyze
    path: PathBuf,
    
    /// Language configuration file (JSON)
    #[arg(short, long, required_unless_present = "language")]
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
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Load or create configuration
    let config = if let Some(config_path) = &cli.config {
        GenericParserConfig::from_file(config_path)
            .map_err(|e| anyhow::anyhow!("Failed to load config: {}", e))?
    } else if let Some(lang) = &cli.language {
        match lang.as_str() {
            "python" => GenericParserConfig::python(),
            "rust" => GenericParserConfig::rust(),
            "javascript" => GenericParserConfig::javascript(),
            "go" => GenericParserConfig::go(),
            _ => {
                return Err(anyhow::anyhow!("Unknown language: {}. Supported languages: python, rust, javascript, go", lang));
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
        _ => return Err(anyhow::anyhow!("Unsupported language: {}", config.language)),
    };
    
    let mut parser = GenericTreeSitterParser::new(language, config)
        .map_err(|e| anyhow::anyhow!("Failed to create parser: {}", e))?;
    
    // Read file
    let content = fs::read_to_string(&cli.path)?;
    let filename = cli.path.to_string_lossy();
    
    // Extract functions
    let functions = parser.extract_functions(&content, &filename)
        .map_err(|e| anyhow::anyhow!("Failed to extract functions: {}", e))?;
    
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
            min_lines: 3,
            min_tokens: None,
            size_penalty: true,
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