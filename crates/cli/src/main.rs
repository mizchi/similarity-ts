use clap::{Parser, Subcommand};

mod check;

#[derive(Parser)]
#[command(name = "ts-similarity")]
#[command(about = "TypeScript/JavaScript code similarity analyzer")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Check for duplicate functions
    Functions {
        /// Directory to analyze
        directory: String,

        /// Similarity threshold (0.0-1.0)
        #[arg(short, long, default_value = "0.7")]
        threshold: f64,

        /// Rename cost for APTED algorithm
        #[arg(short, long, default_value = "0.3")]
        rename_cost: f64,

        /// Check across files (not just within files)
        #[arg(short, long)]
        cross_file: bool,

        /// File extensions to check
        #[arg(short, long, value_delimiter = ',')]
        extensions: Option<Vec<String>>,

        /// Minimum lines for functions to be considered
        #[arg(short, long, default_value = "5")]
        min_lines: u32,

        /// Disable size penalty for very different sized functions
        #[arg(long)]
        no_size_penalty: bool,

        /// Show function code in output
        #[arg(short, long)]
        show: bool,
    },

    /// Check for similar type definitions
    Types {
        /// Directory to analyze
        directory: String,

        /// Similarity threshold (0.0-1.0)
        #[arg(short, long, default_value = "0.7")]
        threshold: f64,

        /// Check across files (not just within files)
        #[arg(short, long)]
        cross_file: bool,

        /// File extensions to check
        #[arg(short, long, value_delimiter = ',')]
        extensions: Option<Vec<String>>,

        /// Show type definitions in output
        #[arg(short, long)]
        show: bool,

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
    },
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Functions {
            directory,
            threshold,
            rename_cost,
            cross_file,
            extensions,
            min_lines,
            no_size_penalty,
            show,
        } => {
            check::check_directory(
                directory,
                threshold,
                rename_cost,
                cross_file,
                extensions.as_ref(),
                min_lines,
                no_size_penalty,
                show,
            )?;
        }
        Commands::Types {
            directory,
            threshold,
            cross_file,
            extensions,
            show,
            include_types,
            types_only,
            interfaces_only,
            allow_cross_kind,
            structural_weight,
            naming_weight,
            include_type_literals,
        } => {
            check_types(
                directory,
                threshold,
                cross_file,
                extensions.as_ref(),
                show,
                include_types,
                types_only,
                interfaces_only,
                allow_cross_kind,
                structural_weight,
                naming_weight,
                include_type_literals,
            )?;
        }
    }

    Ok(())
}

fn check_types(
    directory: String,
    threshold: f64,
    cross_file: bool,
    extensions: Option<&Vec<String>>,
    show: bool,
    _include_types: bool,
    types_only: bool,
    interfaces_only: bool,
    allow_cross_kind: bool,
    structural_weight: f64,
    naming_weight: f64,
    include_type_literals: bool,
) -> anyhow::Result<()> {
    use ignore::WalkBuilder;
    use std::collections::HashSet;
    use std::fs;
    use ts_similarity_core::{
        extract_type_literals_from_code, extract_types_from_code, find_similar_type_literals,
        find_similar_types, TypeComparisonOptions, TypeKind,
    };

    let default_extensions = vec!["ts", "tsx"];
    let exts: Vec<&str> =
        extensions.map_or(default_extensions, |v| v.iter().map(String::as_str).collect());

    let mut files = Vec::new();
    let mut visited = HashSet::new();

    // Walk directory respecting .gitignore
    let walker = WalkBuilder::new(&directory).follow_links(false).build();

    for entry in walker {
        let entry = entry?;
        let path = entry.path();

        // Skip if not a file
        if !path.is_file() {
            continue;
        }

        // Check extension
        if let Some(ext) = path.extension() {
            if let Some(ext_str) = ext.to_str() {
                if exts.contains(&ext_str) {
                    // Get canonical path to avoid duplicates
                    if let Ok(canonical) = path.canonicalize() {
                        if visited.insert(canonical.clone()) {
                            files.push(path.to_path_buf());
                        }
                    }
                }
            }
        }
    }

    if files.is_empty() {
        println!("No TypeScript files found in {directory}");
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
                        eprintln!("Error extracting types from {}: {}", file.display(), e);
                    }
                }

                // Extract type literals if requested
                if include_type_literals {
                    match extract_type_literals_from_code(&content, &file_str) {
                        Ok(type_literals) => {
                            all_type_literals.extend(type_literals);
                        }
                        Err(e) => {
                            eprintln!(
                                "Error extracting type literals from {}: {}",
                                file.display(),
                                e
                            );
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
    let mut options = TypeComparisonOptions::default();
    options.allow_cross_kind_comparison = allow_cross_kind;
    options.structural_weight = structural_weight;
    options.naming_weight = naming_weight;

    // Validate weights
    if (structural_weight + naming_weight - 1.0).abs() > 0.001 {
        eprintln!("Warning: structural_weight + naming_weight should equal 1.0");
    }

    if cross_file {
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
                println!("{}", "=".repeat(60));

                for pair in &similar_pairs {
                    // Get relative paths
                    let relative_path1 = get_relative_path(&pair.type1.file_path);
                    let relative_path2 = get_relative_path(&pair.type2.file_path);

                    println!(
                        "\n{}:{} | L{}-{} similar-type: {} ({})",
                        relative_path1,
                        pair.type1.start_line,
                        pair.type1.start_line,
                        pair.type1.end_line,
                        pair.type1.name,
                        format_type_kind(&pair.type1.kind)
                    );
                    println!(
                        "{}:{} | L{}-{} similar-type: {} ({})",
                        relative_path2,
                        pair.type2.start_line,
                        pair.type2.start_line,
                        pair.type2.end_line,
                        pair.type2.name,
                        format_type_kind(&pair.type2.kind)
                    );
                    println!(
                        "Similarity: {:.2}% (structural: {:.2}%, naming: {:.2}%)",
                        pair.result.similarity * 100.0,
                        pair.result.structural_similarity * 100.0,
                        pair.result.naming_similarity * 100.0
                    );

                    if show {
                        show_type_details(&pair.type1);
                        show_type_details(&pair.type2);
                        show_comparison_details(&pair.result);
                    }
                }

                println!("\nTotal similar type pairs found: {}", similar_pairs.len());
            }

            if !type_literal_pairs.is_empty() {
                println!("\nType literals similar to type definitions:");
                println!("{}", "=".repeat(60));

                for pair in &type_literal_pairs {
                    let literal_path = get_relative_path(&pair.type_literal.file_path);
                    let def_path = get_relative_path(&pair.type_definition.file_path);

                    println!(
                        "\n{}:{} | L{} similar-type-literal: {}",
                        literal_path,
                        pair.type_literal.start_line,
                        pair.type_literal.start_line,
                        pair.type_literal.name
                    );
                    println!(
                        "{}:{} | L{}-{} similar-type: {} ({})",
                        def_path,
                        pair.type_definition.start_line,
                        pair.type_definition.start_line,
                        pair.type_definition.end_line,
                        pair.type_definition.name,
                        format_type_kind(&pair.type_definition.kind)
                    );
                    println!(
                        "Similarity: {:.2}% (structural: {:.2}%, naming: {:.2}%)",
                        pair.result.similarity * 100.0,
                        pair.result.structural_similarity * 100.0,
                        pair.result.naming_similarity * 100.0
                    );

                    if show {
                        show_type_literal_details(&pair.type_literal);
                        show_type_details(&pair.type_definition);
                        show_comparison_details(&pair.result);
                    }
                }

                println!("\nTotal type literal pairs found: {}", type_literal_pairs.len());
            }
        }
    } else {
        // Group types by file and check within each file
        let mut file_groups = std::collections::HashMap::new();
        for type_def in all_types {
            file_groups.entry(type_def.file_path.clone()).or_insert_with(Vec::new).push(type_def);
        }

        let mut total_similar = 0;
        for (file_path, types) in file_groups {
            if types.len() < 2 {
                continue;
            }

            let similar_pairs = find_similar_types(&types, threshold, &options);
            if !similar_pairs.is_empty() {
                let relative_path = get_relative_path(&file_path);
                println!("\nSimilar types in {}:", relative_path);
                println!("{}", "-".repeat(60));

                for pair in &similar_pairs {
                    println!(
                        "  {}:{} | L{}-{} similar-type: {} ({})",
                        relative_path,
                        pair.type1.start_line,
                        pair.type1.start_line,
                        pair.type1.end_line,
                        pair.type1.name,
                        format_type_kind(&pair.type1.kind)
                    );
                    println!(
                        "  {}:{} | L{}-{} similar-type: {} ({})",
                        relative_path,
                        pair.type2.start_line,
                        pair.type2.start_line,
                        pair.type2.end_line,
                        pair.type2.name,
                        format_type_kind(&pair.type2.kind)
                    );
                    println!(
                        "  Similarity: {:.2}% (structural: {:.2}%, naming: {:.2}%)",
                        pair.result.similarity * 100.0,
                        pair.result.structural_similarity * 100.0,
                        pair.result.naming_similarity * 100.0
                    );

                    if show {
                        show_type_details(&pair.type1);
                        show_type_details(&pair.type2);
                        show_comparison_details(&pair.result);
                    }
                }

                total_similar += similar_pairs.len();
            }
        }

        if total_similar == 0 {
            println!("\nNo similar types found!");
        } else {
            println!("\nTotal similar pairs found: {}", total_similar);
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

fn format_type_kind(kind: &ts_similarity_core::TypeKind) -> &'static str {
    match kind {
        ts_similarity_core::TypeKind::Interface => "interface",
        ts_similarity_core::TypeKind::TypeAlias => "type",
        ts_similarity_core::TypeKind::TypeLiteral => "type literal",
    }
}

fn show_type_details(type_def: &ts_similarity_core::TypeDefinition) {
    println!("\n--- {} ({}) ---", type_def.name, format_type_kind(&type_def.kind));

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

fn show_type_literal_details(type_literal: &ts_similarity_core::TypeLiteralDefinition) {
    println!("\n--- {} (type literal) ---", type_literal.name);

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

fn format_type_literal_context(context: &ts_similarity_core::TypeLiteralContext) -> String {
    match context {
        ts_similarity_core::TypeLiteralContext::FunctionReturn(name) => {
            format!("Function '{}' return type", name)
        }
        ts_similarity_core::TypeLiteralContext::FunctionParameter(func_name, param_name) => {
            format!("Function '{}' parameter '{}'", func_name, param_name)
        }
        ts_similarity_core::TypeLiteralContext::VariableDeclaration(name) => {
            format!("Variable '{}' type annotation", name)
        }
        ts_similarity_core::TypeLiteralContext::ArrowFunctionReturn(name) => {
            format!("Arrow function '{}' return type", name)
        }
    }
}

fn show_comparison_details(result: &ts_similarity_core::TypeComparisonResult) {
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
