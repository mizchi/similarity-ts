use ignore::WalkBuilder;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use ts_similarity_core::{
    find_similar_functions_across_files, find_similar_functions_in_file, FunctionType, TSEDOptions,
};

pub fn check_directory(
    directory: String,
    threshold: f64,
    rename_cost: f64,
    cross_file: bool,
    extensions: Option<Vec<String>>,
) -> anyhow::Result<()> {
    let default_extensions = vec!["ts", "tsx", "js", "jsx"];
    let exts: Vec<&str> = extensions
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect())
        .unwrap_or(default_extensions);

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
        println!("No TypeScript/JavaScript files found in {}", directory);
        return Ok(());
    }

    println!("Checking {} files for duplicates...\n", files.len());

    let mut options = TSEDOptions::default();
    options.apted_options.rename_cost = rename_cost;

    if cross_file {
        // Check across all files
        check_cross_file_duplicates(&files, threshold, &options)?;
    } else {
        // Check each file individually
        let mut total_duplicates = 0;
        for file in &files {
            let duplicates = check_file_duplicates(file, threshold, &options)?;
            total_duplicates += duplicates;
        }

        if total_duplicates == 0 {
            println!("\nNo duplicate functions found!");
        } else {
            println!("\nTotal duplicate pairs found: {}", total_duplicates);
        }
    }

    Ok(())
}

fn check_file_duplicates(
    file: &Path,
    threshold: f64,
    options: &TSEDOptions,
) -> anyhow::Result<usize> {
    let code = fs::read_to_string(file)?;
    let file_str = file.to_string_lossy();

    match find_similar_functions_in_file(&file_str, &code, threshold, options) {
        Ok(similar_pairs) => {
            if !similar_pairs.is_empty() {
                println!("Duplicates in {}:", file.display());
                println!("{}", "-".repeat(60));

                for (func1, func2, similarity) in &similar_pairs {
                    println!(
                        "  {} {} (lines {}-{}) <-> {} {} (lines {}-{})",
                        match func1.function_type {
                            FunctionType::Function => "function",
                            FunctionType::Method => "method",
                            FunctionType::Arrow => "arrow",
                            FunctionType::Constructor => "constructor",
                        },
                        func1.name,
                        func1.start_line,
                        func1.end_line,
                        match func2.function_type {
                            FunctionType::Function => "function",
                            FunctionType::Method => "method",
                            FunctionType::Arrow => "arrow",
                            FunctionType::Constructor => "constructor",
                        },
                        func2.name,
                        func2.start_line,
                        func2.end_line,
                    );
                    println!("  Similarity: {:.2}%", similarity * 100.0);
                }
                println!();
                Ok(similar_pairs.len())
            } else {
                Ok(0)
            }
        }
        Err(e) => {
            eprintln!("Error processing {}: {}", file.display(), e);
            Ok(0)
        }
    }
}

fn check_cross_file_duplicates(
    files: &[PathBuf],
    threshold: f64,
    options: &TSEDOptions,
) -> anyhow::Result<()> {
    let mut file_contents = Vec::new();

    for file in files {
        match fs::read_to_string(file) {
            Ok(code) => {
                file_contents.push((file.to_string_lossy().to_string(), code));
            }
            Err(e) => {
                eprintln!("Error reading {}: {}", file.display(), e);
            }
        }
    }

    match find_similar_functions_across_files(&file_contents, threshold, options) {
        Ok(similar_pairs) => {
            if similar_pairs.is_empty() {
                println!("No duplicate functions found across files!");
            } else {
                println!("Duplicate functions across files:");
                println!("{}", "=".repeat(60));

                for (file1, func1, file2, func2, similarity) in &similar_pairs {
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
                }

                println!("\nTotal duplicate pairs found: {}", similar_pairs.len());
            }
        }
        Err(e) => {
            eprintln!("Error during cross-file analysis: {}", e);
        }
    }

    Ok(())
}
