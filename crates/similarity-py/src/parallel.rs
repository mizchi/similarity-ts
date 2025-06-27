#![allow(clippy::uninlined_format_args)]

use rayon::prelude::*;
use similarity_core::{
    apted::compute_edit_distance,
    cli_parallel::{FileData, SimilarityResult},
    language_parser::{GenericFunctionDef, LanguageParser},
    tsed::TSEDOptions,
};
use std::fs;
use std::path::PathBuf;

/// Python file with its content and extracted functions
#[allow(dead_code)]
pub type PythonFileData = FileData<GenericFunctionDef>;

/// Load and parse Python files in parallel
#[allow(dead_code)]
pub fn load_files_parallel(files: &[PathBuf]) -> Vec<PythonFileData> {
    files
        .par_iter()
        .filter_map(|file| {
            match fs::read_to_string(file) {
                Ok(content) => {
                    let filename = file.to_string_lossy();
                    // Create Python parser
                    match similarity_py::python_parser::PythonParser::new() {
                        Ok(mut parser) => {
                            // Extract functions
                            match parser.extract_functions(&content, &filename) {
                                Ok(functions) => {
                                    Some(FileData { path: file.clone(), content, functions })
                                }
                                Err(e) => {
                                    eprintln!("Error parsing {}: {}", file.display(), e);
                                    None
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("Error creating parser for {}: {}", file.display(), e);
                            None
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Error reading {}: {}", file.display(), e);
                    None
                }
            }
        })
        .collect()
}

/// Check for duplicates within Python files in parallel
pub fn check_within_file_duplicates_parallel(
    files: &[PathBuf],
    threshold: f64,
    options: &TSEDOptions,
) -> Vec<(PathBuf, Vec<SimilarityResult<GenericFunctionDef>>)> {
    files
        .par_iter()
        .filter_map(|file| match fs::read_to_string(file) {
            Ok(code) => {
                let file_str = file.to_string_lossy();

                // Create Python parser
                match similarity_py::python_parser::PythonParser::new() {
                    Ok(mut parser) => {
                        // Extract functions
                        match parser.extract_functions(&code, &file_str) {
                            Ok(functions) => {
                                let mut similar_pairs = Vec::new();

                                // Compare all pairs within the file
                                for i in 0..functions.len() {
                                    for j in (i + 1)..functions.len() {
                                        let func1 = &functions[i];
                                        let func2 = &functions[j];

                                        // Skip if functions don't meet minimum requirements
                                        if func1.end_line - func1.start_line + 1 < options.min_lines
                                            || func2.end_line - func2.start_line + 1
                                                < options.min_lines
                                        {
                                            continue;
                                        }

                                        // Extract function bodies
                                        let lines: Vec<&str> = code.lines().collect();
                                        let body1 = extract_function_body(&lines, func1);
                                        let body2 = extract_function_body(&lines, func2);

                                        // Calculate similarity using Python parser
                                        let similarity = match (
                                            parser.parse(&body1, &format!("{}:func1", file_str)),
                                            parser.parse(&body2, &format!("{}:func2", file_str)),
                                        ) {
                                            (Ok(tree1), Ok(tree2)) => {
                                                let dist = compute_edit_distance(
                                                    &tree1,
                                                    &tree2,
                                                    &options.apted_options,
                                                );
                                                let size1 = tree1.get_subtree_size();
                                                let size2 = tree2.get_subtree_size();
                                                let max_size = size1.max(size2) as f64;
                                                if max_size > 0.0 {
                                                    1.0 - (dist / max_size)
                                                } else {
                                                    1.0
                                                }
                                            }
                                            _ => 0.0,
                                        };

                                        if similarity >= threshold {
                                            similar_pairs.push(SimilarityResult::new(
                                                func1.clone(),
                                                func2.clone(),
                                                similarity,
                                            ));
                                        }
                                    }
                                }

                                if similar_pairs.is_empty() {
                                    None
                                } else {
                                    Some((file.clone(), similar_pairs))
                                }
                            }
                            Err(_) => None,
                        }
                    }
                    Err(_) => None,
                }
            }
            Err(_) => None,
        })
        .collect()
}

/// Extract function body from lines
fn extract_function_body(lines: &[&str], func: &GenericFunctionDef) -> String {
    let start_idx = (func.body_start_line.saturating_sub(1)) as usize;
    let end_idx = std::cmp::min(func.body_end_line as usize, lines.len());

    if start_idx >= lines.len() {
        return String::new();
    }

    lines[start_idx..end_idx].join("\n")
}
