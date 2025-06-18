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
                "\n\x1b[36m--- {}:{} (lines {}-{}) ---\x1b[0m",
                file_path, function_name, start_line, end_line
            );
            println!("{}", code);
        }
        Err(e) => {
            eprintln!("Error reading file {}: {}", file_path, e);
        }
    }
}

pub fn check_paths(
    paths: Vec<String>,
    threshold: f64,
    rename_cost: f64,
    extensions: Option<&Vec<String>>,
    min_lines: u32,
    no_size_penalty: bool,
    print: bool,
) -> anyhow::Result<()> {
    let default_extensions = vec!["ts", "tsx", "js", "jsx"];
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
        println!("No TypeScript/JavaScript files found in specified paths");
        return Ok(());
    }

    println!("Checking {} files for duplicates...\n", files.len());

    let mut options = TSEDOptions::default();
    options.apted_options.rename_cost = rename_cost;
    options.min_lines = min_lines;
    options.size_penalty = !no_size_penalty;

    // Check both within files and across files
    let mut all_duplicates = Vec::new();
    
    // First check within each file
    for file in &files {
        match check_file_duplicates(file, threshold, &options, print) {
            Ok(pairs) => all_duplicates.extend(pairs),
            Err(e) => eprintln!("Error checking {}: {}", file.display(), e),
        }
    }
    
    // Then check across files
    check_cross_file_duplicates(&files, threshold, &options, print, all_duplicates.len() > 0);

    Ok(())
}

fn check_file_duplicates(
    file: &Path,
    threshold: f64,
    options: &TSEDOptions,
    print: bool,
) -> anyhow::Result<Vec<ts_similarity_core::SimilarityResult>> {
    let code = fs::read_to_string(file)?;
    let file_str = file.to_string_lossy();

    match find_similar_functions_in_file(&file_str, &code, threshold, options) {
        Ok(similar_pairs) => {
            if !similar_pairs.is_empty() {
                println!("Duplicates in {}:", file.display());
                println!("{}", "-".repeat(60));
                
                // Sort by priority (impact * similarity)
                let mut sorted_pairs = similar_pairs.clone();
                sorted_pairs.sort_by(|a, b| {
                    let priority_a = (a.impact as f64) * a.similarity;
                    let priority_b = (b.impact as f64) * b.similarity;
                    priority_b.partial_cmp(&priority_a).unwrap_or(std::cmp::Ordering::Equal)
                });

                for result in &sorted_pairs {
                    // Get relative path from current directory
                    let relative_path = if let Ok(current_dir) = std::env::current_dir() {
                        file.strip_prefix(&current_dir)
                            .unwrap_or(file)
                            .to_string_lossy()
                            .to_string()
                    } else {
                        file.to_string_lossy().to_string()
                    };

                    let priority = (result.impact as f64) * result.similarity;
                    println!(
                        "  Similarity: {:.2}%, Priority: {:.1} (lines: {})",
                        result.similarity * 100.0,
                        priority,
                        result.impact
                    );
                    println!(
                        "    {}",
                        format_function_output(
                            &relative_path,
                            &result.func1.name,
                            result.func1.start_line,
                            result.func1.end_line,
                        )
                    );
                    println!(
                        "    {}",
                        format_function_output(
                            &relative_path,
                            &result.func2.name,
                            result.func2.start_line,
                            result.func2.end_line,
                        )
                    );

                    if print {
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
                Ok(sorted_pairs)
            } else {
                Ok(vec![])
            }
        }
        Err(e) => {
            // Skip files with parse errors silently
            if e.contains("Parse errors:") {
                // Just skip this file
                Ok(vec![])
            } else {
                eprintln!("Error in {}: {e}", file.display());
                Ok(vec![])
            }
        }
    }
}

fn check_cross_file_duplicates(
    files: &[PathBuf],
    threshold: f64,
    options: &TSEDOptions,
    print: bool,
    has_within_file_duplicates: bool,
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
                if !has_within_file_duplicates {
                    println!("\nNo duplicate functions found!");
                }
            } else {
                if has_within_file_duplicates {
                    println!();
                }
                println!("Duplicate functions across files:");
                println!("{}", "-".repeat(60));
                
                // Sort by priority (impact * similarity)
                let mut sorted_pairs = similar_pairs.clone();
                sorted_pairs.sort_by(|(_, a, _), (_, b, _)| {
                    let priority_a = (a.impact as f64) * a.similarity;
                    let priority_b = (b.impact as f64) * b.similarity;
                    priority_b.partial_cmp(&priority_a).unwrap_or(std::cmp::Ordering::Equal)
                });

                for (file1, result, file2) in &sorted_pairs {
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

                    let priority = (result.impact as f64) * result.similarity;
                    println!(
                        "\nSimilarity: {:.2}%, Priority: {:.1} (lines: {})",
                        result.similarity * 100.0,
                        priority,
                        result.impact
                    );
                    println!(
                        "  {}",
                        format_function_output(
                            &relative_path1,
                            &result.func1.name,
                            result.func1.start_line,
                            result.func1.end_line,
                        )
                    );
                    println!(
                        "  {}",
                        format_function_output(
                            &relative_path2,
                            &result.func2.name,
                            result.func2.start_line,
                            result.func2.end_line,
                        )
                    );

                    if print {
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

                println!("\nTotal duplicate pairs found: {}", sorted_pairs.len());
            }
        }
        Err(e) => {
            // Silently skip parse errors
            if !e.contains("Parse errors:") {
                eprintln!("Error during cross-file analysis: {e}");
            }
        }
    }
}
