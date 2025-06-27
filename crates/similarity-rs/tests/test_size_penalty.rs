#![allow(clippy::uninlined_format_args)]

use assert_cmd::Command;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_size_penalty_for_short_functions() {
    let dir = tempdir().unwrap();
    let file1 = dir.path().join("short.rs");

    // Create a file with very short functions
    fs::write(
        &file1,
        r#"
fn a() -> i32 { 1 }
fn b() -> i32 { 2 }
fn c() -> i32 { 3 }

fn longer_function() -> i32 {
    let x = 1;
    let y = 2;
    let z = 3;
    x + y + z
}

fn another_longer_function() -> i32 {
    let a = 4;
    let b = 5;
    let c = 6;
    a + b + c
}
"#,
    )
    .unwrap();

    // Run similarity check
    let mut cmd = Command::cargo_bin("similarity-rs").unwrap();
    cmd.arg(dir.path());

    let output = cmd.assert().success();
    let stdout = String::from_utf8_lossy(&output.get_output().stdout);

    // Short functions should have low similarity due to size penalty
    let short_function_matches = stdout.matches("fn a").count()
        + stdout.matches("fn b").count()
        + stdout.matches("fn c").count();

    // Longer functions might have higher similarity
    let _long_function_matches =
        stdout.contains("longer_function") && stdout.contains("another_longer_function");

    println!("Output:\n{}", stdout);

    // The number of matches for short functions should be limited
    assert!(short_function_matches < 3, "Too many matches for short functions");
}

#[test]
fn test_no_size_penalty_option() {
    let dir = tempdir().unwrap();
    let file1 = dir.path().join("short2.rs");

    // Create a file with very short functions
    fs::write(
        &file1,
        r#"
fn x() -> bool { true }
fn y() -> bool { false }
fn z() -> bool { true }
"#,
    )
    .unwrap();

    // Run with size penalty (default)
    let mut cmd = Command::cargo_bin("similarity-rs").unwrap();
    cmd.arg(dir.path());

    let output_with_penalty = cmd.assert().success();
    let stdout_with_penalty = String::from_utf8_lossy(&output_with_penalty.get_output().stdout);

    // Run without size penalty
    let mut cmd = Command::cargo_bin("similarity-rs").unwrap();
    cmd.arg(dir.path()).arg("--no-size-penalty");

    let output_no_penalty = cmd.assert().success();
    let stdout_no_penalty = String::from_utf8_lossy(&output_no_penalty.get_output().stdout);

    println!("With penalty:\n{}", stdout_with_penalty);
    println!("\nWithout penalty:\n{}", stdout_no_penalty);

    // Without penalty should show more matches
    let matches_with_penalty = stdout_with_penalty.matches("Similarity:").count();
    let matches_no_penalty = stdout_no_penalty.matches("Similarity:").count();

    assert!(
        matches_no_penalty >= matches_with_penalty,
        "No-size-penalty should show equal or more matches"
    );
}
