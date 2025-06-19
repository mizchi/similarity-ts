use assert_cmd::Command;
use predicates::prelude::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_tsx_file_support() {
    let dir = tempdir().unwrap();
    let tsx_file = dir.path().join("component.tsx");

    // Create a .tsx file with React component
    fs::write(
        &tsx_file,
        r#"
import React from 'react';

interface ButtonProps {
    label: string;
    onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
    return React.createElement('button', { onClick }, label);
}

export function PrimaryButton({ label, onClick }: ButtonProps) {
    return React.createElement('button', { onClick, className: 'primary' }, label);
}
"#,
    )
    .unwrap();

    // Run similarity-ts on .tsx file
    let mut cmd = Command::cargo_bin("similarity-ts").unwrap();
    cmd.arg(dir.path())
        .arg("--min-lines")
        .arg("1")
        .arg("--threshold")
        .arg("0.5")
        .arg("--no-size-penalty")
        .assert()
        .success()
        .stdout(predicate::str::contains("Checking 1 files for duplicates"));
}

#[test]
fn test_mixed_ts_tsx_files() {
    let dir = tempdir().unwrap();
    let ts_file = dir.path().join("utils.ts");
    let tsx_file = dir.path().join("component.tsx");

    // Create a .ts file
    fs::write(
        &ts_file,
        r#"
export function formatName(first: string, last: string): string {
    return `${first} ${last}`;
}
"#,
    )
    .unwrap();

    // Create a .tsx file with similar function
    fs::write(
        &tsx_file,
        r#"
import React from 'react';

export function formatFullName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`;
}

export function NameDisplay({ name }: { name: string }) {
    return React.createElement('span', null, name);
}
"#,
    )
    .unwrap();

    // Run similarity-ts on both files
    let mut cmd = Command::cargo_bin("similarity-ts").unwrap();
    cmd.arg(dir.path())
        .arg("--threshold")
        .arg("0.5")
        .arg("--min-lines")
        .arg("1")
        .arg("--no-size-penalty")
        .assert()
        .success()
        .stdout(predicate::str::contains("Checking 2 files for duplicates"));
}
