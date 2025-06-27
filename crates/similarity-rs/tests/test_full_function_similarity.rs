use similarity_core::language_parser::LanguageParser;
use similarity_core::{
    apted::APTEDOptions,
    tsed::{calculate_tsed, TSEDOptions},
};
use similarity_rs::rust_parser::RustParser;

#[test]
fn test_full_function_similarity() {
    let mut parser = RustParser::new().unwrap();

    let func1 = "fn add(a: i32, b: i32) -> i32 { a + b }";
    let func2 = "fn sub(a: i32, b: i32) -> i32 { a - b }";
    let func3 = "fn mul(a: i32, b: i32) -> i32 { a * b }";

    let tree1 = parser.parse(func1, "test1.rs").unwrap();
    let tree2 = parser.parse(func2, "test2.rs").unwrap();
    let tree3 = parser.parse(func3, "test3.rs").unwrap();

    let options = TSEDOptions {
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: true,
        },
        min_lines: 1,
        min_tokens: None,
        size_penalty: true,
        skip_test: false,
    };

    let sim12 = calculate_tsed(&tree1, &tree2, &options);
    let sim13 = calculate_tsed(&tree1, &tree3, &options);

    println!("Tree1 size: {}", tree1.get_subtree_size());
    println!("Tree2 size: {}", tree2.get_subtree_size());
    println!("Full function similarity 'add' vs 'sub': {:.2}%", sim12 * 100.0);
    println!("Full function similarity 'add' vs 'mul': {:.2}%", sim13 * 100.0);

    // These should not be 100% similar
    assert!(sim12 < 1.0, "Different functions should not be 100% similar, got {}%", sim12 * 100.0);
    assert!(sim13 < 1.0, "Different functions should not be 100% similar, got {}%", sim13 * 100.0);
}
