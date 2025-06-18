// Test sample 1: Different functions that should have low similarity

export function processUserData(users: User[]): ProcessedData {
    const result: ProcessedData = {
        total: users.length,
        active: 0,
        inactive: 0
    };
    
    for (const user of users) {
        if (user.isActive) {
            result.active++;
        } else {
            result.inactive++;
        }
    }
    
    return result;
}

export function calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    let sum = 0;
    for (const num of numbers) {
        sum += num;
    }
    
    return sum / numbers.length;
}

// Similar structure but different purpose
export function findMaxValue(values: number[]): number {
    if (values.length === 0) return -Infinity;
    
    let max = values[0];
    for (let i = 1; i < values.length; i++) {
        if (values[i] > max) {
            max = values[i];
        }
    }
    
    return max;
}