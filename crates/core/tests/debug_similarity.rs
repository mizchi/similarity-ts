use similarity_core::{calculate_tsed, parse_and_convert_to_tree, TSEDOptions};
use std::rc::Rc;

#[test]
fn debug_high_similarity_issue() {
    // Test the problematic case: extractTokensFromAST vs getNodeLabel
    let code1 = r#"
function extractTokensFromAST(ast: any): string[] {
    const tokens: string[] = [];
    function traverse(node: any) {
        if (!node) return;
        if (node.type) tokens.push(node.type);
    }
    traverse(ast);
    return tokens;
}
"#;

    let code2 = r#"
function getNodeLabel(node: TreeNode): string {
    switch (node.type) {
        case 'Identifier': return 'ID';
        case 'StringLiteral': return 'STR';
        default: return node.type || 'UNKNOWN';
    }
}
"#;

    // Parse both functions to trees
    let tree1 = parse_and_convert_to_tree("test1.ts", code1).unwrap();
    let tree2 = parse_and_convert_to_tree("test2.ts", code2).unwrap();

    println!("Tree1 size: {}", tree1.get_subtree_size());
    println!("Tree2 size: {}", tree2.get_subtree_size());

    // Test with different rename costs
    for rename_cost in &[0.1, 0.3, 0.5, 0.7, 1.0] {
        let mut options = TSEDOptions::default();
        options.apted_options.rename_cost = *rename_cost;

        let similarity = calculate_tsed(&tree1, &tree2, &options);
        println!("Rename cost {}: similarity = {:.2}%", rename_cost, similarity * 100.0);
    }

    // Print tree structure
    print_tree(&tree1, 0);
    println!("\n---\n");
    print_tree(&tree2, 0);
}

fn print_tree(node: &Rc<similarity_core::tree::TreeNode>, depth: usize) {
    let indent = "  ".repeat(depth);
    println!("{}{}", indent, node.label);
    for child in &node.children {
        print_tree(child, depth + 1);
    }
}
