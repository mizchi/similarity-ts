use clap::Parser;

mod check;
pub mod parallel;

#[derive(Parser)]
#[command(name = "similarity-ts")]
#[command(about = "TypeScript/JavaScript code similarity analyzer")]
#[command(version)]
struct Cli {
    /// Paths to analyze (files or directories)
    #[arg(default_value = ".")]
    paths: Vec<String>,

    /// Print code in output
    #[arg(short, long)]
    print: bool,

    /// Similarity threshold (0.0-1.0)
    #[arg(short, long, default_value = "0.87")]
    threshold: f64,

    /// Disable function similarity checking
    #[arg(long = "no-functions")]
    no_functions: bool,

    /// Enable type similarity checking (experimental)
    #[arg(long = "experimental-types")]
    types: bool,

    /// File extensions to check
    #[arg(short, long, value_delimiter = ',')]
    extensions: Option<Vec<String>>,

    /// Minimum lines for functions to be considered
    #[arg(short, long, default_value = "3")]
    min_lines: Option<u32>,

    /// Minimum tokens for functions to be considered
    #[arg(long)]
    min_tokens: Option<u32>,

    /// Rename cost for APTED algorithm
    #[arg(short, long, default_value = "0.3")]
    rename_cost: f64,

    /// Disable size penalty for very different sized functions
    #[arg(long)]
    no_size_penalty: bool,

    /// Filter functions by name (substring match)
    #[arg(long)]
    filter_function: Option<String>,

    /// Filter functions by body content (substring match)
    #[arg(long)]
    filter_function_body: Option<String>,

    /// Include both interfaces and type aliases
    #[arg(long)]
    include_types: bool,

    /// Only check type aliases (exclude interfaces)
    #[arg(long)]
    types_only: bool,

    /// Only check interfaces (exclude type aliases)
    #[arg(long)]
    interfaces_only: bool,

    /// Allow comparison between interfaces and type aliases
    #[arg(long, default_value = "true")]
    allow_cross_kind: bool,

    /// Weight for structural similarity (0.0-1.0)
    #[arg(long, default_value = "0.6")]
    structural_weight: f64,

    /// Weight for naming similarity (0.0-1.0)
    #[arg(long, default_value = "0.4")]
    naming_weight: f64,

    /// Include type literals (function return types, parameters, etc.)
    #[arg(long)]
    include_type_literals: bool,

    /// Disable fast mode with bloom filter pre-filtering
    #[arg(long = "no-fast")]
    no_fast: bool,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    let functions_enabled = !cli.no_functions;
    let types_enabled = cli.types;

    // Validate that at least one analyzer is enabled
    if !functions_enabled && !types_enabled {
        eprintln!("Error: At least one analyzer must be enabled. Use --types to enable type checking or remove --no-functions.");
        return Err(anyhow::anyhow!("No analyzer enabled"));
    }

    // Handle mutual exclusion of min_lines and min_tokens
    let (min_lines, min_tokens) = match (cli.min_lines, cli.min_tokens) {
        (Some(_), Some(tokens)) => {
            eprintln!(
                "Warning: Both --min-lines and --min-tokens specified. Using --min-tokens={}",
                tokens
            );
            (None, Some(tokens))
        }
        (lines, tokens) => (lines, tokens),
    };

    println!("Analyzing code similarity...\n");

    let separator = "-".repeat(60);

    // Run functions analysis if enabled
    if functions_enabled {
        println!("=== Function Similarity ===");
        check::check_paths(
            cli.paths.clone(),
            cli.threshold,
            cli.rename_cost,
            cli.extensions.as_ref(),
            min_lines.unwrap_or(3),
            min_tokens,
            cli.no_size_penalty,
            cli.print,
            !cli.no_fast,
            cli.filter_function.as_ref(),
            cli.filter_function_body.as_ref(),
        )?;
    }

    // Run types analysis if enabled
    if types_enabled && functions_enabled {
        println!("\n{}\n", separator);
    }

    if types_enabled {
        println!("=== Type Similarity ===");
        check_types(
            cli.paths,
            cli.threshold,
            cli.extensions.as_ref(),
            cli.print,
            cli.include_types,
            cli.types_only,
            cli.interfaces_only,
            cli.allow_cross_kind,
            cli.structural_weight,
            cli.naming_weight,
            cli.include_type_literals,
        )?;
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn check_types(
    paths: Vec<String>,
    threshold: f64,
    extensions: Option<&Vec<String>>,
    print: bool,
    _include_types: bool,
    types_only: bool,
    interfaces_only: bool,
    allow_cross_kind: bool,
    structural_weight: f64,
    naming_weight: f64,
    include_type_literals: bool,
) -> anyhow::Result<()> {
    use ignore::WalkBuilder;
    use similarity_ts_core::{
        extract_type_literals_from_code, extract_types_from_code, find_similar_type_literals,
        find_similar_types, TypeComparisonOptions, TypeKind,
    };
    use std::collections::HashSet;
    use std::fs;
    use std::path::Path;

    let default_extensions = vec!["ts", "tsx", "mts", "cts"];
    let exts: Vec<&str> =
        extensions.map_or(default_extensions, |v| v.iter().map(String::as_str).collect());

    let mut files = Vec::new();
    let mut visited = HashSet::new();

    // Process each path
    for path_str in &paths {
        let path = Path::new(path_str);

        if path.is_file() {
            // If it's a file, check extension and add it
            if let Some(ext) = path.extension() {
                if let Some(ext_str) = ext.to_str() {
                    if exts.contains(&ext_str) {
                        if let Ok(canonical) = path.canonicalize() {
                            if visited.insert(canonical.clone()) {
                                files.push(path.to_path_buf());
                            }
                        }
                    }
                }
            }
        } else if path.is_dir() {
            // If it's a directory, walk it respecting .gitignore
            let walker = WalkBuilder::new(path).follow_links(false).build();

            for entry in walker {
                let entry = entry?;
                let entry_path = entry.path();

                // Skip if not a file
                if !entry_path.is_file() {
                    continue;
                }

                // Check extension
                if let Some(ext) = entry_path.extension() {
                    if let Some(ext_str) = ext.to_str() {
                        if exts.contains(&ext_str) {
                            // Get canonical path to avoid duplicates
                            if let Ok(canonical) = entry_path.canonicalize() {
                                if visited.insert(canonical.clone()) {
                                    files.push(entry_path.to_path_buf());
                                }
                            }
                        }
                    }
                }
            }
        } else {
            eprintln!("Warning: Path not found: {}", path_str);
        }
    }

    if files.is_empty() {
        println!("No TypeScript files found in specified paths");
        return Ok(());
    }

    println!("Checking {} files for similar types...\n", files.len());

    // Extract types from all files
    let mut all_types = Vec::new();
    let mut all_type_literals = Vec::new();

    for file in &files {
        match fs::read_to_string(file) {
            Ok(content) => {
                let file_str = file.to_string_lossy();

                // Extract regular types
                match extract_types_from_code(&content, &file_str) {
                    Ok(mut types) => {
                        // Filter types based on command line options
                        if types_only {
                            types.retain(|t| t.kind == TypeKind::TypeAlias);
                        } else if interfaces_only {
                            types.retain(|t| t.kind == TypeKind::Interface);
                        }
                        all_types.extend(types);
                    }
                    Err(e) => {
                        // Skip files with parse errors silently
                        if !e.contains("Parse errors:") {
                            eprintln!("Error in {}: {}", file.display(), e);
                        }
                    }
                }

                // Extract type literals if requested
                if include_type_literals {
                    match extract_type_literals_from_code(&content, &file_str) {
                        Ok(type_literals) => {
                            all_type_literals.extend(type_literals);
                        }
                        Err(e) => {
                            // Skip files with parse errors silently
                            if !e.contains("Parse errors:") {
                                eprintln!("Error in {}: {}", file.display(), e);
                            }
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("Error reading {}: {}", file.display(), e);
            }
        }
    }

    if all_types.is_empty() && all_type_literals.is_empty() {
        println!("No type definitions or type literals found!");
        return Ok(());
    }

    println!("Found {} type definitions", all_types.len());
    if include_type_literals {
        println!("Found {} type literals", all_type_literals.len());
    }

    // Set up comparison options
    let options = TypeComparisonOptions {
        allow_cross_kind_comparison: allow_cross_kind,
        structural_weight,
        naming_weight,
        ..Default::default()
    };

    // Validate weights
    if (structural_weight + naming_weight - 1.0).abs() > 0.001 {
        eprintln!("Warning: structural_weight + naming_weight should equal 1.0");
    }

    // Find similar types across all files
    let similar_pairs = find_similar_types(&all_types, threshold, &options);

    // Find type literals similar to type definitions
    let type_literal_pairs = if include_type_literals {
        find_similar_type_literals(&all_type_literals, &all_types, threshold, &options)
    } else {
        Vec::new()
    };

    if similar_pairs.is_empty() && type_literal_pairs.is_empty() {
        println!("\nNo similar types found!");
    } else {
        if !similar_pairs.is_empty() {
            println!("\nSimilar types found:");
            println!("{}", "-".repeat(60));

            for pair in &similar_pairs {
                // Get relative paths
                let relative_path1 = get_relative_path(&pair.type1.file_path);
                let relative_path2 = get_relative_path(&pair.type2.file_path);

                println!(
                    "\nSimilarity: {:.2}% (structural: {:.2}%, naming: {:.2}%)",
                    pair.result.similarity * 100.0,
                    pair.result.structural_similarity * 100.0,
                    pair.result.naming_similarity * 100.0
                );
                println!(
                    "  {}:{} | L{}-{} similar-type: {} ({})",
                    relative_path1,
                    pair.type1.start_line,
                    pair.type1.start_line,
                    pair.type1.end_line,
                    pair.type1.name,
                    format_type_kind(&pair.type1.kind)
                );
                println!(
                    "  {}:{} | L{}-{} similar-type: {} ({})",
                    relative_path2,
                    pair.type2.start_line,
                    pair.type2.start_line,
                    pair.type2.end_line,
                    pair.type2.name,
                    format_type_kind(&pair.type2.kind)
                );

                if print {
                    show_type_details(&pair.type1);
                    show_type_details(&pair.type2);
                    show_comparison_details(&pair.result);
                }
            }

            println!("\nTotal similar type pairs found: {}", similar_pairs.len());
        }

        if !type_literal_pairs.is_empty() {
            println!("\nType literals similar to type definitions:");
            println!("{}", "-".repeat(60));

            for pair in &type_literal_pairs {
                let literal_path = get_relative_path(&pair.type_literal.file_path);
                let def_path = get_relative_path(&pair.type_definition.file_path);

                println!(
                    "\nSimilarity: {:.2}% (structural: {:.2}%, naming: {:.2}%)",
                    pair.result.similarity * 100.0,
                    pair.result.structural_similarity * 100.0,
                    pair.result.naming_similarity * 100.0
                );
                println!(
                    "  {}:{} | L{} similar-type-literal: {}",
                    literal_path,
                    pair.type_literal.start_line,
                    pair.type_literal.start_line,
                    pair.type_literal.name
                );
                println!(
                    "  {}:{} | L{}-{} similar-type: {} ({})",
                    def_path,
                    pair.type_definition.start_line,
                    pair.type_definition.start_line,
                    pair.type_definition.end_line,
                    pair.type_definition.name,
                    format_type_kind(&pair.type_definition.kind)
                );

                if print {
                    show_type_literal_details(&pair.type_literal);
                    show_type_details(&pair.type_definition);
                    show_comparison_details(&pair.result);
                }
            }

            println!("\nTotal type literal pairs found: {}", type_literal_pairs.len());
        }
    }

    Ok(())
}

fn get_relative_path(file_path: &str) -> String {
    if let Ok(current_dir) = std::env::current_dir() {
        std::path::Path::new(file_path)
            .strip_prefix(&current_dir)
            .unwrap_or(std::path::Path::new(file_path))
            .to_string_lossy()
            .to_string()
    } else {
        file_path.to_string()
    }
}

fn format_type_kind(kind: &similarity_ts_core::TypeKind) -> &'static str {
    match kind {
        similarity_ts_core::TypeKind::Interface => "interface",
        similarity_ts_core::TypeKind::TypeAlias => "type",
        similarity_ts_core::TypeKind::TypeLiteral => "type literal",
    }
}

fn show_type_details(type_def: &similarity_ts_core::TypeDefinition) {
    println!("\n\x1b[36m--- {} ({}) ---\x1b[0m", type_def.name, format_type_kind(&type_def.kind));

    if !type_def.generics.is_empty() {
        println!("Generics: <{}>", type_def.generics.join(", "));
    }

    if !type_def.extends.is_empty() {
        println!("Extends: {}", type_def.extends.join(", "));
    }

    if !type_def.properties.is_empty() {
        println!("Properties:");
        for prop in &type_def.properties {
            let modifiers = if prop.readonly { "readonly " } else { "" };
            let optional = if prop.optional { "?" } else { "" };
            println!("  {}{}{}: {}", modifiers, prop.name, optional, prop.type_annotation);
        }
    }
}

fn show_type_literal_details(type_literal: &similarity_ts_core::TypeLiteralDefinition) {
    println!("\n\x1b[36m--- {} (type literal) ---\x1b[0m", type_literal.name);

    println!("Context: {}", format_type_literal_context(&type_literal.context));

    if !type_literal.properties.is_empty() {
        println!("Properties:");
        for prop in &type_literal.properties {
            let modifiers = if prop.readonly { "readonly " } else { "" };
            let optional = if prop.optional { "?" } else { "" };
            println!("  {}{}{}: {}", modifiers, prop.name, optional, prop.type_annotation);
        }
    }
}

fn format_type_literal_context(context: &similarity_ts_core::TypeLiteralContext) -> String {
    match context {
        similarity_ts_core::TypeLiteralContext::FunctionReturn(name) => {
            format!("Function '{}' return type", name)
        }
        similarity_ts_core::TypeLiteralContext::FunctionParameter(func_name, param_name) => {
            format!("Function '{}' parameter '{}'", func_name, param_name)
        }
        similarity_ts_core::TypeLiteralContext::VariableDeclaration(name) => {
            format!("Variable '{}' type annotation", name)
        }
        similarity_ts_core::TypeLiteralContext::ArrowFunctionReturn(name) => {
            format!("Arrow function '{}' return type", name)
        }
    }
}

fn show_comparison_details(result: &similarity_ts_core::TypeComparisonResult) {
    if !result.differences.missing_properties.is_empty() {
        println!("Missing properties: {}", result.differences.missing_properties.join(", "));
    }

    if !result.differences.extra_properties.is_empty() {
        println!("Extra properties: {}", result.differences.extra_properties.join(", "));
    }

    if !result.differences.type_mismatches.is_empty() {
        println!("Type mismatches:");
        for mismatch in &result.differences.type_mismatches {
            println!("  {}: {} vs {}", mismatch.property, mismatch.type1, mismatch.type2);
        }
    }

    if !result.differences.optionality_differences.is_empty() {
        println!(
            "Optionality differences: {}",
            result.differences.optionality_differences.join(", ")
        );
    }
}
