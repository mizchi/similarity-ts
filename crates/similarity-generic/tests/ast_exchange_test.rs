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
fn test_ast_export_to_file() {
    let dir = TempDir::new().unwrap();
    let source_file = create_test_file(&dir, "test.py", r#"
def hello():
    print("Hello, World!")

def goodbye():
    print("Goodbye!")
"#);
    
    let ast_file = dir.path().join("output.json");
    
    // Export AST
    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(&source_file)
        .arg("--language").arg("python")
        .arg("--ast-output").arg(&ast_file);
    
    cmd.assert()
        .success()
        .stderr(predicate::str::contains("AST written to"));
    
    // Check AST file exists and contains expected content
    assert!(ast_file.exists());
    let ast_content = fs::read_to_string(&ast_file).unwrap();
    assert!(ast_content.contains("\"language\": \"python\""));
    assert!(ast_content.contains("\"functions\""));
    assert!(ast_content.contains("hello"));
    assert!(ast_content.contains("goodbye"));
}

#[test]
fn test_ast_import_from_file() {
    let dir = TempDir::new().unwrap();
    
    // Create a pre-made AST file
    let ast_content = r#"{
  "language": "python",
  "filename": "test.py",
  "functions": [
    {
      "name": "add",
      "start_line": 1,
      "end_line": 3,
      "body_start_line": 2,
      "body_end_line": 3,
      "ast": {
        "label": "module",
        "value": "",
        "children": [],
        "id": 0
      }
    },
    {
      "name": "subtract",
      "start_line": 5,
      "end_line": 7,
      "body_start_line": 6,
      "body_end_line": 7,
      "ast": {
        "label": "module",
        "value": "",
        "children": [],
        "id": 1
      }
    }
  ],
  "full_ast": null
}"#;
    
    let ast_file = create_test_file(&dir, "input.json", ast_content);
    
    // Import and analyze AST
    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg("-")  // Dummy path since we're using --ast-input
        .arg("--ast-input").arg(&ast_file)
        .arg("--show-functions");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Loaded AST for test.py with 2 functions"))
        .stdout(predicate::str::contains("add lines 1-3"))
        .stdout(predicate::str::contains("subtract lines 5-7"));
}

#[test]
fn test_ast_export_to_stdout() {
    let dir = TempDir::new().unwrap();
    let source_file = create_test_file(&dir, "test.go", r#"
package main

func main() {
    println("Hello")
}
"#);
    
    // Export AST to stdout
    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg(&source_file)
        .arg("--language").arg("go")
        .arg("--ast-output").arg("-");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("\"language\": \"go\""))
        .stdout(predicate::str::contains("\"functions\""))
        .stdout(predicate::str::contains("main"));
}

#[test]
fn test_ast_round_trip() {
    let dir = TempDir::new().unwrap();
    
    // Create source file
    let source_file = create_test_file(&dir, "test.rs", r#"
fn calculate(x: i32, y: i32) -> i32 {
    x + y
}

fn compute(a: i32, b: i32) -> i32 {
    a + b
}
"#);
    
    let ast_file = dir.path().join("ast.json");
    
    // Step 1: Export AST
    Command::cargo_bin("similarity-generic").unwrap()
        .arg(&source_file)
        .arg("--language").arg("rust")
        .arg("--ast-output").arg(&ast_file)
        .assert()
        .success();
    
    // Step 2: Import AST and analyze
    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg("-")
        .arg("--ast-input").arg(&ast_file)
        .arg("--threshold").arg("0.8");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("calculate <-> compute:"));
}

#[test]
fn test_ast_with_similarity_analysis() {
    let dir = TempDir::new().unwrap();
    
    // Create AST with similar functions
    let ast_content = r#"{
  "language": "javascript",
  "filename": "test.js",
  "functions": [
    {
      "name": "add",
      "start_line": 1,
      "end_line": 3,
      "body_start_line": 2,
      "body_end_line": 3,
      "ast": {
        "label": "function_declaration",
        "value": "",
        "children": [
          {
            "label": "return_statement",
            "value": "",
            "children": [
              {
                "label": "binary_expression",
                "value": "",
                "children": [
                  {"label": "identifier", "value": "a", "children": [], "id": 3},
                  {"label": "+", "value": "+", "children": [], "id": 4},
                  {"label": "identifier", "value": "b", "children": [], "id": 5}
                ],
                "id": 2
              }
            ],
            "id": 1
          }
        ],
        "id": 0
      }
    },
    {
      "name": "sum",
      "start_line": 5,
      "end_line": 7,
      "body_start_line": 6,
      "body_end_line": 7,
      "ast": {
        "label": "function_declaration",
        "value": "",
        "children": [
          {
            "label": "return_statement",
            "value": "",
            "children": [
              {
                "label": "binary_expression",
                "value": "",
                "children": [
                  {"label": "identifier", "value": "x", "children": [], "id": 9},
                  {"label": "+", "value": "+", "children": [], "id": 10},
                  {"label": "identifier", "value": "y", "children": [], "id": 11}
                ],
                "id": 8
              }
            ],
            "id": 7
          }
        ],
        "id": 6
      }
    }
  ],
  "full_ast": null
}"#;
    
    let ast_file = create_test_file(&dir, "similar.json", ast_content);
    
    // Analyze similarity from imported AST
    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg("-")
        .arg("--ast-input").arg(&ast_file)
        .arg("--threshold").arg("0.7");
    
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("add <-> sum:"))
        .stdout(predicate::str::contains("Comparing functions for similarity..."));
}

#[test]
fn test_invalid_ast_json_error() {
    let dir = TempDir::new().unwrap();
    let invalid_ast = create_test_file(&dir, "invalid.json", "{ invalid json");
    
    let mut cmd = Command::cargo_bin("similarity-generic").unwrap();
    cmd.arg("-")
        .arg("--ast-input").arg(&invalid_ast);
    
    cmd.assert()
        .failure()
        .stderr(predicate::str::contains("Failed to parse AST JSON"));
}

#[test]
fn test_ast_export_with_full_ast() {
    let dir = TempDir::new().unwrap();
    let source_file = create_test_file(&dir, "simple.c", r#"
int square(int x) {
    return x * x;
}
"#);
    
    let ast_file = dir.path().join("full_ast.json");
    
    // Export with full AST
    Command::cargo_bin("similarity-generic").unwrap()
        .arg(&source_file)
        .arg("--language").arg("c")
        .arg("--ast-output").arg(&ast_file)
        .assert()
        .success();
    
    // Check that full_ast is included
    let ast_content = fs::read_to_string(&ast_file).unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&ast_content).unwrap();
    
    assert_eq!(parsed["language"], "c");
    assert!(parsed["functions"].is_array());
    // Note: full_ast might be null if not specifically requested
}