export function calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    let sum = 0;
    for (const num of numbers) {
        sum += num;
    }
    return sum / numbers.length;
}
