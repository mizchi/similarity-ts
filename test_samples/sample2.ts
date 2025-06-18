// Test sample 2: Similar functions that should have high similarity

export function calculateSum(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    let total = 0;
    for (const num of numbers) {
        total += num;
    }
    
    return total;
}

// Very similar to calculateAverage from sample1.ts
export function computeMean(values: number[]): number {
    if (values.length === 0) return 0;
    
    let sum = 0;
    for (const val of values) {
        sum += val;
    }
    
    return sum / values.length;
}