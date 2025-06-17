// Stateful Calculator class
class Calculator {
  private value: number = 0;
  
  add(n: number): number {
    this.value += n;
    return this.value;
  }
  
  subtract(n: number): number {
    this.value -= n;
    return this.value;
  }
  
  multiply(n: number): number {
    this.value *= n;
    return this.value;
  }
  
  divide(n: number): number {
    if (n === 0) {
      throw new Error('Division by zero');
    }
    this.value /= n;
    return this.value;
  }
  
  reset(): void {
    this.value = 0;
  }
  
  getValue(): number {
    return this.value;
  }
}