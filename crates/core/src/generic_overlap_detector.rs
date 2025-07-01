use crate::{
    language_parser::{GenericFunctionDef, LanguageParser},
    subtree_fingerprint::{
        detect_partial_overlaps, generate_subtree_fingerprints, IndexedFunction, OverlapOptions,
        PartialOverlap,
    },
    tsed::{calculate_tsed, TSEDOptions},
};
use std::collections::HashMap;
use std::error::Error;

/// Detect overlapping code fragments between functions using a language parser
pub fn find_function_overlaps_generic(
    parser: &mut dyn LanguageParser,
    source_code: &str,
    target_code: &str,
    source_filename: &str,
    target_filename: &str,
    options: &OverlapOptions,
) -> Result<Vec<PartialOverlap>, Box<dyn Error + Send + Sync>> {
    // Extract functions using the language parser
    let source_functions = parser.extract_functions(source_code, source_filename)?;
    let target_functions = parser.extract_functions(target_code, target_filename)?;

    // Parse and index functions
    let mut all_overlaps = Vec::new();

    for source_func in &source_functions {
        let source_indexed =
            index_function_generic(parser, source_func, source_code, source_filename)?;

        for target_func in &target_functions {
            // Skip if comparing the same function in the same file
            // (but allow comparing functions with same name in different files)
            if source_func.name == target_func.name && source_code == target_code {
                continue;
            }

            let target_indexed =
                index_function_generic(parser, target_func, target_code, target_filename)?;

            // Debug output
            #[cfg(test)]
            {
                eprintln!("Comparing {} vs {}", source_func.name, target_func.name);
                eprintln!("Source subtrees: {}", source_indexed.subtree_index.len());
                eprintln!("Target subtrees: {}", target_indexed.subtree_index.len());
            }

            // Detect overlaps
            let overlaps = detect_partial_overlaps(&source_indexed, &target_indexed, options);
            all_overlaps.extend(overlaps);
        }
    }

    Ok(all_overlaps)
}

/// Detect overlaps across multiple files
pub fn find_overlaps_across_files_generic(
    parser: &mut dyn LanguageParser,
    file_contents: &HashMap<String, String>,
    options: &OverlapOptions,
) -> Result<Vec<PartialOverlapWithFiles>, Box<dyn Error + Send + Sync>> {
    let mut all_overlaps = Vec::new();
    let files: Vec<_> = file_contents.keys().collect();

    // Compare each pair of files (including same file)
    for i in 0..files.len() {
        for j in i..files.len() {
            let source_file = files[i];
            let target_file = files[j];
            let source_code = &file_contents[source_file];
            let target_code = &file_contents[target_file];

            // Find overlaps between these files
            let overlaps = find_function_overlaps_generic(
                parser,
                source_code,
                target_code,
                source_file,
                target_file,
                options,
            )?;

            // Add file information to overlaps
            for overlap in overlaps {
                all_overlaps.push(PartialOverlapWithFiles {
                    source_file: source_file.clone(),
                    target_file: target_file.clone(),
                    overlap,
                });
            }
        }
    }

    Ok(all_overlaps)
}

/// Overlap result with file information
#[derive(Debug, Clone)]
pub struct PartialOverlapWithFiles {
    pub source_file: String,
    pub target_file: String,
    pub overlap: PartialOverlap,
}

/// Index a function for overlap detection using a language parser
fn index_function_generic(
    parser: &mut dyn LanguageParser,
    func: &GenericFunctionDef,
    full_code: &str,
    file_name: &str,
) -> Result<IndexedFunction, Box<dyn Error + Send + Sync>> {
    // Extract the entire function to parse it properly
    let lines: Vec<&str> = full_code.lines().collect();
    let start_line = (func.start_line as usize).saturating_sub(1);
    let end_line = func.end_line as usize;

    if start_line >= lines.len() || end_line > lines.len() {
        return Err("Function line numbers out of bounds".into());
    }

    let func_code = lines[start_line..end_line].join("\n");

    #[cfg(test)]
    {
        eprintln!("Indexing function {}", func.name);
        eprintln!("Lines: {} - {}", func.start_line, func.end_line);
        eprintln!("Code length: {}", func_code.len());
        eprintln!("First 100 chars: {}", &func_code.chars().take(100).collect::<String>());
    }

    // Parse the function using the language parser
    let tree = parser.parse(&func_code, file_name)?;

    // Generate fingerprints for all subtrees
    let (root_fp, subtrees) = generate_subtree_fingerprints(&tree, 0, func.start_line);

    // Create indexed function
    let mut indexed = IndexedFunction::new(func.name.clone(), file_name.to_string(), root_fp);

    // Add all subtrees to the index
    for subtree in subtrees {
        indexed.add_subtree(subtree);
    }

    #[cfg(test)]
    eprintln!("Indexed {} subtrees for function {}", indexed.subtree_index.len(), func.name);

    Ok(indexed)
}

/// Find overlaps with detailed similarity calculation
pub fn find_overlaps_with_similarity_generic(
    parser: &mut dyn LanguageParser,
    source_code: &str,
    target_code: &str,
    source_filename: &str,
    target_filename: &str,
    options: &OverlapOptions,
    tsed_options: &TSEDOptions,
) -> Result<Vec<DetailedOverlap>, Box<dyn Error + Send + Sync>> {
    let overlaps = find_function_overlaps_generic(
        parser,
        source_code,
        target_code,
        source_filename,
        target_filename,
        options,
    )?;
    let mut detailed_overlaps = Vec::new();

    for overlap in overlaps {
        // For high-similarity overlaps, calculate exact TSED similarity
        if overlap.similarity > 0.9 {
            // Extract the overlapping code segments
            let source_segment =
                extract_code_segment(source_code, overlap.source_lines.0, overlap.source_lines.1)?;
            let target_segment =
                extract_code_segment(target_code, overlap.target_lines.0, overlap.target_lines.1)?;

            // Parse and calculate exact similarity
            let source_tree = parser.parse(&source_segment, source_filename)?;
            let target_tree = parser.parse(&target_segment, target_filename)?;
            let exact_similarity = calculate_tsed(&source_tree, &target_tree, tsed_options);

            detailed_overlaps.push(DetailedOverlap {
                overlap: overlap.clone(),
                exact_similarity,
                source_code: source_segment,
                target_code: target_segment,
            });
        } else {
            detailed_overlaps.push(DetailedOverlap {
                overlap: overlap.clone(),
                exact_similarity: overlap.similarity,
                source_code: String::new(),
                target_code: String::new(),
            });
        }
    }

    Ok(detailed_overlaps)
}

/// Detailed overlap with exact similarity and code snippets
#[derive(Debug, Clone)]
pub struct DetailedOverlap {
    pub overlap: PartialOverlap,
    pub exact_similarity: f64,
    pub source_code: String,
    pub target_code: String,
}

/// Extract code segment by line numbers
fn extract_code_segment(
    code: &str,
    start_line: u32,
    end_line: u32,
) -> Result<String, Box<dyn Error + Send + Sync>> {
    let lines: Vec<_> = code.lines().collect();

    if start_line as usize > lines.len() || end_line as usize > lines.len() {
        return Err("Line numbers out of bounds".into());
    }

    let start = (start_line as usize).saturating_sub(1);
    let end = (end_line as usize).min(lines.len());

    Ok(lines[start..end].join("\n"))
}
