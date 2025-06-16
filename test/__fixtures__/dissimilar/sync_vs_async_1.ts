// Dissimilar: Synchronous code
function calculateTotal(items: number[]): number {
  let total = 0;
  for (const item of items) {
    total += item;
  }
  return total;
}