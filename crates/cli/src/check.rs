use ignore::WalkBuilder;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use ts_similarity_core::{
    find_similar_functions_across_files, find_similar_functions_in_file, TSEDOptions,
};

/// Extract lines from file content within the specified range
fn extract_lines_from_content(content: &str, start_line: u32, end_line: u32) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let start_idx = (start_line.saturating_sub(1)) as usize;
    let end_idx = std::cmp::min(end_line as usize, lines.len());

    if start_idx >= lines.len() {
        return String::new();
    }

    lines[start_idx..end_idx].join("\n")
}

/// Format function output in VSCode-compatible format
fn format_function_output(
    file_path: &str,
    function_name: &str,
    start_line: u32,
    end_line: u32,
) -> String {
    format!(
        "{}:{} | L{}-{} similar-function: {}",
        file_path, start_line, start_line, end_line, function_name
    )
}

/// Display code content for a function
fn show_function_code(file_path: &str, function_name: &str, start_line: u32, end_line: u32) {
    match fs::read_to_string(file_path) {
        Ok(content) => {
            let code = extract_lines_from_content(&content, start_line, end_line);
            println!(
                "\n--- {}:{} (lines {}-{}) ---",
                file_path, function_name, start_line, end_line
            );
            println!("{}", code);
        }
        Err(e) => {
            eprintln!("Error reading file {}: {}", file_path, e);
        }
    }
}

pub fn check_directory(
    directory: String,
    threshold: f64,
    rename_cost: f64,
    cross_file: bool,
    extensions: Option<&Vec<String>>,
    min_lines: u32,
    no_size_penalty: bool,
    show: bool,
) -> anyhow::Result<()> {
    let default_extensions = vec!["ts", "tsx", "js", "jsx"];
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
        println!("No TypeScript/JavaScript files found in {directory}");
        return Ok(());
    }

    println!("Checking {} files for duplicates...\n", files.len());

    let mut options = TSEDOptions::default();
    options.apted_options.rename_cost = rename_cost;
    options.min_lines = min_lines;
    options.size_penalty = !no_size_penalty;

    if cross_file {
        // Check across all files
        check_cross_file_duplicates(&files, threshold, &options, show);
    } else {
        // Check each file individually
        let mut total_duplicates = 0;
        for file in &files {
            let duplicates = check_file_duplicates(file, threshold, &options, show)?;
            total_duplicates += duplicates;
        }

        if total_duplicates == 0 {
            println!("\nNo duplicate functions found!");
        } else {
            println!("\nTotal duplicate pairs found: {total_duplicates}");
        }
    }

    Ok(())
}

fn check_file_duplicates(
    file: &Path,
    threshold: f64,
    options: &TSEDOptions,
    show: bool,
) -> anyhow::Result<usize> {
    let code = fs::read_to_string(file)?;
    let file_str = file.to_string_lossy();

    match find_similar_functions_in_file(&file_str, &code, threshold, options) {
        Ok(similar_pairs) => {
            if similar_pairs.is_empty() {
                Ok(0)
            } else {
                println!("Duplicates in {}:", file.display());
                println!("{}", "-".repeat(60));

                for result in &similar_pairs {
                    // Get relative path from current directory
                    let relative_path = if let Ok(current_dir) = std::env::current_dir() {
                        file.strip_prefix(&current_dir)
                            .unwrap_or(file)
                            .to_string_lossy()
                            .to_string()
                    } else {
                        file.to_string_lossy().to_string()
                    };

                    println!(
                        "  {}",
                        format_function_output(
                            &relative_path,
                            &result.func1.name,
                            result.func1.start_line,
                            result.func1.end_line,
                        )
                    );
                    println!(
                        "  {}",
                        format_function_output(
                            &relative_path,
                            &result.func2.name,
                            result.func2.start_line,
                            result.func2.end_line,
                        )
                    );
                    println!(
                        "  Similarity: {:.2}%, Impact: {} lines",
                        result.similarity * 100.0,
                        result.impact
                    );

                    if show {
                        show_function_code(
                            &relative_path,
                            &result.func1.name,
                            result.func1.start_line,
                            result.func1.end_line,
                        );
                        show_function_code(
                            &relative_path,
                            &result.func2.name,
                            result.func2.start_line,
                            result.func2.end_line,
                        );
                    }
                }
                println!();
                Ok(similar_pairs.len())
            }
        }
        Err(e) => {
            eprintln!("Error processing {}: {e}", file.display());
            Ok(0)
        }
    }
}

fn check_cross_file_duplicates(
    files: &[PathBuf],
    threshold: f64,
    options: &TSEDOptions,
    show: bool,
) {
    let mut file_contents = Vec::new();

    for file in files {
        match fs::read_to_string(file) {
            Ok(code) => {
                file_contents.push((file.to_string_lossy().to_string(), code));
            }
            Err(e) => {
                eprintln!("Error reading {}: {e}", file.display());
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

                for (file1, result, file2) in &similar_pairs {
                    // Get relative paths from current directory
                    let relative_path1 = if let Ok(current_dir) = std::env::current_dir() {
                        Path::new(&file1)
                            .strip_prefix(&current_dir)
                            .unwrap_or(Path::new(&file1))
                            .to_string_lossy()
                            .to_string()
                    } else {
                        file1.clone()
                    };

                    let relative_path2 = if let Ok(current_dir) = std::env::current_dir() {
                        Path::new(&file2)
                            .strip_prefix(&current_dir)
                            .unwrap_or(Path::new(&file2))
                            .to_string_lossy()
                            .to_string()
                    } else {
                        file2.clone()
                    };

                    println!(
                        "\n{}",
                        format_function_output(
                            &relative_path1,
                            &result.func1.name,
                            result.func1.start_line,
                            result.func1.end_line,
                        )
                    );
                    println!(
                        "{}",
                        format_function_output(
                            &relative_path2,
                            &result.func2.name,
                            result.func2.start_line,
                            result.func2.end_line,
                        )
                    );
                    println!(
                        "Similarity: {:.2}%, Impact: {} lines",
                        result.similarity * 100.0,
                        result.impact
                    );

                    if show {
                        show_function_code(
                            &file1,
                            &result.func1.name,
                            result.func1.start_line,
                            result.func1.end_line,
                        );
                        show_function_code(
                            &file2,
                            &result.func2.name,
                            result.func2.start_line,
                            result.func2.end_line,
                        );
                    }
                }

                println!("\nTotal duplicate pairs found: {}", similar_pairs.len());
            }
        }
        Err(e) => {
            eprintln!("Error during cross-file analysis: {e}");
        }
    }
}
