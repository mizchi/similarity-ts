use crate::TSEDOptions;
use rayon::prelude::*;
use std::fs;
use std::path::PathBuf;

/// Generic file data structure for any language
#[derive(Debug)]
pub struct FileData<F> {
    pub path: PathBuf,
    pub content: String,
    pub functions: Vec<F>,
}

/// Trait for extracting functions from source code
pub trait FunctionExtractor {
    type Function: Clone + Send + Sync;

    fn extract_functions(
        &self,
        filename: &str,
        content: &str,
    ) -> Result<Vec<Self::Function>, Box<dyn std::error::Error>>;
}

/// Generic similarity result
#[derive(Debug, Clone)]
pub struct SimilarityResult<F> {
    pub func1: F,
    pub func2: F,
    pub similarity: f64,
}

impl<F> SimilarityResult<F> {
    pub fn new(func1: F, func2: F, similarity: f64) -> Self {
        Self { func1, func2, similarity }
    }
}

/// Trait for finding similar functions
pub trait SimilarityChecker {
    type Function: Clone + Send + Sync;

    fn find_similar_in_file(
        &self,
        filename: &str,
        content: &str,
        threshold: f64,
        options: &TSEDOptions,
        fast_mode: bool,
    ) -> Result<Vec<SimilarityResult<Self::Function>>, Box<dyn std::error::Error>>;

    fn compare_functions(
        &self,
        func1: &Self::Function,
        func2: &Self::Function,
        content1: &str,
        content2: &str,
        options: &TSEDOptions,
    ) -> Result<f64, Box<dyn std::error::Error>>;
}

/// Load and parse files in parallel using a generic extractor
pub fn load_files_parallel<E>(files: &[PathBuf], extractor: &E) -> Vec<FileData<E::Function>>
where
    E: FunctionExtractor + Sync,
    E::Function: Send,
{
    files
        .par_iter()
        .filter_map(|file| {
            match fs::read_to_string(file) {
                Ok(content) => {
                    let filename = file.to_string_lossy();
                    // Extract functions, skip if parse error
                    match extractor.extract_functions(&filename, &content) {
                        Ok(functions) => Some(FileData { path: file.clone(), content, functions }),
                        Err(_) => None, // Skip files with parse errors
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

/// Check for duplicates within files in parallel
pub fn check_within_file_duplicates_parallel<S>(
    files: &[PathBuf],
    threshold: f64,
    options: &TSEDOptions,
    fast_mode: bool,
    checker: &S,
) -> Vec<(PathBuf, Vec<SimilarityResult<S::Function>>)>
where
    S: SimilarityChecker + Sync,
{
    files
        .par_iter()
        .filter_map(|file| match fs::read_to_string(file) {
            Ok(code) => {
                let file_str = file.to_string_lossy();

                match checker.find_similar_in_file(&file_str, &code, threshold, options, fast_mode)
                {
                    Ok(pairs) if !pairs.is_empty() => Some((file.clone(), pairs)),
                    _ => None,
                }
            }
            Err(_) => None,
        })
        .collect()
}

/// Check for duplicates across files using parallel processing
pub fn check_cross_file_duplicates_parallel<S>(
    file_data: &[FileData<S::Function>],
    threshold: f64,
    options: &TSEDOptions,
    checker: &S,
) -> Vec<(String, SimilarityResult<S::Function>, String)>
where
    S: SimilarityChecker + Sync,
    S::Function: Clone + Send + Sync,
{
    // Prepare all function pairs with file information
    let mut all_functions = Vec::new();
    for data in file_data {
        let filename = data.path.to_string_lossy().to_string();
        for func in &data.functions {
            all_functions.push((filename.clone(), data.content.clone(), func.clone()));
        }
    }

    // Generate all cross-file pairs
    let mut pairs_to_check = Vec::new();
    for i in 0..all_functions.len() {
        for j in (i + 1)..all_functions.len() {
            let (file1, _, _) = &all_functions[i];
            let (file2, _, _) = &all_functions[j];

            // Only check across different files
            if file1 != file2 {
                pairs_to_check.push((i, j));
            }
        }
    }

    // Process pairs in parallel
    pairs_to_check
        .into_par_iter()
        .filter_map(|(i, j)| {
            let (file1, content1, func1) = &all_functions[i];
            let (file2, content2, func2) = &all_functions[j];

            // Use checker's compare_functions
            match checker.compare_functions(func1, func2, content1, content2, options) {
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
        .collect()
}
