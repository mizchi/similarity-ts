use crate::parallel::FileData;
use similarity_ts_core::{
    compare_functions, extract_functions, find_similar_functions_fast,
    find_similar_functions_in_file, FastSimilarityOptions, SimilarityResult, TSEDOptions,
};
use std::fs;
use std::path::PathBuf;

/// Load files sequentially (for benchmark comparison)
pub fn load_files_sequential(files: &[PathBuf]) -> Vec<FileData> {
    files
        .iter()
        .filter_map(|file| {
            match fs::read_to_string(file) {
                Ok(content) => {
                    let filename = file.to_string_lossy();
                    // Extract functions, skip if parse error
                    match extract_functions(&filename, &content) {
                        Ok(functions) => Some(FileData { path: file.clone(), content, functions }),
                        Err(_) => None,
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

/// Check for duplicates within files sequentially
pub fn check_within_file_duplicates_sequential(
    files: &[PathBuf],
    threshold: f64,
    options: &TSEDOptions,
    fast_mode: bool,
) -> Vec<(PathBuf, Vec<SimilarityResult>)> {
    files
        .iter()
        .filter_map(|file| match fs::read_to_string(file) {
            Ok(code) => {
                let file_str = file.to_string_lossy();

                let similar_pairs = if fast_mode {
                    let fast_options = FastSimilarityOptions {
                        fingerprint_threshold: 0.3,
                        similarity_threshold: threshold,
                        tsed_options: options.clone(),
                        debug_stats: false,
                    };
                    find_similar_functions_fast(&file_str, &code, &fast_options).ok()
                } else {
                    find_similar_functions_in_file(&file_str, &code, threshold, options).ok()
                };

                similar_pairs.and_then(|pairs| {
                    if pairs.is_empty() {
                        None
                    } else {
                        Some((file.clone(), pairs))
                    }
                })
            }
            Err(_) => None,
        })
        .collect()
}

/// Check for duplicates across files sequentially
pub fn check_cross_file_duplicates_sequential(
    file_data: &[FileData],
    threshold: f64,
    options: &TSEDOptions,
) -> Vec<(String, SimilarityResult, String)> {
    let mut results = Vec::new();

    // Prepare all function pairs with file information
    let mut all_functions = Vec::new();
    for data in file_data {
        let filename = data.path.to_string_lossy().to_string();
        for func in &data.functions {
            all_functions.push((filename.clone(), data.content.clone(), func.clone()));
        }
    }

    // Check all cross-file pairs sequentially
    for i in 0..all_functions.len() {
        for j in (i + 1)..all_functions.len() {
            let (file1, content1, func1) = &all_functions[i];
            let (file2, content2, func2) = &all_functions[j];

            // Only check across different files
            if file1 != file2 {
                if let Ok(similarity) = compare_functions(func1, func2, content1, content2, options)
                {
                    if similarity >= threshold {
                        results.push((
                            file1.clone(),
                            SimilarityResult::new(func1.clone(), func2.clone(), similarity),
                            file2.clone(),
                        ));
                    }
                }
            }
        }
    }

    results
}
