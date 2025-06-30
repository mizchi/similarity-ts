use crate::tree::TreeNode;
use serde::{Deserialize, Serialize};
use std::rc::Rc;

/// Serializable version of TreeNode for external exchange
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializableTreeNode {
    pub label: String,
    pub value: String,
    pub children: Vec<SerializableTreeNode>,
    pub id: usize,
}

impl From<&TreeNode> for SerializableTreeNode {
    fn from(node: &TreeNode) -> Self {
        SerializableTreeNode {
            label: node.label.clone(),
            value: node.value.clone(),
            children: node.children.iter().map(|child| child.as_ref().into()).collect(),
            id: node.id,
        }
    }
}

impl From<SerializableTreeNode> for TreeNode {
    fn from(node: SerializableTreeNode) -> Self {
        let mut tree_node = TreeNode::new(node.label, node.value, node.id);
        for child in node.children {
            tree_node.add_child(Rc::new(child.into()));
        }
        tree_node
    }
}

/// Function definition for external exchange
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExchangeFunctionDef {
    pub name: String,
    pub start_line: u32,
    pub end_line: u32,
    pub body_start_line: u32,
    pub body_end_line: u32,
    pub ast: SerializableTreeNode,
}

/// Complete AST exchange format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ASTExchange {
    pub language: String,
    pub filename: String,
    pub functions: Vec<ExchangeFunctionDef>,
    pub full_ast: Option<SerializableTreeNode>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tree_node_serialization() {
        let mut root = TreeNode::new("function".to_string(), "foo".to_string(), 0);
        root.add_child(Rc::new(TreeNode::new("params".to_string(), "".to_string(), 1)));
        root.add_child(Rc::new(TreeNode::new("body".to_string(), "".to_string(), 2)));

        let serializable: SerializableTreeNode = (&root).into();
        let json = serde_json::to_string(&serializable).unwrap();
        let deserialized: SerializableTreeNode = serde_json::from_str(&json).unwrap();
        let restored: TreeNode = deserialized.into();

        assert_eq!(root.label, restored.label);
        assert_eq!(root.children.len(), restored.children.len());
    }
}