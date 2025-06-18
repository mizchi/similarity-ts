export function computeMean(values: number[]): number {
    if (values.length === 0) return 0;
    let sum = 0;
    for (const val of values) {
        sum += val;
    }
    return sum / values.length;
}
