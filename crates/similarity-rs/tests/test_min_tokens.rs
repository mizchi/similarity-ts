use similarity_core::language_parser::LanguageParser;
use similarity_rs::rust_parser::RustParser;

#[test]
fn test_function_token_counts() {
    let mut parser = RustParser::new().unwrap();

    // Test various function sizes
    let test_cases = vec![
        ("fn a() { 1 }", "one liner"),
        ("fn add(a: i32, b: i32) -> i32 { a + b }", "simple add"),
        ("fn complex() -> i32 {\n    let x = 1;\n    let y = 2;\n    x + y\n}", "multi-statement"),
    ];

    for (code, desc) in test_cases {
        let tree = parser.parse(code, "test.rs").unwrap();
        let size = tree.get_subtree_size();
        println!("{}: {} tokens", desc, size);
        println!("Code: {}", code);
        println!();
    }
}
