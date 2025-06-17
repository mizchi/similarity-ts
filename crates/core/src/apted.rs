use crate::tree::TreeNode;
use std::collections::HashMap;
use std::rc::Rc;

#[derive(Debug, Clone)]
pub struct APTEDOptions {
    pub rename_cost: f64,
    pub delete_cost: f64,
    pub insert_cost: f64,
}

impl Default for APTEDOptions {
    fn default() -> Self {
        APTEDOptions { rename_cost: 1.0, delete_cost: 1.0, insert_cost: 1.0 }
    }
}

#[must_use]
#[allow(clippy::cast_precision_loss)]
pub fn compute_edit_distance(
    tree1: &Rc<TreeNode>,
    tree2: &Rc<TreeNode>,
    options: &APTEDOptions,
) -> f64 {
    let mut memo: HashMap<(usize, usize), f64> = HashMap::new();
    compute_edit_distance_recursive(tree1, tree2, options, &mut memo)
}

fn compute_edit_distance_recursive(
    node1: &Rc<TreeNode>,
    node2: &Rc<TreeNode>,
    options: &APTEDOptions,
    memo: &mut HashMap<(usize, usize), f64>,
) -> f64 {
    let key = (node1.id, node2.id);

    if let Some(&cost) = memo.get(&key) {
        return cost;
    }

    // Base cases
    if node1.children.is_empty() && node2.children.is_empty() {
        // Both are leaves
        let cost = if node1.label == node2.label { 0.0 } else { options.rename_cost };
        memo.insert(key, cost);
        return cost;
    }

    // Calculate costs for all three operations
    let delete_all_cost = options.delete_cost * node1.get_subtree_size() as f64;
    let insert_all_cost = options.insert_cost * node2.get_subtree_size() as f64;

    // Calculate rename + optimal children alignment
    let mut rename_plus_cost = if node1.label == node2.label { 0.0 } else { options.rename_cost };

    if !node1.children.is_empty() || !node2.children.is_empty() {
        // Compute all pairwise costs between children
        let mut child_cost_matrix: HashMap<(usize, usize), f64> = HashMap::new();

        for child1 in &node1.children {
            for child2 in &node2.children {
                let cost = compute_edit_distance_recursive(child1, child2, options, memo);
                child_cost_matrix.insert((child1.id, child2.id), cost);
            }
        }

        // Find optimal alignment
        let (alignment_cost, _) = compute_children_alignment(
            &node1.children,
            &node2.children,
            &child_cost_matrix,
            options,
        );

        rename_plus_cost += alignment_cost;
    }

    let min_cost = delete_all_cost.min(insert_all_cost).min(rename_plus_cost);
    memo.insert(key, min_cost);
    min_cost
}

fn compute_children_alignment(
    children1: &[Rc<TreeNode>],
    children2: &[Rc<TreeNode>],
    cost_matrix: &HashMap<(usize, usize), f64>,
    options: &APTEDOptions,
) -> (f64, HashMap<usize, Option<usize>>) {
    let m = children1.len();
    let n = children2.len();

    // dp[i][j] = minimum cost to align first i children of node1 with first j children of node2
    let mut dp = vec![vec![0.0; n + 1]; m + 1];

    // Initialize base cases
    for i in 1..=m {
        dp[i][0] = dp[i - 1][0] + options.delete_cost * children1[i - 1].get_subtree_size() as f64;
    }
    for j in 1..=n {
        dp[0][j] = dp[0][j - 1] + options.insert_cost * children2[j - 1].get_subtree_size() as f64;
    }

    // Fill DP table
    for i in 1..=m {
        for j in 1..=n {
            let child1 = &children1[i - 1];
            let child2 = &children2[j - 1];
            let edit_cost = cost_matrix.get(&(child1.id, child2.id)).unwrap_or(&0.0);

            dp[i][j] = (dp[i - 1][j] + options.delete_cost * child1.get_subtree_size() as f64)
                .min(dp[i][j - 1] + options.insert_cost * child2.get_subtree_size() as f64)
                .min(dp[i - 1][j - 1] + edit_cost);
        }
    }

    // Backtrack to find alignment
    let mut alignment = HashMap::new();
    let mut i = m;
    let mut j = n;

    while i > 0 || j > 0 {
        if i == 0 {
            j -= 1;
        } else if j == 0 {
            alignment.insert(children1[i - 1].id, None);
            i -= 1;
        } else {
            let child1 = &children1[i - 1];
            let child2 = &children2[j - 1];
            let edit_cost = cost_matrix.get(&(child1.id, child2.id)).unwrap_or(&0.0);

            let delete_cost = dp[i - 1][j] + options.delete_cost * child1.get_subtree_size() as f64;
            let insert_cost = dp[i][j - 1] + options.insert_cost * child2.get_subtree_size() as f64;
            let match_cost = dp[i - 1][j - 1] + edit_cost;

            if match_cost <= delete_cost && match_cost <= insert_cost {
                alignment.insert(child1.id, Some(child2.id));
                i -= 1;
                j -= 1;
            } else if delete_cost <= insert_cost {
                alignment.insert(child1.id, None);
                i -= 1;
            } else {
                j -= 1;
            }
        }
    }

    (dp[m][n], alignment)
}
