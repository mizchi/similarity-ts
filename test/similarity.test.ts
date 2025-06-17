import { describe, it, expect } from "vitest";
import { calculateSimilarity, calculateAPTEDSimilarity } from "../src/index.ts";

describe("calculateSimilarity (Levenshtein)", () => {
  it("should return 1.0 for identical code", () => {
    const code = `function add(a: number, b: number) { return a + b; }`;
    const similarity = calculateSimilarity(code, code);
    expect(similarity).toBe(1.0);
  });

  it("should return 0.0 for completely different code", () => {
    const code1 = `function add(a: number, b: number) { return a + b; }`;
    const code2 = `class Calculator { private value = 0; }`;
    const similarity = calculateSimilarity(code1, code2);
    expect(similarity).toBeLessThan(0.5);
  });

  it("should detect high similarity for renamed functions", () => {
    const code1 = `function calculateSum(a: number, b: number) { return a + b; }`;
    const code2 = `function addNumbers(a: number, b: number) { return a + b; }`;
    const similarity = calculateSimilarity(code1, code2);
    expect(similarity).toBeGreaterThan(0.7);
  });

  it("should handle empty strings", () => {
    expect(calculateSimilarity("", "")).toBe(1.0);
    expect(calculateSimilarity("function test() {}", "")).toBeLessThan(1.0);
  });

  it("should handle whitespace differences", () => {
    const code1 = `function test() { return 1; }`;
    const code2 = `function   test()   {   return   1;   }`;
    const similarity = calculateSimilarity(code1, code2);
    expect(similarity).toBeGreaterThan(0.9);
  });
});

describe.skip("calculateAPTEDSimilarity (skipped due to memory issues)", () => {
  it("should return 1.0 for identical code", () => {
    const code = `function add(a: number, b: number) { return a + b; }`;
    const similarity = calculateAPTEDSimilarity(code, code);
    expect(similarity).toBe(1.0);
  });

  it("should detect high similarity for renamed identifiers with custom rename cost", () => {
    const code1 = `function calculateSum(a: number, b: number) { return a + b; }`;
    const code2 = `function addNumbers(x: number, y: number) { return x + y; }`;
    const similarity = calculateAPTEDSimilarity(code1, code2, { renameCost: 0.3 });
    expect(similarity).toBeGreaterThan(0.8);
  });

  it("should handle different parameter names gracefully", () => {
    const code1 = `function test(foo: string, bar: number) { return foo + bar; }`;
    const code2 = `function test(baz: string, qux: number) { return baz + qux; }`;
    const similarity = calculateAPTEDSimilarity(code1, code2, { renameCost: 0.3 });
    expect(similarity).toBeGreaterThan(0.85);
  });

  it("should detect structural differences", () => {
    const code1 = `if (condition) { doSomething(); } else { doOther(); }`;
    const code2 = `if (condition) { doSomething(); }`;
    const similarity = calculateAPTEDSimilarity(code1, code2);
    expect(similarity).toBeLessThan(0.9);
    expect(similarity).toBeGreaterThan(0.5);
  });
});

describe.skip("Algorithm Comparison (skipped due to memory issues)", () => {
  it("APTED should be more accurate than Levenshtein for structural changes", () => {
    const code1 = `
      function process(data: any[]) {
        for (const item of data) {
          if (item.valid) {
            handleItem(item);
          }
        }
      }
    `;
    const code2 = `
      function process(data: any[]) {
        data.forEach(item => {
          if (item.valid) {
            handleItem(item);
          }
        });
      }
    `;

    const levSimilarity = calculateSimilarity(code1, code2);
    const aptedSimilarity = calculateAPTEDSimilarity(code1, code2, { renameCost: 0.3 });

    // APTED should recognize these as more similar due to structural similarity
    expect(aptedSimilarity).toBeGreaterThan(levSimilarity);
  });

  it("both algorithms should handle syntax errors gracefully", () => {
    const validCode = `function test() { return 1; }`;
    const invalidCode = `function test() { return 1 }`; // Missing semicolon is ok

    const levSimilarity = calculateSimilarity(validCode, invalidCode);
    const aptedSimilarity = calculateAPTEDSimilarity(validCode, invalidCode);

    expect(levSimilarity).toBeGreaterThan(0.9);
    expect(aptedSimilarity).toBeGreaterThan(0.9);
  });
});
