#![allow(clippy::uninlined_format_args)]

use similarity_core::language_parser::LanguageParser;
use similarity_rs::rust_parser::RustParser;

#[test]
fn debug_ast_values() {
    let code1 = r#"
fn func1(x: i32) -> i32 {
    let result = x + 1;
    result * 2
}
"#;

    let code2 = r#"
fn func2(y: i32) -> i32 {
    let temp = y + 1;
    temp * 3
}
"#;

    let mut parser = RustParser::new().unwrap();
    let tree1 = parser.parse(code1, "test.rs").unwrap();
    let tree2 = parser.parse(code2, "test.rs").unwrap();

    // Print the tree to see if values are captured
    fn print_tree(node: &similarity_core::tree::TreeNode, depth: usize) {
        let indent = "  ".repeat(depth);
        if node.value.is_empty() {
            println!("{}{}", indent, node.label);
        } else {
            println!("{}{} = '{}'", indent, node.label, node.value);
        }
        for child in &node.children {
            print_tree(child, depth + 1);
        }
    }

    println!("=== Tree 1 (func1) ===");
    print_tree(&tree1, 0);
    println!("\n=== Tree 2 (func2) ===");
    print_tree(&tree2, 0);

    // Also check similarity
    use similarity_core::{calculate_enhanced_similarity, APTEDOptions, EnhancedSimilarityOptions};
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
    println!("\nSimilarity: {}", similarity);
}
