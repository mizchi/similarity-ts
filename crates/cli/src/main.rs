use clap::{Parser, Subcommand};
use std::fs;
use std::path::Path;
use ts_similarity_core::{
    calculate_tsed_from_code, find_similar_functions_across_files, find_similar_functions_in_file,
    TSEDOptions,
};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Compare two files (default behavior)
    Compare {
        /// First TypeScript file
        file1: String,

        /// Second TypeScript file
        file2: String,

        /// Rename cost (default: 0.3)
        #[arg(long, default_value_t = 0.3)]
        rename_cost: f64,

        /// Delete cost (default: 1.0)
        #[arg(long, default_value_t = 1.0)]
        delete_cost: f64,

        /// Insert cost (default: 1.0)
        #[arg(long, default_value_t = 1.0)]
        insert_cost: f64,
    },

    /// Find similar functions within a single file
    Functions {
        /// TypeScript file to analyze
        file: String,

        /// Similarity threshold (0.0 to 1.0)
        #[arg(short, long, default_value_t = 0.7)]
        threshold: f64,

        /// Rename cost (default: 0.3)
        #[arg(long, default_value_t = 0.3)]
        rename_cost: f64,
    },

    /// Find similar functions across multiple files
    CrossFile {
        /// Files to analyze
        files: Vec<String>,

        /// Similarity threshold (0.0 to 1.0)
        #[arg(short, long, default_value_t = 0.7)]
        threshold: f64,

        /// Rename cost (default: 0.3)
        #[arg(long, default_value_t = 0.3)]
        rename_cost: f64,
    },
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    match args.command {
        Some(Commands::Compare { file1, file2, rename_cost, delete_cost, insert_cost }) => {
            compare_files(file1, file2, rename_cost, delete_cost, insert_cost)?;
        }
        Some(Commands::Functions { file, threshold, rename_cost }) => {
            find_similar_functions(file, threshold, rename_cost)?;
        }
        Some(Commands::CrossFile { files, threshold, rename_cost }) => {
            find_similar_across_files(files, threshold, rename_cost)?;
        }
        None => {
            // Legacy behavior: expect two arguments
            let args: Vec<String> = std::env::args().collect();
            if args.len() >= 3 {
                compare_files(args[1].clone(), args[2].clone(), 0.3, 1.0, 1.0)?;
            } else {
                eprintln!("Usage: {} <file1> <file2>", args[0]);
                eprintln!("   or: {} compare <file1> <file2>", args[0]);
                eprintln!("   or: {} functions <file>", args[0]);
                eprintln!("   or: {} cross-file <file1> <file2> ...", args[0]);
                std::process::exit(1);
            }
        }
    }

    Ok(())
}

fn compare_files(
    file1: String,
    file2: String,
    rename_cost: f64,
    delete_cost: f64,
    insert_cost: f64,
) -> anyhow::Result<()> {
    // Read files
    let code1 = fs::read_to_string(&file1)?;
    let code2 = fs::read_to_string(&file2)?;

    // Set up options
    let mut options = TSEDOptions::default();
    options.apted_options.rename_cost = rename_cost;
    options.apted_options.delete_cost = delete_cost;
    options.apted_options.insert_cost = insert_cost;

    // Calculate similarity
    match calculate_tsed_from_code(&code1, &code2, &file1, &file2, &options) {
        Ok(similarity) => {
            println!("TSED Similarity: {:.2}%", similarity * 100.0);
            println!("Distance: {:.4}", 1.0 - similarity);
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
}

fn find_similar_functions(file: String, threshold: f64, rename_cost: f64) -> anyhow::Result<()> {
    let code = fs::read_to_string(&file)?;
    let mut options = TSEDOptions::default();
    options.apted_options.rename_cost = rename_cost;

    match find_similar_functions_in_file(&file, &code, threshold, &options) {
        Ok(similar_pairs) => {
            if similar_pairs.is_empty() {
                println!("No similar functions found with threshold {:.0}%", threshold * 100.0);
            } else {
                println!("Similar functions in {}:", file);
                println!("{}", "=".repeat(60));

                for (func1, func2, similarity) in similar_pairs {
                    println!(
                        "\n{} {} (lines {}-{}) <-> {} {} (lines {}-{})",
                        match func1.function_type {
                            ts_similarity_core::FunctionType::Function => "function",
                            ts_similarity_core::FunctionType::Method => "method",
                            ts_similarity_core::FunctionType::Arrow => "arrow",
                            ts_similarity_core::FunctionType::Constructor => "constructor",
                        },
                        func1.name,
                        func1.start_line,
                        func1.end_line,
                        match func2.function_type {
                            ts_similarity_core::FunctionType::Function => "function",
                            ts_similarity_core::FunctionType::Method => "method",
                            ts_similarity_core::FunctionType::Arrow => "arrow",
                            ts_similarity_core::FunctionType::Constructor => "constructor",
                        },
                        func2.name,
                        func2.start_line,
                        func2.end_line,
                    );
                    println!("Similarity: {:.2}%", similarity * 100.0);

                    if let Some(class1) = &func1.class_name {
                        println!("  {} is in class {}", func1.name, class1);
                    }
                    if let Some(class2) = &func2.class_name {
                        println!("  {} is in class {}", func2.name, class2);
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
}

fn find_similar_across_files(
    files: Vec<String>,
    threshold: f64,
    rename_cost: f64,
) -> anyhow::Result<()> {
    let mut file_contents = Vec::new();

    for file in &files {
        let code = fs::read_to_string(file)?;
        file_contents.push((file.clone(), code));
    }

    let mut options = TSEDOptions::default();
    options.apted_options.rename_cost = rename_cost;

    match find_similar_functions_across_files(&file_contents, threshold, &options) {
        Ok(similar_pairs) => {
            if similar_pairs.is_empty() {
                println!(
                    "No similar functions found across files with threshold {:.0}%",
                    threshold * 100.0
                );
            } else {
                println!("Similar functions across files:");
                println!("{}", "=".repeat(60));

                for (file1, func1, file2, func2, similarity) in similar_pairs {
                    println!(
                        "\n{}:{} (lines {}-{}) <-> {}:{} (lines {}-{})",
                        Path::new(&file1).file_name().unwrap().to_string_lossy(),
                        func1.name,
                        func1.start_line,
                        func1.end_line,
                        Path::new(&file2).file_name().unwrap().to_string_lossy(),
                        func2.name,
                        func2.start_line,
                        func2.end_line,
                    );
                    println!("Similarity: {:.2}%", similarity * 100.0);

                    if let Some(class1) = &func1.class_name {
                        println!("  {} is in class {}", func1.name, class1);
                    }
                    if let Some(class2) = &func2.class_name {
                        println!("  {} is in class {}", func2.name, class2);
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
}
