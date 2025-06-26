use similarity_ts_core::rust_parser::RustParser;
use similarity_ts_core::language_parser::LanguageParser;

fn main() {
    let code = r#"
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn multiply(x: i32, y: i32) -> i32 {
    x * y
}
"#;

    let mut parser = RustParser::new().unwrap();
    let functions = parser.extract_functions(code, "test.rs").unwrap();
    
    for func in &functions {
        println!("Function: {}", func.name);
        println!("  Lines: {}-{}", func.start_line, func.end_line);
        println!("  Body: {}-{}", func.body_start_line, func.body_end_line);
        println!("  Parameters: {:?}", func.parameters);
        println!();
    }
    
    // Extract function bodies for testing
    let lines: Vec<&str> = code.lines().collect();
    for func in &functions {
        let start_idx = (func.body_start_line.saturating_sub(1)) as usize;
        let end_idx = std::cmp::min(func.body_end_line as usize, lines.len());
        let body = lines[start_idx..end_idx].join("\n");
        println!("Function {} body: '{}'", func.name, body);
    }
    
    // Test parsing - wrap in a minimal valid Rust context
    let tree1 = parser.parse("fn dummy() { a + b }", "test1").unwrap();
    let tree2 = parser.parse("fn dummy() { x * y }", "test2").unwrap();
    
    println!("\nTree1 size: {}", tree1.get_subtree_size());
    println!("Tree2 size: {}", tree2.get_subtree_size());
    
    fn print_tree(node: &similarity_ts_core::tree::TreeNode, indent: usize) {
        println!("{}{} (value: '{}')", " ".repeat(indent), node.label, node.value);
        for child in &node.children {
            print_tree(child, indent + 2);
        }
    }
    
    println!("\nTree1 structure:");
    print_tree(&tree1, 0);
    
    println!("\nTree2 structure:");
    print_tree(&tree2, 0);
}