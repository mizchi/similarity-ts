use similarity_core::apted::{compute_edit_distance, APTEDOptions};
use similarity_core::language_parser::LanguageParser;
use similarity_core::rust_parser::RustParser;

fn main() {
    let mut parser = RustParser::new().unwrap();

    let code1 = "    a + b";
    let code2 = "    format!(\"Hello, {}!\", name)";

    let tree1 = parser.parse(code1, "test1").unwrap();
    let tree2 = parser.parse(code2, "test2").unwrap();

    println!("Tree1:");
    print_tree(&tree1, 0);

    println!("\nTree2:");
    print_tree(&tree2, 0);

    let options = APTEDOptions::default();
    let distance = compute_edit_distance(&tree1, &tree2, &options);
    let max_size = tree1.get_subtree_size().max(tree2.get_subtree_size()) as f64;
    let similarity = 1.0 - (distance / max_size);

    println!("\nTree1 size: {}", tree1.get_subtree_size());
    println!("Tree2 size: {}", tree2.get_subtree_size());
    println!("Distance: {}", distance);
    println!("Similarity: {:.2}%", similarity * 100.0);
}

fn print_tree(node: &similarity_core::tree::TreeNode, indent: usize) {
    println!("{}{} (value: '{}')", " ".repeat(indent), node.label, node.value);
    for child in &node.children {
        print_tree(child, indent + 2);
    }
}
