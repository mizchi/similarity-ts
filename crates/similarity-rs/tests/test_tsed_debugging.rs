use similarity_core::language_parser::LanguageParser;
use similarity_core::{
    apted::APTEDOptions,
    tsed::{calculate_tsed, TSEDOptions},
};
use similarity_rs::rust_parser::RustParser;

#[test]
fn test_short_function_similarity() {
    let mut parser = RustParser::new().unwrap();

    let code1 = "a + b";
    let code2 = "a - b";
    let code3 = "a * b";

    let tree1 = parser.parse(code1, "test1.rs").unwrap();
    let tree2 = parser.parse(code2, "test2.rs").unwrap();
    let tree3 = parser.parse(code3, "test3.rs").unwrap();

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
    let sim23 = calculate_tsed(&tree2, &tree3, &options);

    println!("Tree1 size: {}", tree1.get_subtree_size());
    println!("Tree2 size: {}", tree2.get_subtree_size());
    println!("Tree3 size: {}", tree3.get_subtree_size());
    println!("Similarity between 'a + b' and 'a - b': {:.2}%", sim12 * 100.0);
    println!("Similarity between 'a + b' and 'a * b': {:.2}%", sim13 * 100.0);
    println!("Similarity between 'a - b' and 'a * b': {:.2}%", sim23 * 100.0);

    // These should not be 100% similar due to different operators
    assert!(sim12 < 1.0, "Different operators should not be 100% similar");
    assert!(sim13 < 1.0, "Different operators should not be 100% similar");
    assert!(sim23 < 1.0, "Different operators should not be 100% similar");

    // With size penalty, short functions should have reduced similarity
    assert!(sim12 < 0.85, "Short functions with different operators should have low similarity");
}
