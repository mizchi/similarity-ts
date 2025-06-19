use rayon::prelude::*;
use std::path::Path;
use std::sync::Arc;

/// Result of parsing a single file
#[derive(Debug, Clone)]
pub struct ParseResult {
    pub path: Arc<Path>,
    pub content: String,
    pub parsed: bool,
    pub error: Option<String>,
}

/// Parse multiple files in parallel using rayon
pub fn parse_files_parallel(
    file_paths: Vec<(Arc<Path>, String)>,
) -> Vec<ParseResult> {
    file_paths
        .into_par_iter()
        .map(|(path, content)| parse_single_file(path, content))
        .collect()
}

/// Parse files in batches for better memory management
pub fn parse_files_batched(
    file_paths: Vec<(Arc<Path>, String)>,
    batch_size: Option<usize>,
) -> Vec<ParseResult> {
    let batch_size = batch_size.unwrap_or_else(|| rayon::current_num_threads() * 4);
    let mut all_results = Vec::new();

    for batch in file_paths.chunks(batch_size) {
        let batch_results: Vec<ParseResult> = batch
            .par_iter()
            .map(|(path, content)| parse_single_file(path.clone(), content.clone()))
            .collect();
        
        all_results.extend(batch_results);
    }

    all_results
}

/// Parse a single file with error handling
fn parse_single_file(path: Arc<Path>, content: String) -> ParseResult {
    // We'll parse and validate the syntax, but not return the tree
    // since TreeNode uses Rc which is not Send
    use oxc_allocator::Allocator;
    use oxc_parser::Parser;
    use oxc_span::SourceType;
    
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(path.as_ref()).unwrap_or(SourceType::tsx());
    let ret = Parser::new(&allocator, &content, source_type).parse();
    
    let (parsed, error) = if !ret.errors.is_empty() {
        (false, Some(format!("Parse errors: {:?}", ret.errors)))
    } else {
        (true, None)
    };
    
    ParseResult {
        path,
        content,
        parsed,
        error,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_parallel_parsing() {
        let files = vec![
            (Arc::from(PathBuf::from("test1.ts").as_path()), "function foo() { return 1; }".to_string()),
            (Arc::from(PathBuf::from("test2.ts").as_path()), "function bar() { return 2; }".to_string()),
            (Arc::from(PathBuf::from("test3.ts").as_path()), "const x = 123;".to_string()),
        ];

        let results = parse_files_parallel(files);
        assert_eq!(results.len(), 3);
        
        // Verify all files were parsed successfully
        for result in &results {
            assert!(result.parsed);
            assert!(result.error.is_none());
        }
    }

    #[test]
    fn test_batched_parsing() {
        let files = vec![
            (Arc::from(PathBuf::from("test1.ts").as_path()), "function foo() { return 1; }".to_string()),
            (Arc::from(PathBuf::from("test2.ts").as_path()), "function bar() { return 2; }".to_string()),
            (Arc::from(PathBuf::from("test3.ts").as_path()), "const x = 123;".to_string()),
            (Arc::from(PathBuf::from("test4.ts").as_path()), "let y = 456;".to_string()),
        ];

        let results = parse_files_batched(files, Some(2));
        assert_eq!(results.len(), 4);
        
        // Verify all files were parsed successfully
        for result in &results {
            assert!(result.parsed);
            assert!(result.error.is_none());
        }
    }

    #[test]
    fn test_parse_error_handling() {
        let files = vec![
            (Arc::from(PathBuf::from("valid.ts").as_path()), "function foo() { return 1; }".to_string()),
            (Arc::from(PathBuf::from("invalid.ts").as_path()), "function foo() { ".to_string()),
        ];

        let results = parse_files_parallel(files);
        assert_eq!(results.len(), 2);
        
        // One should succeed, one should fail
        let success_count = results.iter().filter(|r| r.parsed).count();
        let error_count = results.iter().filter(|r| r.error.is_some()).count();
        
        assert_eq!(success_count, 1);
        assert_eq!(error_count, 1);
    }
}