// Simple loop patterns that are structurally identical
// These demonstrate pure structural duplication

export function sumNumbers(numbers: number[]): number {
  let total = 0;
  for (const num of numbers) {
    total += num;
  }
  return total;
}

export function sumPrices(prices: number[]): number {
  let total = 0;
  for (const price of prices) {
    total += price;
  }
  return total;
}

export function sumScores(scores: number[]): number {
  let total = 0;
  for (const score of scores) {
    total += score;
  }
  return total;
}