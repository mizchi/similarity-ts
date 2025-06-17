use crate::apted::{compute_edit_distance, APTEDOptions};
use crate::tree::TreeNode;
use std::rc::Rc;

#[derive(Debug, Clone)]
pub struct TSEDOptions {
    pub apted_options: APTEDOptions,
}

impl Default for TSEDOptions {
    fn default() -> Self {
        TSEDOptions {
            apted_options: APTEDOptions {
                rename_cost: 0.3, // Default from the TypeScript implementation
                delete_cost: 1.0,
                insert_cost: 1.0,
            },
        }
    }
}

/// Calculate TSED (Tree Structure Edit Distance) similarity between two trees
/// Returns a value between 0.0 and 1.0, where 1.0 means identical
#[must_use]
#[allow(clippy::cast_precision_loss)]
pub fn calculate_tsed(tree1: &Rc<TreeNode>, tree2: &Rc<TreeNode>, options: &TSEDOptions) -> f64 {
    let distance = compute_edit_distance(tree1, tree2, &options.apted_options);

    let max_nodes = tree1.get_subtree_size().max(tree2.get_subtree_size()) as f64;

    // Normalize to 0-1 range using TSED formula
    (1.0 - distance / max_nodes).max(0.0)
}

/// Calculate TSED from TypeScript code strings
///
/// # Errors
///
/// Returns an error if parsing fails for either code string
pub fn calculate_tsed_from_code(
    code1: &str,
    code2: &str,
    filename1: &str,
    filename2: &str,
    options: &TSEDOptions,
) -> Result<f64, String> {
    use crate::parser::parse_and_convert_to_tree;

    let tree1 = parse_and_convert_to_tree(filename1, code1)?;
    let tree2 = parse_and_convert_to_tree(filename2, code2)?;

    Ok(calculate_tsed(&tree1, &tree2, options))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identical_code() {
        let code = "function add(a: number, b: number) { return a + b; }";
        let options = TSEDOptions::default();

        let similarity =
            calculate_tsed_from_code(code, code, "test1.ts", "test2.ts", &options).unwrap();
        assert!((similarity - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_renamed_function() {
        let code1 = "function add(a: number, b: number) { return a + b; }";
        let code2 = "function sum(x: number, y: number) { return x + y; }";
        let options = TSEDOptions::default();

        let similarity =
            calculate_tsed_from_code(code1, code2, "test1.ts", "test2.ts", &options).unwrap();
        // Should have high similarity due to low rename cost
        assert!(similarity > 0.8);
    }

    #[test]
    fn test_different_structure() {
        let code1 = "function test() { return 1; }";
        let code2 = "class Test { method() { return 1; } }";
        let options = TSEDOptions::default();

        let similarity =
            calculate_tsed_from_code(code1, code2, "test1.ts", "test2.ts", &options).unwrap();
        // Should have lower similarity due to structural differences
        assert!(similarity < 0.7);
    }
}
