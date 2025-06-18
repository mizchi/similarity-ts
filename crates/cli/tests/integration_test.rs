use assert_cmd::Command;
use predicates::prelude::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_functions_within_file() {
    let dir = tempdir().unwrap();
    let sample_path = dir.path().join("sample.ts");
    
    // Create a file with similar functions
    fs::write(&sample_path, r#"
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
"#).unwrap();

    // Run the CLI
    let mut cmd = Command::cargo_bin("ts-similarity").unwrap();
    cmd.arg("functions")
        .arg(dir.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("calculateSum"))
        .stdout(predicate::str::contains("computeTotal"))
        .stdout(predicate::str::contains("Similarity:"));
}

#[test]
fn test_functions_cross_file() {
    let dir = tempdir().unwrap();
    let file1 = dir.path().join("file1.ts");
    let file2 = dir.path().join("file2.ts");
    
    // Create first file
    fs::write(&file1, r#"
export function processData(items: any[]): number {
    let result = 0;
    for (const item of items) {
        result += item.value;
    }
    return result;
}
"#).unwrap();

    // Create second file with similar function
    fs::write(&file2, r#"
export function calculateTotal(elements: any[]): number {
    let total = 0;
    for (const element of elements) {
        total += element.value;
    }
    return total;
}
"#).unwrap();

    // Run the CLI with cross-file flag
    let mut cmd = Command::cargo_bin("ts-similarity").unwrap();
    cmd.arg("functions")
        .arg(dir.path())
        .arg("--cross-file")
        .assert()
        .success()
        .stdout(predicate::str::contains("processData"))
        .stdout(predicate::str::contains("calculateTotal"))
        .stdout(predicate::str::contains("across files"));
}

#[test]
fn test_types_similarity() {
    let dir = tempdir().unwrap();
    let types_file = dir.path().join("types.ts");
    
    // Create a file with similar types
    fs::write(&types_file, r#"
interface User {
    id: string;
    name: string;
    email: string;
}

interface Person {
    id: string;
    name: string;
    email: string;
}

type UserData = {
    id: string;
    name: string;
    email: string;
};
"#).unwrap();

    // Run the CLI for types
    let mut cmd = Command::cargo_bin("ts-similarity").unwrap();
    cmd.arg("types")
        .arg(dir.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("User"))
        .stdout(predicate::str::contains("Person"))
        .stdout(predicate::str::contains("UserData"))
        .stdout(predicate::str::contains("similar-type"));
}

#[test]
fn test_default_command_runs_both() {
    let dir = tempdir().unwrap();
    let test_file = dir.path().join("test.ts");
    
    // Create a file with both functions and types
    fs::write(&test_file, r#"
// Similar functions
export function add(a: number, b: number): number {
    return a + b;
}

export function sum(x: number, y: number): number {
    return x + y;
}

// Similar types
interface IUser {
    name: string;
    age: number;
}

interface IPerson {
    name: string;
    age: number;
}
"#).unwrap();

    // Run without subcommand (default behavior)
    let mut cmd = Command::cargo_bin("ts-similarity").unwrap();
    cmd.arg(dir.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("Function Similarity"))
        .stdout(predicate::str::contains("Type Similarity"))
        .stdout(predicate::str::contains("add"))
        .stdout(predicate::str::contains("sum"))
        .stdout(predicate::str::contains("IUser"))
        .stdout(predicate::str::contains("IPerson"));
}

#[test]
fn test_threshold_option() {
    let dir = tempdir().unwrap();
    let sample_path = dir.path().join("sample.ts");
    
    // Create functions with moderate similarity
    fs::write(&sample_path, r#"
export function processArray(arr: number[]): number {
    let result = 0;
    for (let i = 0; i < arr.length; i++) {
        result += arr[i] * 2;
    }
    return result;
}

export function handleList(list: number[]): number {
    let output = 0;
    for (let j = 0; j < list.length; j++) {
        output += list[j] * 3;
    }
    return output;
}
"#).unwrap();

    // With low threshold - should find similarity
    let mut cmd = Command::cargo_bin("ts-similarity").unwrap();
    cmd.arg("functions")
        .arg(dir.path())
        .arg("--threshold")
        .arg("0.5")
        .assert()
        .success()
        .stdout(predicate::str::contains("processArray"))
        .stdout(predicate::str::contains("handleList"));

    // With high threshold - should not find similarity
    let mut cmd = Command::cargo_bin("ts-similarity").unwrap();
    cmd.arg("functions")
        .arg(dir.path())
        .arg("--threshold")
        .arg("0.9")
        .assert()
        .success()
        .stdout(predicate::str::contains("No duplicate functions found"));
}

#[test]
fn test_multiple_paths() {
    let dir = tempdir().unwrap();
    let dir1 = dir.path().join("src");
    let dir2 = dir.path().join("lib");
    fs::create_dir(&dir1).unwrap();
    fs::create_dir(&dir2).unwrap();
    
    // Create files in different directories
    fs::write(dir1.join("utils.ts"), r#"
export function double(n: number): number {
    return n * 2;
}
"#).unwrap();

    fs::write(dir2.join("helpers.ts"), r#"
export function twice(num: number): number {
    return num * 2;
}
"#).unwrap();

    // Run with multiple paths
    let mut cmd = Command::cargo_bin("ts-similarity").unwrap();
    cmd.arg("functions")
        .arg(&dir1)
        .arg(&dir2)
        .arg("--cross-file")
        .assert()
        .success()
        .stdout(predicate::str::contains("double"))
        .stdout(predicate::str::contains("twice"));
}

#[test]
fn test_ignores_node_modules() {
    let dir = tempdir().unwrap();
    let node_modules = dir.path().join("node_modules");
    fs::create_dir(&node_modules).unwrap();
    
    // Create files in node_modules (should be ignored)
    fs::write(node_modules.join("test.ts"), r#"
export function ignored() {
    return "This should be ignored";
}
"#).unwrap();

    // Create file in root (should be found)
    fs::write(dir.path().join("app.ts"), r#"
export function found() {
    return "This should be found";
}
"#).unwrap();

    // Run the CLI
    let mut cmd = Command::cargo_bin("ts-similarity").unwrap();
    cmd.arg("functions")
        .arg(dir.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("No duplicate functions found"));
}