use similarity_core::language_parser::LanguageParser;
use similarity_core::{
    calculate_enhanced_similarity, tsed::calculate_tsed, APTEDOptions, EnhancedSimilarityOptions,
    TSEDOptions,
};
use similarity_py::python_parser::PythonParser;

#[test]
fn test_similar_python_functions_should_be_detected() {
    let code1 = r#"
def calculate_sum(numbers):
    if len(numbers) == 0:
        return 0
    
    total = 0
    for num in numbers:
        total += num
    
    return total
"#;

    let code2 = r#"
def compute_total(values):
    if len(values) == 0:
        return 0
    
    sum_value = 0
    for val in values:
        sum_value += val
    
    return sum_value
"#;

    let mut parser = PythonParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.py").unwrap();
    let tree2 = parser.parse(code2, "test2.py").unwrap();

    let tsed_options = TSEDOptions {
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: false,
        },
        min_lines: 3,
        min_tokens: None,
        size_penalty: false, // Disable for this test
        skip_test: false,
    };

    let similarity = calculate_tsed(&tree1, &tree2, &tsed_options);

    // These functions are very similar and should be detected
    assert!(similarity > 0.8, "Similar functions were not detected: {similarity}");
}

#[test]
fn test_different_python_functions_should_have_low_similarity() {
    let code1 = r#"
def add(a, b):
    return a + b
"#;

    let code2 = r#"
def multiply(x, y):
    return x * y
"#;

    let mut parser = PythonParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.py").unwrap();
    let tree2 = parser.parse(code2, "test2.py").unwrap();

    let options = EnhancedSimilarityOptions {
        structural_weight: 0.7,
        size_weight: 0.2,
        type_distribution_weight: 0.1,
        min_size_ratio: 0.5,
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: true,
        },
    };

    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);

    // Different functions should have similarity below 0.7
    assert!(similarity < 0.7, "Similarity was too high: {similarity}");
}

#[test]
fn test_python_list_comprehension_vs_loop() {
    let code1 = r#"
def filter_positive(numbers):
    result = []
    for num in numbers:
        if num > 0:
            result.append(num)
    return result
"#;

    let code2 = r#"
def filter_positive(numbers):
    return [num for num in numbers if num > 0]
"#;

    let mut parser = PythonParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.py").unwrap();
    let tree2 = parser.parse(code2, "test2.py").unwrap();

    let tsed_options = TSEDOptions {
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: false,
        },
        min_lines: 1,
        min_tokens: None,
        size_penalty: true, // Enable size penalty
        skip_test: false,
    };

    let similarity = calculate_tsed(&tree1, &tree2, &tsed_options);

    // List comprehension and loop have moderate similarity due to similar purpose
    println!("List comprehension vs loop similarity: {similarity}");
    // They have the same function name and similar purpose, so similarity around 0.57 is reasonable
    assert!(similarity < 0.6, "List comprehension and loop were too similar: {similarity}");
    assert!(similarity > 0.5, "List comprehension and loop were too different: {similarity}");
}

#[test]
fn test_python_class_methods_similarity() {
    let code1 = r#"
class Calculator:
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b
"#;

    let code2 = r#"
class MathOperations:
    def sum(self, x, y):
        return x + y
    
    def difference(self, x, y):
        return x - y
"#;

    let mut parser = PythonParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.py").unwrap();
    let tree2 = parser.parse(code2, "test2.py").unwrap();

    let tsed_options = TSEDOptions {
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: false,
        },
        min_lines: 3,
        min_tokens: None,
        size_penalty: false,
        skip_test: false,
    };

    let similarity = calculate_tsed(&tree1, &tree2, &tsed_options);

    // These classes have similar structure
    assert!(similarity > 0.7, "Similar class structures were not detected: {similarity}");
}

#[test]
fn test_python_decorator_functions() {
    let code1 = r#"
@property
def name(self):
    return self._name
"#;

    let code2 = r#"
@cached_property
def title(self):
    return self._title
"#;

    let mut parser = PythonParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.py").unwrap();
    let tree2 = parser.parse(code2, "test2.py").unwrap();

    let tsed_options = TSEDOptions {
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: false,
        },
        min_lines: 1,
        min_tokens: None,
        size_penalty: false,
        skip_test: false,
    };

    let similarity = calculate_tsed(&tree1, &tree2, &tsed_options);

    // Decorated functions with similar structure should be detected as similar
    assert!(similarity > 0.7, "Similar decorated functions were not detected: {similarity}");
}

#[test]
fn test_python_empty_functions_should_not_be_identical() {
    let code1 = r#"
def foo():
    pass
"#;

    let code2 = r#"
def bar():
    pass
"#;

    let mut parser = PythonParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.py").unwrap();
    let tree2 = parser.parse(code2, "test2.py").unwrap();

    let options = EnhancedSimilarityOptions {
        structural_weight: 0.7,
        size_weight: 0.2,
        type_distribution_weight: 0.1,
        min_size_ratio: 0.5,
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: true, // Compare values to detect different function names
        },
    };

    let similarity = calculate_enhanced_similarity(&tree1, &tree2, &options);
    println!("Empty functions similarity: {similarity}");

    // Empty functions with different names should not be identical
    assert!(similarity < 1.0, "Empty functions were identical: {similarity}");
}

#[test]
fn test_python_generator_vs_regular_function() {
    let code1 = r#"
def get_numbers(n):
    result = []
    for i in range(n):
        result.append(i * 2)
    return result
"#;

    let code2 = r#"
def get_numbers(n):
    for i in range(n):
        yield i * 2
"#;

    let mut parser = PythonParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.py").unwrap();
    let tree2 = parser.parse(code2, "test2.py").unwrap();

    let tsed_options = TSEDOptions {
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: false,
        },
        min_lines: 1,
        min_tokens: None,
        size_penalty: true,
        skip_test: false,
    };

    let similarity = calculate_tsed(&tree1, &tree2, &tsed_options);
    println!("Generator vs regular function similarity: {similarity}");

    // Generator and regular function have different structure
    assert!(similarity < 0.7, "Generator and regular function were too similar: {similarity}");
}

#[test]
fn test_python_async_function_similarity() {
    let code1 = r#"
async def fetch_data(url):
    response = await http_get(url)
    return response.json()
"#;

    let code2 = r#"
async def get_data(endpoint):
    result = await http_get(endpoint)
    return result.json()
"#;

    let mut parser = PythonParser::new().unwrap();
    let tree1 = parser.parse(code1, "test1.py").unwrap();
    let tree2 = parser.parse(code2, "test2.py").unwrap();

    let tsed_options = TSEDOptions {
        apted_options: APTEDOptions {
            rename_cost: 0.3,
            delete_cost: 1.0,
            insert_cost: 1.0,
            compare_values: false,
        },
        min_lines: 1,
        min_tokens: None,
        size_penalty: false,
        skip_test: false,
    };

    let similarity = calculate_tsed(&tree1, &tree2, &tsed_options);
    println!("Async functions similarity: {similarity}");

    // Similar async functions should be detected
    assert!(similarity > 0.8, "Similar async functions were not detected: {similarity}");
}
