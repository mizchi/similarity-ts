pub mod apted;
pub mod function_extractor;
pub mod parser;
pub mod tree;
pub mod tsed;

pub use apted::{compute_edit_distance, APTEDOptions};
pub use function_extractor::{
    extract_functions, find_similar_functions_across_files, find_similar_functions_in_file,
    FunctionDefinition, FunctionType, SimilarityResult,
};
pub use parser::{ast_to_tree_node, parse_and_convert_to_tree};
pub use tree::TreeNode;
pub use tsed::{calculate_tsed, calculate_tsed_from_code, TSEDOptions};
