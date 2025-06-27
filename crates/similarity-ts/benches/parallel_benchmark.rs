#![allow(clippy::uninlined_format_args)]

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use similarity_core::TSEDOptions;
use similarity_ts::parallel::{
    check_cross_file_duplicates_parallel, check_within_file_duplicates_parallel,
    load_files_parallel,
};
use similarity_ts::sequential::{
    check_cross_file_duplicates_sequential, check_within_file_duplicates_sequential,
    load_files_sequential,
};
use std::fs;
use std::path::PathBuf;
use std::time::Duration;

/// Generate sample TypeScript code for benchmarking
fn generate_sample_code(num_functions: usize) -> String {
    let mut code = String::new();

    // Generate various function types
    for i in 0..num_functions {
        match i % 4 {
            0 => {
                // Regular function
                code.push_str(&format!(
                    r#"
function processData{}(data: any[]): number {{
    const result = data.map(item => item * 2);
    const filtered = result.filter(x => x > 10);
    return filtered.reduce((a, b) => a + b, 0);
}}
"#,
                    i
                ));
            }
            1 => {
                // Arrow function
                code.push_str(&format!(
                    r#"
const calculate{} = (a: number, b: number): {{ sum: number; product: number }} => {{
    const sum = a + b;
    const product = a * b;
    return {{ sum, product }};
}};
"#,
                    i
                ));
            }
            2 => {
                // Method in object
                code.push_str(&format!(
                    r#"
const utils{} = {{
    transform(input: string): string {{
        return input.toUpperCase().trim();
    }},
    validate(value: any): boolean {{
        return value != null && value !== '';
    }}
}};
"#,
                    i
                ));
            }
            3 => {
                // Similar function (for finding duplicates)
                if i > 0 {
                    code.push_str(&format!(
                        r#"
function processData{}Similar(data: any[]): number {{
    const mapped = data.map(x => x * 2);
    const filtered = mapped.filter(item => item > 10);
    return filtered.reduce((acc, val) => acc + val, 0);
}}
"#,
                        i
                    ));
                }
            }
            _ => unreachable!(),
        }
    }

    code
}

/// Setup test files for benchmarking
fn setup_test_files(num_files: usize, functions_per_file: usize) -> Vec<(PathBuf, String)> {
    let temp_dir = std::env::temp_dir().join("ts_similarity_bench");
    fs::create_dir_all(&temp_dir).unwrap();

    let mut files = Vec::new();

    for i in 0..num_files {
        let path = temp_dir.join(format!("bench_test_{}.ts", i));
        let content = generate_sample_code(functions_per_file);
        fs::write(&path, &content).unwrap();
        files.push((path, content));
    }

    files
}

/// Cleanup test files
fn cleanup_test_files(files: &[(PathBuf, String)]) {
    for (path, _) in files {
        let _ = fs::remove_file(path);
    }
    let temp_dir = std::env::temp_dir().join("ts_similarity_bench");
    let _ = fs::remove_dir(&temp_dir);
}

fn benchmark_load_files_comparison(c: &mut Criterion) {
    let mut group = c.benchmark_group("load_files_comparison");
    group.measurement_time(Duration::from_secs(10));

    for &num_files in &[10, 50, 100] {
        let test_files = setup_test_files(num_files, 20);
        let file_paths: Vec<PathBuf> = test_files.iter().map(|(p, _)| p.clone()).collect();

        group.throughput(Throughput::Elements(num_files as u64));

        group.bench_with_input(
            BenchmarkId::new("sequential", num_files),
            &file_paths,
            |b, paths| {
                b.iter(|| {
                    let file_data = load_files_sequential(paths);
                    black_box(file_data)
                });
            },
        );

        group.bench_with_input(BenchmarkId::new("parallel", num_files), &file_paths, |b, paths| {
            b.iter(|| {
                let file_data = load_files_parallel(paths);
                black_box(file_data)
            });
        });

        cleanup_test_files(&test_files);
    }

    group.finish();
}

fn benchmark_within_file_comparison(c: &mut Criterion) {
    let mut group = c.benchmark_group("within_file_comparison");
    group.measurement_time(Duration::from_secs(15));

    let options = TSEDOptions { size_penalty: false, min_lines: 3, ..TSEDOptions::default() };

    for &num_files in &[10, 20, 50] {
        let test_files = setup_test_files(num_files, 30);
        let file_paths: Vec<PathBuf> = test_files.iter().map(|(p, _)| p.clone()).collect();

        group.throughput(Throughput::Elements(num_files as u64));

        group.bench_with_input(
            BenchmarkId::new("sequential", num_files),
            &file_paths,
            |b, paths| {
                b.iter(|| {
                    let results =
                        check_within_file_duplicates_sequential(paths, 0.8, &options, false);
                    black_box(results)
                });
            },
        );

        group.bench_with_input(BenchmarkId::new("parallel", num_files), &file_paths, |b, paths| {
            b.iter(|| {
                let results = check_within_file_duplicates_parallel(paths, 0.8, &options, false);
                black_box(results)
            });
        });

        cleanup_test_files(&test_files);
    }

    group.finish();
}

fn benchmark_cross_file_comparison(c: &mut Criterion) {
    let mut group = c.benchmark_group("cross_file_comparison");
    group.measurement_time(Duration::from_secs(20));
    group.sample_size(10);

    let options = TSEDOptions { size_penalty: false, min_lines: 3, ..TSEDOptions::default() };

    for &num_files in &[5, 10, 20] {
        let test_files = setup_test_files(num_files, 10);
        let file_paths: Vec<PathBuf> = test_files.iter().map(|(p, _)| p.clone()).collect();

        // Pre-load file data for cross-file comparison
        let file_data_seq = load_files_sequential(&file_paths);
        let file_data_par = load_files_parallel(&file_paths);

        group.throughput(Throughput::Elements((num_files * num_files) as u64));

        group.bench_with_input(
            BenchmarkId::new("sequential", num_files),
            &file_data_seq,
            |b, data| {
                b.iter(|| {
                    let results = check_cross_file_duplicates_sequential(data, 0.8, &options);
                    black_box(results)
                });
            },
        );

        group.bench_with_input(
            BenchmarkId::new("parallel", num_files),
            &file_data_par,
            |b, data| {
                b.iter(|| {
                    let results = check_cross_file_duplicates_parallel(data, 0.8, &options, false);
                    black_box(results)
                });
            },
        );

        cleanup_test_files(&test_files);
    }

    group.finish();
}

fn benchmark_scaling(c: &mut Criterion) {
    let mut group = c.benchmark_group("parallel_scaling");
    group.measurement_time(Duration::from_secs(10));

    let num_files = 50;
    let test_files = setup_test_files(num_files, 20);
    let file_paths: Vec<PathBuf> = test_files.iter().map(|(p, _)| p.clone()).collect();

    let options = TSEDOptions { size_penalty: false, min_lines: 3, ..TSEDOptions::default() };

    // Test with different thread counts
    let thread_counts = vec![1, 2, 4, 8];

    for &threads in &thread_counts {
        group.bench_with_input(BenchmarkId::new("threads", threads), &file_paths, |b, paths| {
            b.iter(|| {
                // Set thread count for this iteration
                rayon::ThreadPoolBuilder::new().num_threads(threads).build().unwrap().install(
                    || {
                        let results =
                            check_within_file_duplicates_parallel(paths, 0.8, &options, false);
                        black_box(results)
                    },
                )
            });
        });
    }

    cleanup_test_files(&test_files);
    group.finish();
}

criterion_group!(
    benches,
    benchmark_load_files_comparison,
    benchmark_within_file_comparison,
    benchmark_cross_file_comparison,
    benchmark_scaling
);
criterion_main!(benches);
