// Copy-paste duplication: Loop patterns with similar structure
// Common pattern where loops are copied and modified slightly

export function findMaxValue(numbers: number[]): number {
  let max = numbers[0];
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] > max) {
      max = numbers[i];
    }
  }
  return max;
}

export function findMinValue(numbers: number[]): number {
  let min = numbers[0];
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] < min) {
      min = numbers[i];
    }
  }
  return min;
}

export function calculateSum(numbers: number[]): number {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum;
}

export function calculateProduct(numbers: number[]): number {
  let product = 1;
  for (let i = 0; i < numbers.length; i++) {
    product *= numbers[i];
  }
  return product;
}

export function countPositive(numbers: number[]): number {
  let count = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] > 0) {
      count++;
    }
  }
  return count;
}

export function countNegative(numbers: number[]): number {
  let count = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] < 0) {
      count++;
    }
  }
  return count;
}