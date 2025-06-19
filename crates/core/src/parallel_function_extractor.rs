use crate::function_extractor::{
    compare_functions, extract_functions, FunctionDefinition, SimilarityResult,
};
use crate::parallel_parser::parse_files_batched;
use crate::tsed::TSEDOptions;
use rayon::prelude::*;
use std::path::Path;
use std::sync::Arc;

type CrossFileSimilarityResult = Vec<(String, SimilarityResult, String)>;

/// File with extracted functions
#[derive(Debug, Clone)]
pub struct FileWithFunctions {
    pub filename: String,
    pub source: String,
    pub functions: Vec<FunctionDefinition>,
}

/// Extract functions from multiple files in parallel
pub fn extract_functions_parallel(
    files: Vec<(Arc<Path>, String)>,
) -> Result<Vec<FileWithFunctions>, String> {
    // Parse files in parallel to validate syntax
    let parse_results = parse_files_batched(files, None);
    
    // Extract functions from successfully parsed files
    let results: Result<Vec<_>, String> = parse_results
        .into_par_iter()
        .filter(|result| result.parsed)
        .map(|result| {
            let filename = result.path.to_string_lossy().to_string();
            extract_functions(&filename, &result.content).map(|functions| FileWithFunctions {
                filename,
                source: result.content,
                functions,
            })
        })
        .collect();
    
    results
}

/// Find similar functions across multiple files using parallel processing
pub fn find_similar_functions_across_files_parallel(
    files: Vec<(Arc<Path>, String)>,
    threshold: f64,
    options: &TSEDOptions,
) -> Result<CrossFileSimilarityResult, String> {
    // Extract functions from all files in parallel
    let file_functions = extract_functions_parallel(files)?;
    
    // Create a flat list of all functions with their file info
    let mut all_functions = Vec::new();
    for file_data in &file_functions {
        for func in &file_data.functions {
            all_functions.push((
                file_data.filename.clone(),
                file_data.source.clone(),
                func.clone(),
            ));
        }
    }
    
    // Generate all pairs to compare (only across different files)
    let mut pairs_to_compare = Vec::new();
    for i in 0..all_functions.len() {
        for j in (i + 1)..all_functions.len() {
            let (file1, _, _) = &all_functions[i];
            let (file2, _, _) = &all_functions[j];
            
            // Skip if same file
            if file1 == file2 {
                continue;
            }
            
            pairs_to_compare.push((i, j));
        }
    }
    
    // Compare pairs in parallel
    let similar_pairs: Vec<_> = pairs_to_compare
        .into_par_iter()
        .filter_map(|(i, j)| {
            let (file1, source1, func1) = &all_functions[i];
            let (file2, source2, func2) = &all_functions[j];
            
            match compare_functions(func1, func2, source1, source2, options) {
                Ok(similarity) => {
                    if similarity >= threshold {
                        Some((
                            file1.clone(),
                            SimilarityResult::new(func1.clone(), func2.clone(), similarity),
                            file2.clone(),
                        ))
                    } else {
                        None
                    }
                }
                Err(_) => None,
            }
        })
        .collect();
    
    // Sort by impact and similarity
    let mut results = similar_pairs;
    results.sort_by(|a, b| {
        let (_, result_a, _) = a;
        let (_, result_b, _) = b;
        result_b
            .impact
            .cmp(&result_a.impact)
            .then(result_b.similarity.partial_cmp(&result_a.similarity).unwrap_or(std::cmp::Ordering::Equal))
    });
    
    Ok(results)
}

/// Find similar functions within the same file using parallel processing
pub fn find_similar_functions_in_file_parallel(
    filename: &str,
    source_text: &str,
    threshold: f64,
    options: &TSEDOptions,
) -> Result<Vec<SimilarityResult>, String> {
    let functions = extract_functions(filename, source_text)?;
    
    // Generate all pairs to compare
    let mut pairs: Vec<(usize, usize)> = Vec::new();
    for i in 0..functions.len() {
        for j in (i + 1)..functions.len() {
            pairs.push((i, j));
        }
    }
    
    // Compare pairs in parallel
    let similar_pairs: Vec<_> = pairs
        .into_par_iter()
        .filter_map(|(i, j)| {
            match compare_functions(&functions[i], &functions[j], source_text, source_text, options) {
                Ok(similarity) => {
                    if similarity >= threshold {
                        Some(SimilarityResult::new(
                            functions[i].clone(),
                            functions[j].clone(),
                            similarity,
                        ))
                    } else {
                        None
                    }
                }
                Err(_) => None,
            }
        })
        .collect();
    
    // Sort by impact (descending), then by similarity (descending)
    let mut results = similar_pairs;
    results.sort_by(|a, b| {
        b.impact
            .cmp(&a.impact)
            .then(b.similarity.partial_cmp(&a.similarity).unwrap_or(std::cmp::Ordering::Equal))
    });
    
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_parallel_function_extraction() {
        let files = vec![
            (
                Arc::from(PathBuf::from("test1.ts").as_path()),
                "function foo() { return 1; }\nfunction bar() { return 2; }".to_string(),
            ),
            (
                Arc::from(PathBuf::from("test2.ts").as_path()),
                "function baz() { return 3; }".to_string(),
            ),
        ];

        let result = extract_functions_parallel(files).unwrap();
        assert_eq!(result.len(), 2);
        
        // First file should have 2 functions
        assert_eq!(result[0].functions.len(), 2);
        // Second file should have 1 function
        assert_eq!(result[1].functions.len(), 1);
    }

    #[test]
    fn test_parallel_similarity_in_file() {
        let source = r#"
            function add(a, b) {
                return a + b;
            }
            
            function sum(x, y) {
                return x + y;
            }
            
            function multiply(a, b) {
                return a * b;
            }
        "#;

        let options = TSEDOptions {
            size_penalty: false,
            ..TSEDOptions::default()
        };
        
        // Test with non-parallel version first
        use crate::function_extractor::find_similar_functions_in_file;
        let result_non_parallel = find_similar_functions_in_file("test.ts", source, 0.7, &options).unwrap();
        println!("Non-parallel found {} similar pairs", result_non_parallel.len());
        for r in &result_non_parallel {
            println!("  {} vs {} = {}", r.func1.name, r.func2.name, r.similarity);
        }
        
        // Now test parallel version
        let result = find_similar_functions_in_file_parallel("test.ts", source, 0.7, &options).unwrap();
        println!("Parallel found {} similar pairs", result.len());
        for r in &result {
            println!("  {} vs {} = {}", r.func1.name, r.func2.name, r.similarity);
        }
        
        // add and sum should be similar
        assert!(!result.is_empty());
        assert!(result[0].similarity > 0.7);
    }

    #[test]
    fn test_parallel_cross_file_similarity() {
        let files = vec![
            (
                Arc::from(PathBuf::from("file1.ts").as_path()),
                r#"
                function calculate(a, b) {
                    return a + b;
                }
                "#.to_string(),
            ),
            (
                Arc::from(PathBuf::from("file2.ts").as_path()),
                r#"
                function compute(x, y) {
                    return x + y;
                }
                "#.to_string(),
            ),
        ];

        let options = TSEDOptions {
            size_penalty: false,
            ..TSEDOptions::default()
        };
        let result = find_similar_functions_across_files_parallel(files, 0.7, &options).unwrap();
        
        // calculate and compute should be similar
        assert!(!result.is_empty());
        assert!(result[0].1.similarity > 0.7);
    }
}