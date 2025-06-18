use ts_similarity_core::{
    find_similar_functions_across_files, find_similar_functions_in_file, TSEDOptions,
};

#[test]
fn test_similar_functions_within_file() {
    let code = r#"
export function calculateSum(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    let total = 0;
    for (const num of numbers) {
        total += num;
    }
    
    return total;
}

export function computeTotal(values: number[]): number {
    if (values.length === 0) return 0;
    
    let sum = 0;
    for (const val of values) {
        sum += val;
    }
    
    return sum;
}
"#;

    let options = TSEDOptions::default();
    let result = find_similar_functions_in_file("test.ts", code, 0.7, &options).unwrap();

    assert!(!result.is_empty());
    assert_eq!(result.len(), 1);

    let pair = &result[0];
    assert_eq!(pair.func1.name, "calculateSum");
    assert_eq!(pair.func2.name, "computeTotal");
    assert!(pair.similarity > 0.8);
}

#[test]
fn test_dissimilar_functions_within_file() {
    let code = r#"
export function processUserData(users: User[]): ProcessedData {
    const result: ProcessedData = {
        total: users.length,
        active: 0,
        inactive: 0
    };
    
    for (const user of users) {
        if (user.isActive) {
            result.active++;
        } else {
            result.inactive++;
        }
    }
    
    return result;
}

export function calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    let sum = 0;
    for (const num of numbers) {
        sum += num;
    }
    
    return sum / numbers.length;
}
"#;

    let options = TSEDOptions::default();
    let result = find_similar_functions_in_file("test.ts", code, 0.8, &options).unwrap();

    // These functions should not be similar enough
    assert!(result.is_empty());
}

#[test]
fn test_similar_functions_across_files() {
    let file1 = (
        "file1.ts".to_string(),
        r#"
export function calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    let sum = 0;
    for (const num of numbers) {
        sum += num;
    }
    return sum / numbers.length;
}
"#
        .to_string(),
    );

    let file2 = (
        "file2.ts".to_string(),
        r#"
export function computeMean(values: number[]): number {
    if (values.length === 0) return 0;
    let sum = 0;
    for (const val of values) {
        sum += val;
    }
    return sum / values.length;
}
"#
        .to_string(),
    );

    let files = vec![file1, file2];
    let options = TSEDOptions::default();

    let result = find_similar_functions_across_files(&files, 0.7, &options).unwrap();

    assert!(!result.is_empty());
    assert_eq!(result.len(), 1);

    let (ref file1_name, ref pair, ref file2_name) = result[0];
    assert_eq!(file1_name, "file1.ts");
    assert_eq!(file2_name, "file2.ts");
    assert_eq!(pair.func1.name, "calculateAverage");
    assert_eq!(pair.func2.name, "computeMean");
    assert!(pair.similarity > 0.7);
}

#[test]
fn test_threshold_filtering() {
    let code = r#"
export function add(a: number, b: number): number {
    return a + b;
}

export function sum(x: number, y: number): number {
    return x + y;
}
"#;

    let options = TSEDOptions::default();

    // With low threshold - should find similarity
    let result_low = find_similar_functions_in_file("test.ts", code, 0.5, &options).unwrap();
    assert!(!result_low.is_empty());

    // With high threshold - should not find similarity
    let result_high = find_similar_functions_in_file("test.ts", code, 0.95, &options).unwrap();
    assert!(result_high.is_empty());
}

#[test]
fn test_min_lines_filtering() {
    let code = r#"
// Short function - should be filtered out with min_lines = 5
export function add(a: number, b: number): number {
    return a + b;
}

// Another short function
export function sum(x: number, y: number): number {
    return x + y;
}

// Longer function
export function processArray(arr: number[]): number {
    let result = 0;
    for (let i = 0; i < arr.length; i++) {
        result += arr[i];
    }
    return result;
}

// Another longer function
export function handleList(list: number[]): number {
    let output = 0;
    for (let j = 0; j < list.length; j++) {
        output += list[j];
    }
    return output;
}
"#;

    let mut options = TSEDOptions::default();
    options.min_lines = 5;

    let result = find_similar_functions_in_file("test.ts", code, 0.7, &options).unwrap();

    // Should only find similarity between the longer functions
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].func1.name, "processArray");
    assert_eq!(result[0].func2.name, "handleList");
}

#[test]
fn test_size_penalty() {
    let code = r#"
// Very short function
export function tiny(): void {
    console.log("hi");
}

// Another very short function  
export function small(): void {
    console.log("hello");
}

// Longer function
export function processData(data: any[]): any[] {
    const result = [];
    for (const item of data) {
        if (item.active) {
            result.push(item);
        }
    }
    return result;
}
"#;

    let mut options = TSEDOptions::default();
    options.min_lines = 1; // Allow short functions
    options.size_penalty = true; // Enable size penalty

    let result = find_similar_functions_in_file("test.ts", code, 0.7, &options).unwrap();

    // tiny and small might be structurally similar but should get size penalty
    let tiny_small_pair = result.iter().find(|r| {
        (r.func1.name == "tiny" && r.func2.name == "small")
            || (r.func1.name == "small" && r.func2.name == "tiny")
    });

    if let Some(pair) = tiny_small_pair {
        // Even if structurally similar, size penalty should reduce similarity
        assert!(
            pair.similarity < 0.9,
            "Size penalty should reduce similarity for very short functions"
        );
    }
}

#[test]
fn test_method_vs_function_detection() {
    let code = r#"
export class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
    
    multiply(x: number, y: number): number {
        return x * y;
    }
}

export function add(a: number, b: number): number {
    return a + b;
}
"#;

    let options = TSEDOptions::default();
    let result = find_similar_functions_in_file("test.ts", code, 0.7, &options).unwrap();

    // Should find the method and function with same implementation
    let method_function_pair = result.iter().find(|r| {
        (r.func1.name == "add"
            && r.func1.class_name.is_some()
            && r.func2.name == "add"
            && r.func2.class_name.is_none())
            || (r.func2.name == "add"
                && r.func2.class_name.is_some()
                && r.func1.name == "add"
                && r.func1.class_name.is_none())
    });

    assert!(method_function_pair.is_some(), "Should detect similarity between method and function");
}

#[test]
fn test_fixtures_files() {
    use std::fs;
    use std::path::Path;

    // Test with actual fixture files
    let fixtures_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");

    if fixtures_dir.exists() {
        let sample1_path = fixtures_dir.join("sample1.ts");
        let sample2_path = fixtures_dir.join("sample2.ts");

        if sample1_path.exists() && sample2_path.exists() {
            let content1 = fs::read_to_string(&sample1_path).unwrap();
            let content2 = fs::read_to_string(&sample2_path).unwrap();

            let files = vec![
                (sample1_path.to_string_lossy().to_string(), content1),
                (sample2_path.to_string_lossy().to_string(), content2),
            ];

            let options = TSEDOptions::default();
            let result = find_similar_functions_across_files(&files, 0.7, &options).unwrap();

            // Should find similarity between calculateAverage and computeMean
            assert!(!result.is_empty(), "Should find similar functions across fixture files");
        }
    }
}
