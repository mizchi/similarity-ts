#![allow(clippy::uninlined_format_args)]

use similarity_core::language_parser::LanguageParser;
use similarity_core::{calculate_enhanced_similarity, APTEDOptions, EnhancedSimilarityOptions};
use similarity_rs::rust_parser::RustParser;

#[test]
fn test_different_functions_should_have_low_similarity() {
    let code1 = r#"
fn add(a: i32, b: i32) -> i32 {
    a + b
}
"#;

    let code2 = r#"
fn multiply(x: i32, y: i32) -> i32 {
    x * y
}
"#;

    let mut parser = RustParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.rs").unwrap();
    let tree2 = parser.parse(code2, "test2.rs").unwrap();

    let options = EnhancedSimilarityOptions {
        structural_weight: 0.7,
        size_weight: 0.2,
        type_distribution_weight: 0.1,
        min_size_ratio: 0.5,
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: true, // Compare both label and value
        },
    };

    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);

    // Debug output
    println!("Tree1 size: {}", tree1.get_subtree_size());
    println!("Tree2 size: {}", tree2.get_subtree_size());
    println!("Similarity: {}", similarity);

    // Different functions should have similarity below 0.7
    assert!(similarity < 0.7, "Similarity was too high: {}", similarity);
}

#[test]
fn test_empty_functions_should_not_be_identical() {
    let code1 = r#"
fn foo() {}
"#;

    let code2 = r#"
fn bar() {}
"#;

    let mut parser = RustParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.rs").unwrap();
    let tree2 = parser.parse(code2, "test2.rs").unwrap();

    let options = EnhancedSimilarityOptions {
        structural_weight: 0.7,
        size_weight: 0.2,
        type_distribution_weight: 0.1,
        min_size_ratio: 0.5,
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: true,
        },
    };

    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);

    // Empty functions with different names should not be identical
    assert!(similarity < 1.0, "Empty functions were identical: {}", similarity);
}

#[test]
fn test_test_functions_should_not_be_identical() {
    let code1 = r#"
#[test]
fn test_addition() {
    assert_eq!(2 + 2, 4);
}
"#;

    let code2 = r#"
#[test]
fn test_multiplication() {
    assert_eq!(2 * 3, 6);
}
"#;

    let mut parser = RustParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.rs").unwrap();
    let tree2 = parser.parse(code2, "test2.rs").unwrap();

    let options = EnhancedSimilarityOptions {
        structural_weight: 0.7,
        size_weight: 0.2,
        type_distribution_weight: 0.1,
        min_size_ratio: 0.5,
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: true,
        },
    };

    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);

    // Different test functions should not be identical (but can be very similar)
    assert!(similarity < 1.0, "Test functions were identical: {}", similarity);
}

#[test]
fn test_similar_functions_should_be_detected() {
    let code1 = r#"
fn process_items(items: &[i32]) -> Vec<i32> {
    let mut result = Vec::new();
    for item in items {
        if *item > 0 {
            result.push(item * 2);
        }
    }
    result
}
"#;

    let code2 = r#"
fn handle_items(data: &[i32]) -> Vec<i32> {
    let mut output = Vec::new();
    for d in data {
        if *d > 0 {
            output.push(d * 2);
        }
    }
    output
}
"#;

    let mut parser = RustParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.rs").unwrap();
    let tree2 = parser.parse(code2, "test2.rs").unwrap();

    let options = EnhancedSimilarityOptions {
        structural_weight: 0.7,
        size_weight: 0.2,
        type_distribution_weight: 0.1,
        min_size_ratio: 0.5,
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: true,
        },
    };

    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);

    // These functions are genuinely similar and should be detected
    assert!(similarity > 0.8, "Similar functions were not detected: {}", similarity);
}
