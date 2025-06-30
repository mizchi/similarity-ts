use assert_cmd::Command;
use predicates::prelude::*;
use std::fs;
use tempfile::TempDir;

fn create_test_file(dir: &TempDir, filename: &str, content: &str) -> std::path::PathBuf {
    let file_path = dir.path().join(filename);
    fs::write(&file_path, content).unwrap();
    file_path
}

#[test]
fn test_python_similarity() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.py", r#"
def add(a, b):
    # Add two numbers
    result = a + b
    # Return the result
    return result

def sum(x, y):
    # Sum two values
    total = x + y
    # Return the total
    return total
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("python")
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("add <-> sum:"));
}

#[test]
fn test_rust_similarity() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.rs", r#"
fn calculate_sum(numbers: &[i32]) -> i32 {
    numbers.iter().sum()
}

fn compute_total(values: &[i32]) -> i32 {
    values.iter().sum()
}
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("rust")
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("calculate_sum <-> compute_total:"));
}

#[test]
fn test_javascript_similarity() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.js", r#"
function multiply(a, b) {
    return a * b;
}

function product(x, y) {
    return x * y;
}
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("javascript")
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("multiply <-> product:"));
}

#[test]
fn test_go_similarity() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.go", r#"
package main

func add(a, b int) int {
    return a + b
}

func sum(x, y int) int {
    return x + y
}
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("go")
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("add <-> sum:"));
}

#[test]
fn test_java_similarity() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "Test.java", r#"
public class Test {
    public int add(int a, int b) {
        return a + b;
    }
    
    public int sum(int x, int y) {
        return x + y;
    }
}
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("java")
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("add <-> sum:"));
}

#[test]
fn test_c_similarity() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.c", r#"
int multiply(int a, int b) {
    return a * b;
}

int product(int x, int y) {
    return x * y;
}
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("c")
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("multiply"));
}

#[test]
fn test_cpp_similarity() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.cpp", r#"
class Calculator {
public:
    int add(int a, int b) {
        return a + b;
    }
    
    int sum(int x, int y) {
        return x + y;
    }
};
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("cpp")
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("add"));
}

#[test]
fn test_csharp_similarity() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "Test.cs", r#"
public class Calculator {
    public int Add(int a, int b) {
        return a + b;
    }
    
    public int Sum(int x, int y) {
        return x + y;
    }
}
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("csharp")
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Add <-> Sum:"));
}

#[test]
fn test_ruby_similarity() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.rb", r#"
def calculate_sum(numbers)
  total = 0
  numbers.each { |n| total += n }
  total
end

def compute_total(values)
  sum = 0
  values.each { |v| sum += v }
  sum
end
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("ruby")
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("calculate_sum <-> compute_total:"));
}

#[test]
fn test_language_aliases() {
    let dir = TempDir::new().unwrap();
    
    // Test Python alias
    let py_file = create_test_file(&dir, "test.py", "def test(): pass");
    Command::cargo_bin("similarity-generic").unwrap()
        .arg(&py_file)
        .arg("--language").arg("py")
        .assert()
        .success();
    
    // Test Rust alias
    let rs_file = create_test_file(&dir, "test.rs", "fn test() {}");
    Command::cargo_bin("similarity-generic").unwrap()
        .arg(&rs_file)
        .arg("--language").arg("rs")
        .assert()
        .success();
    
    // Test JavaScript alias
    let js_file = create_test_file(&dir, "test.js", "function test() {}");
    Command::cargo_bin("similarity-generic").unwrap()
        .arg(&js_file)
        .arg("--language").arg("js")
        .assert()
        .success();
    
    // Test C# alias
    let cs_file = create_test_file(&dir, "test.cs", "class Test {}");
    Command::cargo_bin("similarity-generic").unwrap()
        .arg(&cs_file)
        .arg("--language").arg("cs")
        .assert()
        .success();
    
    // Test Ruby alias
    let rb_file = create_test_file(&dir, "test.rb", "def test; end");
    Command::cargo_bin("similarity-generic").unwrap()
        .arg(&rb_file)
        .arg("--language").arg("rb")
        .assert()
        .success();
}

#[test]
fn test_show_functions_option() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.go", r#"
package main

func first() {}
func second() {}
func third() {}
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("go")
        .arg("--show-functions");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Found 3 functions:"))
        .stdout(predicate::str::contains("first"))
        .stdout(predicate::str::contains("second"))
        .stdout(predicate::str::contains("third"));
}

#[test]
fn test_custom_config_file() {
    let dir = TempDir::new().unwrap();
    let config_file = create_test_file(&dir, "custom.json", r#"{
  "language": "python",
  "function_nodes": ["function_definition"],
  "type_nodes": ["class_definition"],
  "field_mappings": {
    "name_field": "name",
    "params_field": "parameters",
    "body_field": "body",
    "decorator_field": "decorator",
    "class_field": "class"
  },
  "value_nodes": ["identifier", "string"],
  "test_patterns": {
    "attribute_patterns": [],
    "name_prefixes": ["test_"],
    "name_suffixes": []
  }
}"#);
    
    let py_file = create_test_file(&dir, "test.py", r#"
def add(a, b):
    return a + b
"#);

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(&py_file)
        .arg("--config").arg(&config_file)
        .arg("--show-functions");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Found 1 functions:"))
        .stdout(predicate::str::contains("add"));
}

#[test]
fn test_threshold_filtering() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.java", r#"
public class Test {
    public int add(int a, int b) {
        return a + b;
    }
    
    public void doSomethingCompletelyDifferent() {
        System.out.println("Hello");
        for (int i = 0; i < 10; i++) {
            System.out.println(i);
        }
    }
}
"#);

    // With high threshold, should not show low similarity
    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(&file)
        .arg("--language").arg("java")
        .arg("--threshold").arg("0.9");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Comparing functions for similarity..."))
        .stdout(predicate::str::contains("add").not());
}

#[test]
fn test_unsupported_language_error() {
    let dir = TempDir::new().unwrap();
    let file = create_test_file(&dir, "test.xyz", "some content");

    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(file)
        .arg("--language").arg("xyz");
    
    cmd.assert()
        .failure()
        .stderr(predicate::str::contains("Unknown language: xyz"));
}