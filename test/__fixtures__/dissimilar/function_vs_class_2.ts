// Dissimilar: Class implementation
class DataProcessor {
  private cache: Map<string, string> = new Map();

  process(input: string): string {
    if (this.cache.has(input)) {
      return this.cache.get(input)!;
    }
    const result = this.transform(input);
    this.cache.set(input, result);
    return result;
  }

  private transform(data: string): string {
    return data.toUpperCase();
  }
}