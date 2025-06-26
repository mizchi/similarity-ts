use assert_cmd::Command;
use predicates::prelude::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_python_duplicate_detection() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test.py");

    let content = r#"
def process_items(items):
    result = []
    for item in items:
        if item > 0:
            result.append(item * 2)
    return result

def handle_items(data):
    output = []
    for d in data:
        if d > 0:
            output.append(d * 2)
    return output
"#;

    fs::write(&file_path, content).unwrap();

    Command::cargo_bin("similarity-py")
        .unwrap()
        .arg(&file_path)
        .arg("--threshold")
        .arg("0.8")
        .assert()
        .success()
        .stdout(predicate::str::contains("process_items"))
        .stdout(predicate::str::contains("handle_items"))
        .stdout(predicate::str::contains("Similarity: 100."));
}

#[test]
fn test_python_class_methods() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test_class.py");

    let content = r#"
class DataProcessor:
    def process(self, data):
        result = []
        for item in data:
            result.append(item * 2)
        return result
    
    def transform(self, items):
        output = []
        for i in items:
            output.append(i * 2)
        return output
"#;

    fs::write(&file_path, content).unwrap();

    Command::cargo_bin("similarity-py")
        .unwrap()
        .arg(&file_path)
        .arg("--threshold")
        .arg("0.8")
        .assert()
        .success()
        .stdout(predicate::str::contains("method process"))
        .stdout(predicate::str::contains("method transform"))
        .stdout(predicate::str::contains("Classes: DataProcessor <-> DataProcessor"));
}

#[test]
fn test_no_duplicates() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("unique.py");

    let content = r#"
def add(a, b):
    return a + b

def multiply(x, y):
    return x * y

def greet(name):
    return f"Hello, {name}!"
"#;

    fs::write(&file_path, content).unwrap();

    Command::cargo_bin("similarity-py")
        .unwrap()
        .arg(&file_path)
        .arg("--threshold")
        .arg("0.8")
        .assert()
        .success()
        .stdout(predicate::str::contains("No duplicate functions found!"));
}

#[test]
fn test_threshold_filtering() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("threshold_test.py");

    let content = r#"
def func1(x):
    result = x + 1
    return result * 2

def func2(y):
    temp = y + 1
    return temp * 3  # Different multiplier
"#;

    fs::write(&file_path, content).unwrap();

    // With high threshold, should not detect as duplicate
    Command::cargo_bin("similarity-py")
        .unwrap()
        .arg(&file_path)
        .arg("--threshold")
        .arg("0.95")
        .assert()
        .success()
        .stdout(predicate::str::contains("No duplicate functions found!"));
}

#[test]
fn test_min_lines_filtering() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("min_lines_test.py");

    let content = r#"
def f1(): return 1
def f2(): return 1

def longer_func1():
    x = 1
    y = 2
    z = 3
    return x + y + z

def longer_func2():
    a = 1
    b = 2
    c = 3
    return a + b + c
"#;

    fs::write(&file_path, content).unwrap();

    Command::cargo_bin("similarity-py")
        .unwrap()
        .arg(&file_path)
        .arg("--min-lines")
        .arg("4")
        .assert()
        .success()
        .stdout(predicate::str::contains("longer_func1"))
        .stdout(predicate::str::contains("longer_func2"))
        .stdout(predicate::str::contains("f1").not());
}
