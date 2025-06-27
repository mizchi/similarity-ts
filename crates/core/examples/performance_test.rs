use similarity_core::{
    find_similar_functions_fast, find_similar_functions_in_file, FastSimilarityOptions, TSEDOptions,
};
use std::time::Instant;

const TEST_CODE: &str = r#"
// 20 functions with varying similarity
export function processData1(data: any[]): number {
    let result = 0;
    for (const item of data) {
        result += item.value;
    }
    return result;
}

export function processData2(items: any[]): number {
    let sum = 0;
    for (const element of items) {
        sum += element.value;
    }
    return sum;
}

export function processData3(list: any[]): number {
    let total = 0;
    for (const obj of list) {
        total += obj.value;
    }
    return total;
}

export function calculateSum(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
}

export function computeTotal(values: number[]): number {
    return values.reduce((x, y) => x + y, 0);
}

export function findMax(arr: number[]): number {
    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) max = arr[i];
    }
    return max;
}

export function findMin(arr: number[]): number {
    let min = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < min) min = arr[i];
    }
    return min;
}

export function multiply(a: number, b: number): number {
    return a * b;
}

export function divide(a: number, b: number): number {
    if (b === 0) throw new Error("Division by zero");
    return a / b;
}

export function factorial(n: number): number {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

export function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

export function isPrime(n: number): boolean {
    if (n <= 1) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) return false;
    }
    return true;
}

export function reverseString(str: string): string {
    return str.split('').reverse().join('');
}

export function palindrome(str: string): boolean {
    const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleaned === cleaned.split('').reverse().join('');
}

export function bubbleSort(arr: number[]): number[] {
    const result = [...arr];
    for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < result.length - i - 1; j++) {
            if (result[j] > result[j + 1]) {
                [result[j], result[j + 1]] = [result[j + 1], result[j]];
            }
        }
    }
    return result;
}

export function quickSort(arr: number[]): number[] {
    if (arr.length <= 1) return arr;
    const pivot = arr[0];
    const left = arr.slice(1).filter(x => x <= pivot);
    const right = arr.slice(1).filter(x => x > pivot);
    return [...quickSort(left), pivot, ...quickSort(right)];
}

export function mergeSort(arr: number[]): number[] {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    return merge(left, right);
}

function merge(left: number[], right: number[]): number[] {
    const result: number[] = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) {
            result.push(left[i++]);
        } else {
            result.push(right[j++]);
        }
    }
    return [...result, ...left.slice(i), ...right.slice(j)];
}

export function binarySearch(arr: number[], target: number): number {
    let left = 0, right = arr.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

export function linearSearch(arr: number[], target: number): number {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) return i;
    }
    return -1;
}
"#;

fn main() {
    println!("Performance comparison: Standard vs Fast similarity detection\n");

    let tsed_options = TSEDOptions { min_lines: 3, ..Default::default() };

    println!(
        "Test code has {} functions",
        TEST_CODE.lines().filter(|l| l.contains("export function")).count()
    );

    let fast_options = FastSimilarityOptions {
        fingerprint_threshold: 0.5,
        similarity_threshold: 0.6,
        tsed_options: tsed_options.clone(),
        debug_stats: true,
    };

    // Warm up
    let _ = find_similar_functions_in_file("test.ts", TEST_CODE, 0.6, &tsed_options);
    let _ = find_similar_functions_fast("test.ts", TEST_CODE, &fast_options);

    // Standard version
    println!("Running standard similarity detection...");
    let start = Instant::now();
    let standard_results = find_similar_functions_in_file("test.ts", TEST_CODE, 0.6, &tsed_options)
        .expect("Standard analysis failed");
    let standard_time = start.elapsed();

    println!("Standard version:");
    println!("  Time: {standard_time:?}");
    println!("  Found {} similar pairs", standard_results.len());
    if !standard_results.is_empty() {
        for result in &standard_results[..3.min(standard_results.len())] {
            println!(
                "    {} ~ {} ({:.2}%)",
                result.func1.name,
                result.func2.name,
                result.similarity * 100.0
            );
        }
    }

    // Fast version
    println!("\nRunning fast similarity detection...");
    let start = Instant::now();
    let fast_results = find_similar_functions_fast("test.ts", TEST_CODE, &fast_options)
        .expect("Fast analysis failed");
    let fast_time = start.elapsed();

    println!("\nFast version:");
    println!("  Time: {fast_time:?}");
    println!("  Found {} similar pairs", fast_results.len());

    // Compare results
    let speedup = standard_time.as_secs_f64() / fast_time.as_secs_f64();
    println!("\nSpeedup: {speedup:.2}x");

    // Run multiple iterations for more accurate timing
    println!("\nRunning 100 iterations for accurate timing...");

    let start = Instant::now();
    for _ in 0..100 {
        let _ = find_similar_functions_in_file("test.ts", TEST_CODE, 0.6, &tsed_options);
    }
    let standard_100_time = start.elapsed();

    let start = Instant::now();
    for _ in 0..100 {
        let _ = find_similar_functions_fast("test.ts", TEST_CODE, &fast_options);
    }
    let fast_100_time = start.elapsed();

    println!("\n100 iterations:");
    println!("  Standard: {:?} (avg: {:?})", standard_100_time, standard_100_time / 100);
    println!("  Fast: {:?} (avg: {:?})", fast_100_time, fast_100_time / 100);

    let speedup_100 = standard_100_time.as_secs_f64() / fast_100_time.as_secs_f64();
    println!("  Speedup: {speedup_100:.2}x");
}
