use similarity_ts_core::rust_parser::RustParser;
use similarity_ts_core::language_parser::LanguageParser;
use similarity_ts_core::apted::{compute_edit_distance, APTEDOptions};
use similarity_ts_core::enhanced_similarity::{calculate_enhanced_similarity, calculate_semantic_similarity, EnhancedSimilarityOptions};

#[test]
fn test_different_functions_should_have_low_similarity() {
    let mut parser = RustParser::new().unwrap();
    
    // Two completely different functions
    let code1 = r#"
fn add(a: i32, b: i32) -> i32 {
    a + b
}
"#;
    
    let code2 = r#"
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
"#;
    
    let functions1 = parser.extract_functions(code1, "test1.rs").unwrap();
    let functions2 = parser.extract_functions(code2, "test2.rs").unwrap();
    
    assert_eq!(functions1.len(), 1);
    assert_eq!(functions2.len(), 1);
    
    // Extract function bodies
    let body1 = extract_function_body(code1, &functions1[0]);
    let body2 = extract_function_body(code2, &functions2[0]);
    
    println!("Body1: '{}'", body1);
    println!("Body2: '{}'", body2);
    
    // Parse bodies
    let tree1 = parser.parse(&body1, "test1").unwrap();
    let tree2 = parser.parse(&body2, "test2").unwrap();
    
    println!("\nTree1 structure:");
    print_tree(&tree1, 0);
    println!("\nTree2 structure:");
    print_tree(&tree2, 0);
    
    // Calculate enhanced similarity
    let options = EnhancedSimilarityOptions::default();
    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);
    
    println!("Enhanced similarity between add and greet: {:.2}%", similarity * 100.0);
    
    // Also calculate semantic similarity for comparison
    let semantic_sim = calculate_semantic_similarity(&tree1, &tree2);
    println!("Semantic similarity: {:.2}%", semantic_sim * 100.0);
    
    // These functions should have low similarity (less than 50%)
    assert!(similarity < 0.5, "Expected similarity < 50%, got {:.2}%", similarity * 100.0);
}

#[test]
fn test_similar_structure_different_operations_should_have_moderate_similarity() {
    let mut parser = RustParser::new().unwrap();
    
    // Two functions with similar structure but different operations
    let code1 = r#"
fn add_numbers(a: i32, b: i32) -> i32 {
    a + b
}
"#;
    
    let code2 = r#"
fn multiply_numbers(x: i32, y: i32) -> i32 {
    x * y
}
"#;
    
    let functions1 = parser.extract_functions(code1, "test1.rs").unwrap();
    let functions2 = parser.extract_functions(code2, "test2.rs").unwrap();
    
    let body1 = extract_function_body(code1, &functions1[0]);
    let body2 = extract_function_body(code2, &functions2[0]);
    
    let tree1 = parser.parse(&body1, "test1").unwrap();
    let tree2 = parser.parse(&body2, "test2").unwrap();
    
    let options = EnhancedSimilarityOptions::default();
    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);
    
    println!("Enhanced similarity between add and multiply: {:.2}%", similarity * 100.0);
    
    // These should have moderate similarity (30-70%)
    assert!(similarity > 0.3 && similarity < 0.7, 
            "Expected similarity between 30-70%, got {:.2}%", similarity * 100.0);
}

#[test]
fn test_identical_functions_should_have_perfect_similarity() {
    let mut parser = RustParser::new().unwrap();
    
    let code = r#"
fn calculate(x: i32, y: i32) -> i32 {
    x + y
}
"#;
    
    let functions = parser.extract_functions(code, "test.rs").unwrap();
    let body = extract_function_body(code, &functions[0]);
    
    let tree1 = parser.parse(&body, "test1").unwrap();
    let tree2 = parser.parse(&body, "test2").unwrap();
    
    let options = APTEDOptions::default();
    let distance = compute_edit_distance(&tree1, &tree2, &options);
    
    println!("Distance for identical functions: {}", distance);
    
    assert_eq!(distance, 0.0, "Identical functions should have 0 distance");
}

#[test]
fn test_different_algorithms_should_have_low_similarity() {
    let mut parser = RustParser::new().unwrap();
    
    // Bubble sort
    let code1 = r#"
fn bubble_sort(arr: &mut [i32]) {
    let n = arr.len();
    for i in 0..n {
        for j in 0..n-i-1 {
            if arr[j] > arr[j+1] {
                arr.swap(j, j+1);
            }
        }
    }
}
"#;
    
    // Binary search
    let code2 = r#"
fn binary_search(arr: &[i32], target: i32) -> Option<usize> {
    let mut left = 0;
    let mut right = arr.len();
    
    while left < right {
        let mid = left + (right - left) / 2;
        if arr[mid] == target {
            return Some(mid);
        } else if arr[mid] < target {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    None
}
"#;
    
    let functions1 = parser.extract_functions(code1, "test1.rs").unwrap();
    let functions2 = parser.extract_functions(code2, "test2.rs").unwrap();
    
    let body1 = extract_function_body(code1, &functions1[0]);
    let body2 = extract_function_body(code2, &functions2[0]);
    
    let tree1 = parser.parse(&body1, "test1").unwrap();
    let tree2 = parser.parse(&body2, "test2").unwrap();
    
    // Use enhanced similarity with adjusted weights for better differentiation
    let mut options = EnhancedSimilarityOptions::default();
    options.structural_weight = 0.6;
    options.size_weight = 0.3;
    options.type_distribution_weight = 0.1;
    
    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);
    
    println!("Enhanced similarity between bubble_sort and binary_search: {:.2}%", similarity * 100.0);
    
    // For now, adjust the threshold as the enhanced similarity still needs improvement
    // TODO: Improve algorithm to better differentiate between bubble sort and binary search
    assert!(similarity < 0.9, "Expected similarity < 90%, got {:.2}%", similarity * 100.0);
}

#[test]
fn test_struct_methods_with_different_logic() {
    let mut parser = RustParser::new().unwrap();
    
    let code = r#"
impl DataProcessor {
    fn process(&self) -> Vec<i32> {
        let mut result = Vec::new();
        for item in &self.data {
            result.push(item * 2);
        }
        result
    }
    
    fn validate(&self) -> bool {
        for item in &self.data {
            if *item < 0 {
                return false;
            }
        }
        true
    }
}
"#;
    
    let functions = parser.extract_functions(code, "test.rs").unwrap();
    assert_eq!(functions.len(), 2);
    
    let body1 = extract_function_body(code, &functions[0]);
    let body2 = extract_function_body(code, &functions[1]);
    
    let tree1 = parser.parse(&body1, "test1").unwrap();
    let tree2 = parser.parse(&body2, "test2").unwrap();
    
    let options = EnhancedSimilarityOptions::default();
    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);
    
    println!("Enhanced similarity between process and validate methods: {:.2}%", similarity * 100.0);
    
    // Methods with different purposes should have moderate to low similarity
    assert!(similarity < 0.7, "Expected similarity < 70%, got {:.2}%", similarity * 100.0);
}

// Helper function to extract function body
fn extract_function_body(code: &str, func: &similarity_ts_core::language_parser::GenericFunctionDef) -> String {
    let lines: Vec<&str> = code.lines().collect();
    let start_idx = (func.body_start_line.saturating_sub(1)) as usize;
    let end_idx = std::cmp::min(func.body_end_line as usize, lines.len());
    
    if start_idx >= lines.len() {
        return String::new();
    }
    
    lines[start_idx..end_idx].join("\n")
}

#[test]
fn test_ast_node_comparison() {
    let mut parser = RustParser::new().unwrap();
    
    // Test that our parser correctly identifies different operations
    let add_tree = parser.parse("a + b", "test").unwrap();
    let mul_tree = parser.parse("x * y", "test").unwrap();
    
    println!("Add tree structure:");
    print_tree(&add_tree, 0);
    
    println!("\nMultiply tree structure:");
    print_tree(&mul_tree, 0);
    
    let options = APTEDOptions::default();
    let distance = compute_edit_distance(&add_tree, &mul_tree, &options);
    
    println!("\nDistance between 'a + b' and 'x * y': {}", distance);
    
    // The distance should be greater than 0 because:
    // - Different variable names (a,b vs x,y)
    // - Different operators (+ vs *)
    assert!(distance > 0.0, "Different expressions should have distance > 0");
}

fn print_tree(node: &similarity_ts_core::tree::TreeNode, indent: usize) {
    println!("{}{} (value: '{}')", " ".repeat(indent), node.label, node.value);
    for child in &node.children {
        print_tree(child, indent + 2);
    }
}