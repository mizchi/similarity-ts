use similarity_ts_core::apted::{compute_edit_distance, APTEDOptions};
use similarity_ts_core::language_parser::{Language, ParserFactory};
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    // JavaScript example
    let js_code = r#"
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

class Calculator {
    add(a, b) {
        return a + b;
    }
    
    multiply(a, b) {
        return a * b;
    }
}
"#;

    // Python example
    let py_code = r#"
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

class Calculator:
    def add(self, a, b):
        return a + b
    
    def multiply(self, a, b):
        return a * b
"#;

    println!("=== Multi-Language Code Similarity Demo ===\n");

    // Parse JavaScript
    let mut js_parser = ParserFactory::create_parser(Language::JavaScript)?;
    let js_functions = js_parser.extract_functions(js_code, "test.js")?;
    let js_tree = js_parser.parse(js_code, "test.js")?;

    println!("JavaScript functions found:");
    for func in &js_functions {
        println!("  - {} ({})", func.name, if func.is_method { "method" } else { "function" });
    }

    // Parse Python
    let mut py_parser = ParserFactory::create_parser(Language::Python)?;
    let py_functions = py_parser.extract_functions(py_code, "test.py")?;
    let py_tree = py_parser.parse(py_code, "test.py")?;

    println!("\nPython functions found:");
    for func in &py_functions {
        println!("  - {} ({})", func.name, if func.is_method { "method" } else { "function" });
    }

    // Compare similar functions across languages
    println!("\n=== Cross-Language Similarity ===");

    // Find the factorial functions
    let js_factorial = js_functions.iter().find(|f| f.name == "factorial").unwrap();
    let py_factorial = py_functions.iter().find(|f| f.name == "factorial").unwrap();

    println!("\nComparing factorial functions:");
    println!("  JS: lines {}-{}", js_factorial.start_line, js_factorial.end_line);
    println!("  PY: lines {}-{}", py_factorial.start_line, py_factorial.end_line);

    // Compare the AST structures
    let options = APTEDOptions { insert_cost: 1.0, delete_cost: 1.0, rename_cost: 1.0 };

    let distance = compute_edit_distance(&js_tree, &py_tree, &options);
    let max_size = js_tree.get_subtree_size().max(py_tree.get_subtree_size()) as f64;
    let similarity = 1.0 - (distance / max_size);

    println!("\nOverall AST similarity: {:.2}%", similarity * 100.0);

    // Performance comparison
    println!("\n=== Performance Comparison ===");

    let start = std::time::Instant::now();
    for _ in 0..1000 {
        let _ = js_parser.extract_functions(js_code, "test.js")?;
    }
    let js_duration = start.elapsed();

    let start = std::time::Instant::now();
    for _ in 0..1000 {
        let _ = py_parser.extract_functions(py_code, "test.py")?;
    }
    let py_duration = start.elapsed();

    println!("1000 iterations:");
    println!("  JavaScript (oxc): {:?}", js_duration);
    println!("  Python (tree-sitter): {:?}", py_duration);
    println!("  Ratio: {:.2}x slower", py_duration.as_secs_f64() / js_duration.as_secs_f64());

    Ok(())
}
