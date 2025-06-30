use crate::tree::TreeNode;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::rc::Rc;

/// Fingerprint for a subtree in the AST
#[derive(Debug, Clone)]
pub struct SubtreeFingerprint {
    /// Number of nodes in this subtree
    pub weight: u32,
    /// Hash of the entire subtree structure
    pub hash: u64,
    /// Hashes of direct child nodes
    pub child_hashes: Vec<u64>,
    /// Starting line number in the source code
    pub start_line: u32,
    /// Ending line number in the source code
    pub end_line: u32,
    /// Type of the root node of this subtree
    pub node_type: String,
    /// Depth of this subtree in the parent tree
    pub depth: u32,
}

impl SubtreeFingerprint {
    /// Check if two fingerprints might represent similar subtrees
    pub fn might_be_similar(&self, other: &SubtreeFingerprint, size_tolerance: f64) -> bool {
        // Quick hash check for exact matches
        if self.hash == other.hash {
            return true;
        }

        // Check if sizes are within tolerance
        let size_ratio = self.weight as f64 / other.weight as f64;
        if size_ratio < (1.0 - size_tolerance) || size_ratio > (1.0 + size_tolerance) {
            return false;
        }

        // Skip node type check for windows (synthetic fingerprints)
        if !self.node_type.starts_with("Window[") && !other.node_type.starts_with("Window[") {
            // Check if node types match only for non-window fingerprints
            if self.node_type != other.node_type {
                return false;
            }
        }

        // Check child hash overlap
        if !self.child_hashes.is_empty() && !other.child_hashes.is_empty() {
            let overlap =
                self.child_hashes.iter().filter(|h| other.child_hashes.contains(h)).count();
            let min_children = self.child_hashes.len().min(other.child_hashes.len());
            return overlap as f64 / min_children as f64 > 0.5;
        }

        true
    }
}

/// Index of functions with their subtree fingerprints
#[derive(Debug, Clone)]
pub struct IndexedFunction {
    /// Function name
    pub name: String,
    /// File path
    pub file_path: String,
    /// Root fingerprint of the entire function
    pub root_fingerprint: SubtreeFingerprint,
    /// Map from subtree hash to all subtrees with that hash
    pub subtree_index: HashMap<u64, Vec<SubtreeFingerprint>>,
    /// Map from subtree size to all subtrees of that size
    pub size_index: HashMap<u32, Vec<SubtreeFingerprint>>,
    /// Bloom filter for quick overlap detection (represented as u128 for simplicity)
    pub bloom_bits: u128,
}

impl IndexedFunction {
    /// Create a new indexed function
    pub fn new(name: String, file_path: String, root_fingerprint: SubtreeFingerprint) -> Self {
        Self {
            name,
            file_path,
            root_fingerprint,
            subtree_index: HashMap::new(),
            size_index: HashMap::new(),
            bloom_bits: 0,
        }
    }

    /// Add a subtree fingerprint to the index
    pub fn add_subtree(&mut self, fingerprint: SubtreeFingerprint) {
        // Update hash index
        self.subtree_index.entry(fingerprint.hash).or_default().push(fingerprint.clone());

        // Update size index
        self.size_index.entry(fingerprint.weight).or_default().push(fingerprint.clone());

        // Update bloom filter
        self.update_bloom_filter(&fingerprint);
    }

    /// Get all subtrees of a specific size
    pub fn get_subtrees_by_size(&self, size: u32) -> Vec<&SubtreeFingerprint> {
        self.size_index.get(&size).map(|v| v.iter().collect()).unwrap_or_default()
    }

    /// Get subtrees within a size range
    pub fn get_subtrees_in_size_range(
        &self,
        min_size: u32,
        max_size: u32,
    ) -> Vec<&SubtreeFingerprint> {
        self.size_index
            .iter()
            .filter(|(size, _)| **size >= min_size && **size <= max_size)
            .flat_map(|(_, subtrees)| subtrees.iter())
            .collect()
    }

    /// Update bloom filter with subtree fingerprint
    fn update_bloom_filter(&mut self, fingerprint: &SubtreeFingerprint) {
        // Simple bloom filter using 3 hash functions
        let h1 = fingerprint.hash;
        let h2 = fingerprint.hash.wrapping_mul(0x9e3779b97f4a7c15); // Golden ratio
        let h3 = fingerprint.hash.wrapping_mul(0x517cc1b727220a95); // Another prime

        self.bloom_bits |= 1u128 << (h1 % 128);
        self.bloom_bits |= 1u128 << (h2 % 128);
        self.bloom_bits |= 1u128 << (h3 % 128);
    }

    /// Check if bloom filters might overlap
    pub fn might_overlap(&self, other: &IndexedFunction) -> bool {
        (self.bloom_bits & other.bloom_bits) != 0
    }
}

/// Result of partial overlap detection
#[derive(Debug, Clone)]
pub struct PartialOverlap {
    /// Source function name
    pub source_function: String,
    /// Target function name
    pub target_function: String,
    /// Line range in source function
    pub source_lines: (u32, u32),
    /// Line range in target function
    pub target_lines: (u32, u32),
    /// Similarity score (0.0 to 1.0)
    pub similarity: f64,
    /// Number of nodes in the overlapping region
    pub node_count: u32,
    /// Type of the root node of the overlapping subtree
    pub node_type: String,
}

/// Options for overlap detection
#[derive(Debug, Clone)]
pub struct OverlapOptions {
    /// Minimum window size (in number of nodes)
    pub min_window_size: u32,
    /// Maximum window size (in number of nodes)
    pub max_window_size: u32,
    /// Similarity threshold (0.0 to 1.0)
    pub threshold: f64,
    /// Size tolerance for quick filtering (e.g., 0.2 for 20% tolerance)
    pub size_tolerance: f64,
}

impl Default for OverlapOptions {
    fn default() -> Self {
        Self { min_window_size: 10, max_window_size: 100, threshold: 0.8, size_tolerance: 0.2 }
    }
}

/// Generate fingerprint for a tree node and all its subtrees
pub fn generate_subtree_fingerprints(
    node: &Rc<TreeNode>,
    depth: u32,
    parent_line_offset: u32,
) -> (SubtreeFingerprint, Vec<SubtreeFingerprint>) {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    let mut all_fingerprints = Vec::new();
    let mut child_hashes = Vec::new();
    let mut total_weight = 1u32; // Current node counts as 1

    // Hash the node type/label
    node.label.hash(&mut hasher);

    // Process children
    for child in &node.children {
        let (child_fp, child_subtrees) =
            generate_subtree_fingerprints(child, depth + 1, parent_line_offset);

        // Add child's hash to our list
        child_hashes.push(child_fp.hash);
        child_fp.hash.hash(&mut hasher);

        // Add child's weight to total
        total_weight += child_fp.weight;

        // Collect all subtree fingerprints
        all_fingerprints.push(child_fp);
        all_fingerprints.extend(child_subtrees);
    }

    // Hash the value if not empty
    if !node.value.is_empty() {
        node.value.hash(&mut hasher);
    }

    let hash = hasher.finish();

    // Calculate line numbers (simplified - using node id as proxy for line numbers)
    let start_line = parent_line_offset + node.id as u32;
    let end_line = start_line + total_weight;

    let fingerprint = SubtreeFingerprint {
        weight: total_weight,
        hash,
        child_hashes,
        start_line,
        end_line,
        node_type: node.label.clone(),
        depth,
    };

    (fingerprint, all_fingerprints)
}

/// Create sliding windows of subtrees
pub fn create_sliding_windows(
    indexed_func: &IndexedFunction,
    window_size: u32,
) -> Vec<SubtreeFingerprint> {
    let mut windows = Vec::new();

    // Get all subtrees sorted by start line
    let mut all_subtrees: Vec<&SubtreeFingerprint> =
        indexed_func.subtree_index.values().flatten().collect();
    all_subtrees.sort_by_key(|fp| fp.start_line);

    // Create windows by combining adjacent subtrees
    for i in 0..all_subtrees.len() {
        let mut current_weight = 0;
        let mut window_hashes = Vec::new();
        let mut hasher = std::collections::hash_map::DefaultHasher::new();

        for j in i..all_subtrees.len() {
            current_weight += all_subtrees[j].weight;
            window_hashes.push(all_subtrees[j].hash);
            all_subtrees[j].hash.hash(&mut hasher);

            if current_weight >= window_size {
                // Create a synthetic fingerprint for this window
                let window_fp = SubtreeFingerprint {
                    weight: current_weight,
                    hash: hasher.finish(),
                    child_hashes: window_hashes.clone(),
                    start_line: all_subtrees[i].start_line,
                    end_line: all_subtrees[j].end_line,
                    node_type: format!("Window[{}..{}]", i, j),
                    depth: 0,
                };
                windows.push(window_fp);
                break;
            }
        }
    }

    windows
}

/// Detect partial overlaps between two functions
pub fn detect_partial_overlaps(
    source_func: &IndexedFunction,
    target_func: &IndexedFunction,
    options: &OverlapOptions,
) -> Vec<PartialOverlap> {
    let mut overlaps = Vec::new();

    // Quick bloom filter check
    if !source_func.might_overlap(target_func) {
        #[cfg(test)]
        eprintln!("Bloom filter check failed for {} vs {}", source_func.name, target_func.name);
        return overlaps;
    }

    #[cfg(test)]
    eprintln!("Bloom filter passed for {} vs {}", source_func.name, target_func.name);

    // For each window size
    for window_size in options.min_window_size..=options.max_window_size {
        // Get source windows
        let source_windows = create_sliding_windows(source_func, window_size);

        // Get target subtrees in the size range
        let size_min = ((window_size as f64) * (1.0 - options.size_tolerance)) as u32;
        let size_max = ((window_size as f64) * (1.0 + options.size_tolerance)) as u32;
        let target_subtrees = target_func.get_subtrees_in_size_range(size_min, size_max);

        #[cfg(test)]
        if !source_windows.is_empty() && !target_subtrees.is_empty() {
            eprintln!(
                "Window size {}: {} source windows, {} target subtrees",
                window_size,
                source_windows.len(),
                target_subtrees.len()
            );
        }

        // Compare each source window with target subtrees
        for source_window in &source_windows {
            for target_subtree in &target_subtrees {
                #[cfg(test)]
                {
                    let similar =
                        source_window.might_be_similar(target_subtree, options.size_tolerance);
                    if window_size == 5 && !similar {
                        eprintln!("might_be_similar returned false for window size 5");
                        eprintln!(
                            "  source: weight={}, type={}",
                            source_window.weight, source_window.node_type
                        );
                        eprintln!(
                            "  target: weight={}, type={}",
                            target_subtree.weight, target_subtree.node_type
                        );
                    }
                }

                if source_window.might_be_similar(target_subtree, options.size_tolerance) {
                    // For exact hash matches, similarity is 1.0
                    let similarity = if source_window.hash == target_subtree.hash {
                        1.0
                    } else {
                        // Calculate detailed similarity (would use TSED here)
                        calculate_fingerprint_similarity(source_window, target_subtree)
                    };

                    #[cfg(test)]
                    if similarity > 0.5 {
                        eprintln!(
                            "Found potential match: similarity={}, window_size={}",
                            similarity, window_size
                        );
                    }

                    if similarity >= options.threshold {
                        overlaps.push(PartialOverlap {
                            source_function: source_func.name.clone(),
                            target_function: target_func.name.clone(),
                            source_lines: (source_window.start_line, source_window.end_line),
                            target_lines: (target_subtree.start_line, target_subtree.end_line),
                            similarity,
                            node_count: source_window.weight,
                            node_type: target_subtree.node_type.clone(),
                        });
                    }
                }
            }
        }
    }

    // Sort by similarity and remove duplicates
    overlaps.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());
    deduplicate_overlaps(overlaps)
}

/// Calculate similarity between two fingerprints
fn calculate_fingerprint_similarity(fp1: &SubtreeFingerprint, fp2: &SubtreeFingerprint) -> f64 {
    // Simple Jaccard similarity on child hashes
    if fp1.child_hashes.is_empty() || fp2.child_hashes.is_empty() {
        return 0.5; // No children to compare
    }

    let set1: std::collections::HashSet<_> = fp1.child_hashes.iter().collect();
    let set2: std::collections::HashSet<_> = fp2.child_hashes.iter().collect();

    let intersection = set1.intersection(&set2).count();
    let union = set1.union(&set2).count();

    if union == 0 {
        0.0
    } else {
        intersection as f64 / union as f64
    }
}

/// Remove duplicate/overlapping results
fn deduplicate_overlaps(overlaps: Vec<PartialOverlap>) -> Vec<PartialOverlap> {
    if overlaps.is_empty() {
        return overlaps;
    }

    let mut result = vec![overlaps[0].clone()];

    for overlap in overlaps.into_iter().skip(1) {
        let is_duplicate = result.iter().any(|existing| {
            // Check if this overlap is contained within an existing one
            let source_contained = overlap.source_lines.0 >= existing.source_lines.0
                && overlap.source_lines.1 <= existing.source_lines.1;
            let target_contained = overlap.target_lines.0 >= existing.target_lines.0
                && overlap.target_lines.1 <= existing.target_lines.1;

            source_contained && target_contained
        });

        if !is_duplicate {
            result.push(overlap);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subtree_fingerprint_similarity() {
        let fp1 = SubtreeFingerprint {
            weight: 10,
            hash: 12345,
            child_hashes: vec![1, 2, 3],
            start_line: 10,
            end_line: 20,
            node_type: "Function".to_string(),
            depth: 1,
        };

        let fp2 = SubtreeFingerprint {
            weight: 11,
            hash: 12346,
            child_hashes: vec![1, 2, 4],
            start_line: 30,
            end_line: 40,
            node_type: "Function".to_string(),
            depth: 1,
        };

        assert!(fp1.might_be_similar(&fp2, 0.2));

        let fp3 = SubtreeFingerprint {
            weight: 20,
            hash: 99999,
            child_hashes: vec![5, 6, 7],
            start_line: 50,
            end_line: 70,
            node_type: "Function".to_string(),
            depth: 1,
        };

        assert!(!fp1.might_be_similar(&fp3, 0.2));
    }

    #[test]
    fn test_indexed_function() {
        let root_fp = SubtreeFingerprint {
            weight: 50,
            hash: 1000,
            child_hashes: vec![],
            start_line: 1,
            end_line: 50,
            node_type: "Function".to_string(),
            depth: 0,
        };

        let mut indexed =
            IndexedFunction::new("testFunc".to_string(), "test.ts".to_string(), root_fp);

        indexed.add_subtree(SubtreeFingerprint {
            weight: 10,
            hash: 1001,
            child_hashes: vec![],
            start_line: 5,
            end_line: 10,
            node_type: "IfStatement".to_string(),
            depth: 1,
        });

        indexed.add_subtree(SubtreeFingerprint {
            weight: 10,
            hash: 1002,
            child_hashes: vec![],
            start_line: 15,
            end_line: 20,
            node_type: "ForStatement".to_string(),
            depth: 1,
        });

        assert_eq!(indexed.get_subtrees_by_size(10).len(), 2);
        assert_eq!(indexed.get_subtrees_in_size_range(5, 15).len(), 2);
    }
}
