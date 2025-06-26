use similarity_core::enhanced_similarity::{
    calculate_enhanced_similarity, calculate_semantic_similarity, EnhancedSimilarityOptions,
};
use similarity_core::language_parser::LanguageParser;
use similarity_core::rust_parser::RustParser;

fn main() {
    let mut parser = RustParser::new().unwrap();

    // Test case 1: Very different functions
    let code1 = "a + b";
    let code2 = r#"format!("Hello, {}!", name)"#;

    println!("Test Case 1: Simple addition vs format macro");
    test_similarity(&mut parser, code1, code2);

    // Test case 2: Different algorithms
    println!("\n\nTest Case 2: Loop vs binary operation");
    let code3 = r#"
    let n = arr.len();
    for i in 0..n {
        for j in 0..n-i-1 {
            if arr[j] > arr[j+1] {
                arr.swap(j, j+1);
            }
        }
    }
    "#;

    let code4 = r#"
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
    "#;

    test_similarity(&mut parser, code3, code4);

    // Test case 3: Similar structure different operations
    println!("\n\nTest Case 3: Similar structure, different operations");
    let code5 = "a + b";
    let code6 = "x * y";

    test_similarity(&mut parser, code5, code6);

    // Test case 4: Methods with different logic
    println!("\n\nTest Case 4: Methods with different logic");
    let code7 = r#"
        let mut result = Vec::new();
        for item in &self.data {
            result.push(item * 2);
        }
        result
    "#;

    let code8 = r#"
        for item in &self.data {
            if *item < 0 {
                return false;
            }
        }
        true
    "#;

    test_similarity(&mut parser, code7, code8);
}

fn test_similarity(parser: &mut RustParser, code1: &str, code2: &str) {
    let tree1 = parser.parse(code1, "test1").unwrap();
    let tree2 = parser.parse(code2, "test2").unwrap();

    println!("Tree1 (size: {}):", tree1.get_subtree_size());
    print_tree(&tree1, 0);

    println!("\nTree2 (size: {}):", tree2.get_subtree_size());
    print_tree(&tree2, 0);

    // Test different weight configurations
    let configs = vec![
        ("Default", EnhancedSimilarityOptions::default()),
        (
            "High structural weight",
            EnhancedSimilarityOptions {
                structural_weight: 0.9,
                size_weight: 0.05,
                type_distribution_weight: 0.05,
                ..Default::default()
            },
        ),
        (
            "Balanced",
            EnhancedSimilarityOptions {
                structural_weight: 0.5,
                size_weight: 0.3,
                type_distribution_weight: 0.2,
                ..Default::default()
            },
        ),
        (
            "Size-focused",
            EnhancedSimilarityOptions {
                structural_weight: 0.3,
                size_weight: 0.5,
                type_distribution_weight: 0.2,
                min_size_ratio: 0.5,
                ..Default::default()
            },
        ),
    ];

    println!("\nSimilarity scores:");
    for (name, options) in configs {
        let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);
        println!("  {} config: {:.2}%", name, similarity * 100.0);
    }

    let semantic_sim = calculate_semantic_similarity(&tree1, &tree2);
    println!("  Semantic similarity: {:.2}%", semantic_sim * 100.0);
}

fn print_tree(node: &similarity_core::tree::TreeNode, indent: usize) {
    println!("{}{} (value: '{}')", " ".repeat(indent), node.label, node.value);
    for child in &node.children {
        print_tree(child, indent + 2);
    }
}
