use similarity_core::{
    find_function_overlaps, find_overlaps_across_files, OverlapOptions,
};
use std::collections::HashMap;

#[test]
fn test_exact_duplicate_blocks() {
    let code = r#"
function validateUser(user) {
    // Validation block 1
    if (!user.email) {
        throw new Error('Email is required');
    }
    if (!user.email.includes('@')) {
        throw new Error('Invalid email format');
    }
    if (user.email.length > 100) {
        throw new Error('Email too long');
    }
    
    // Other logic...
    processUser(user);
}

function validateAdmin(admin) {
    // Exact same validation block
    if (!admin.email) {
        throw new Error('Email is required');
    }
    if (!admin.email.includes('@')) {
        throw new Error('Invalid email format');
    }
    if (admin.email.length > 100) {
        throw new Error('Email too long');
    }
    
    // Different logic
    grantAdminRights(admin);
}
"#;

    let options = OverlapOptions {
        min_window_size: 3,  // Lower to catch smaller patterns
        max_window_size: 25,
        threshold: 0.5,      // Lower threshold
        size_tolerance: 0.5, // More tolerance
    };

    let overlaps = find_function_overlaps(code, code, &options).unwrap();
    
    eprintln!("Found {} overlaps", overlaps.len());
    for overlap in &overlaps {
        eprintln!("Overlap: {} vs {}, similarity: {}, nodes: {}", 
            overlap.source_function, overlap.target_function, overlap.similarity, overlap.node_count);
    }
    
    // Should detect the duplicate validation blocks
    assert!(!overlaps.is_empty(), "Should detect duplicate validation blocks");
    
    // Check that we found overlaps with high similarity
    let high_similarity = overlaps.iter().any(|o| o.similarity > 0.9);
    assert!(high_similarity, "Should find high similarity overlaps");
}

#[test]
fn test_similar_loop_patterns() {
    let code = r#"
function sumPositiveNumbers(numbers) {
    let total = 0;
    for (let i = 0; i < numbers.length; i++) {
        if (numbers[i] > 0) {
            total += numbers[i];
        }
    }
    return total;
}

function countNegativeNumbers(values) {
    let count = 0;
    for (let i = 0; i < values.length; i++) {
        if (values[i] < 0) {
            count++;
        }
    }
    return count;
}

function findMaxValue(items) {
    let max = items[0];
    for (let i = 1; i < items.length; i++) {
        if (items[i] > max) {
            max = items[i];
        }
    }
    return max;
}
"#;

    let options = OverlapOptions {
        min_window_size: 3,
        max_window_size: 15,
        threshold: 0.5,
        size_tolerance: 0.4,
    };

    let overlaps = find_function_overlaps(code, code, &options).unwrap();
    
    // Should detect similar loop patterns
    assert!(!overlaps.is_empty(), "Should detect similar loop patterns");
    
    // Should find multiple overlaps due to similar structure
    assert!(overlaps.len() >= 2, "Should find multiple similar patterns");
}

#[test]
fn test_nested_loop_duplication() {
    let code = r#"
function findDuplicatesMethod1(arr) {
    const duplicates = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
                duplicates.push(arr[i]);
            }
        }
    }
    return duplicates;
}

function findCommonElements(arr1, arr2) {
    const common = [];
    for (let i = 0; i < arr1.length; i++) {
        for (let j = 0; j < arr2.length; j++) {
            if (arr1[i] === arr2[j] && !common.includes(arr1[i])) {
                common.push(arr1[i]);
            }
        }
    }
    return common;
}
"#;

    let options = OverlapOptions {
        min_window_size: 3,
        max_window_size: 30,
        threshold: 0.5,
        size_tolerance: 0.4,
    };

    let overlaps = find_function_overlaps(code, code, &options).unwrap();
    
    // Should detect the similar nested loop structure
    assert!(!overlaps.is_empty(), "Should detect nested loop patterns");
}

#[test]
fn test_error_handling_patterns() {
    let code = r#"
async function fetchUserData(userId) {
    try {
        const response = await api.get(`/users/${userId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch user: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching user:', error);
        return { success: false, error: error.message };
    }
}

async function fetchProductData(productId) {
    try {
        const response = await api.get(`/products/${productId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch product: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching product:', error);
        return { success: false, error: error.message };
    }
}
"#;

    let options = OverlapOptions {
        min_window_size: 3,
        max_window_size: 25,
        threshold: 0.5,
        size_tolerance: 0.4,
    };

    let overlaps = find_function_overlaps(code, code, &options).unwrap();
    
    // Should detect the similar try-catch patterns
    assert!(!overlaps.is_empty(), "Should detect try-catch patterns");
    
    // Should find the common error handling structure
    let error_handling_overlap = overlaps.iter().any(|o| o.node_count > 10);
    assert!(error_handling_overlap, "Should find substantial overlap in error handling");
}

#[test]
fn test_cross_file_overlaps() {
    let mut files = HashMap::new();
    
    files.insert("utils.js".to_string(), r#"
export function processItems(items) {
    const results = [];
    for (const item of items) {
        if (item.active && item.value > 0) {
            results.push({
                id: item.id,
                processedValue: item.value * 2,
                timestamp: Date.now()
            });
        }
    }
    return results;
}

export function validateData(data) {
    if (!data) throw new Error('Data is required');
    if (!Array.isArray(data)) throw new Error('Data must be an array');
    if (data.length === 0) throw new Error('Data cannot be empty');
    return true;
}
"#.to_string());

    files.insert("helpers.js".to_string(), r#"
function transformElements(elements) {
    const transformed = [];
    for (const element of elements) {
        if (element.active && element.value > 0) {
            transformed.push({
                id: element.id,
                processedValue: element.value * 2,
                timestamp: Date.now()
            });
        }
    }
    return transformed;
}

function checkInput(input) {
    if (!input) throw new Error('Input is required');
    if (!Array.isArray(input)) throw new Error('Input must be an array');
    if (input.length === 0) throw new Error('Input cannot be empty');
    return true;
}
"#.to_string());

    let options = OverlapOptions {
        min_window_size: 8,
        max_window_size: 25,
        threshold: 0.75,
        size_tolerance: 0.25,
    };

    let overlaps = find_overlaps_across_files(&files, &options).unwrap();
    
    // Should detect cross-file overlaps
    assert!(!overlaps.is_empty(), "Should detect cross-file overlaps");
    
    // Should find overlaps between utils.js and helpers.js
    let cross_file = overlaps.iter().any(|o| 
        o.source_file != o.target_file
    );
    assert!(cross_file, "Should find overlaps across different files");
}

#[test]
fn test_no_false_positives_for_different_logic() {
    let code = r#"
function calculateSum(numbers) {
    let sum = 0;
    for (let i = 0; i < numbers.length; i++) {
        sum += numbers[i];
    }
    return sum;
}

function calculateProduct(numbers) {
    let product = 1;
    for (let i = 0; i < numbers.length; i++) {
        product *= numbers[i];
    }
    return product;
}
"#;

    let options = OverlapOptions {
        min_window_size: 10,
        max_window_size: 30,
        threshold: 0.9,  // High threshold
        size_tolerance: 0.1,  // Tight tolerance
    };

    let overlaps = find_function_overlaps(code, code, &options).unwrap();
    
    // With strict parameters, should not detect as overlap
    // (different operations: += vs *=)
    assert!(
        overlaps.is_empty() || overlaps.iter().all(|o| o.similarity < 0.9),
        "Should not have high similarity for different operations"
    );
}

#[test]
fn test_partial_overlap_in_complex_function() {
    let code = r#"
function complexProcessor(data, options) {
    // Validation phase
    if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data');
    }
    
    const config = options || {};
    const threshold = config.threshold || 10;
    
    // Processing phase - this part is duplicated
    const results = [];
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.value > threshold) {
            results.push({
                id: item.id,
                processed: item.value * 2,
                status: 'processed'
            });
        }
    }
    
    // Post-processing
    return {
        results,
        count: results.length,
        timestamp: Date.now()
    };
}

function simpleProcessor(items) {
    const output = [];
    // Similar processing logic
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.value > 10) {
            output.push({
                id: item.id,
                processed: item.value * 2,
                status: 'processed'
            });
        }
    }
    return output;
}
"#;

    let options = OverlapOptions {
        min_window_size: 3,
        max_window_size: 20,
        threshold: 0.5,
        size_tolerance: 0.4,
    };

    let overlaps = find_function_overlaps(code, code, &options).unwrap();
    
    // Should detect the similar processing loop
    assert!(!overlaps.is_empty(), "Should detect partial overlap in complex function");
    
    // The overlap should be substantial (the processing loop)
    let substantial_overlap = overlaps.iter().any(|o| o.node_count >= 10);
    assert!(substantial_overlap, "Should find substantial overlap");
}