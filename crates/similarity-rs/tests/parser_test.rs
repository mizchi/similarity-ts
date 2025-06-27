#![allow(clippy::uninlined_format_args)]

use similarity_core::language_parser::LanguageParser;
use similarity_rs::rust_parser::RustParser;

#[test]
fn test_parser_parses_complete_function() {
    let code = r#"
fn add(a: i32, b: i32) -> i32 {
    a + b
}
"#;

    let mut parser = RustParser::new().unwrap();
    let tree = parser.parse(code, "test.rs").unwrap();

    // The tree should contain function signature elements
    let tree_str = format!("{:?}", tree);
    println!("Parsed tree: {}", tree_str);

    // Check tree size is reasonable (not just the body)
    let size = tree.get_subtree_size();
    println!("Tree size: {}", size);
    assert!(size > 10, "Tree too small, might be parsing only body: {}", size);
}

#[test]
fn test_parser_differentiates_function_names() {
    let code1 = "fn foo() {}";
    let code2 = "fn bar() {}";

    let mut parser = RustParser::new().unwrap();
    let tree1 = parser.parse(code1, "test.rs").unwrap();
    let tree2 = parser.parse(code2, "test.rs").unwrap();

    // Trees should be different even for empty functions with different names
    assert_ne!(
        format!("{:?}", tree1),
        format!("{:?}", tree2),
        "Functions with different names should produce different trees"
    );
}
