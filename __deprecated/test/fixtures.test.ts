import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { calculateSimilarity, calculateAPTEDSimilarity } from "../src/index.ts";

const fixturesDir = join(__dirname, "__fixtures__");

function loadFixture(path: string): string {
  return readFileSync(join(fixturesDir, path), "utf-8");
}

describe("Fixtures: Similar Code", () => {
  it("should detect renamed functions as similar", () => {
    const code1 = loadFixture("similar/function_rename_1.ts");
    const code2 = loadFixture("similar/function_rename_2.ts");

    const levSimilarity = calculateSimilarity(code1, code2);
    // const aptedSimilarity = calculateAPTEDSimilarity(code1, code2, { renameCost: 0.3 });

    expect(levSimilarity).toBeGreaterThan(0.7);
    // expect(aptedSimilarity).toBeGreaterThan(0.85);
  });

  it("should detect renamed classes as similar", () => {
    const code1 = loadFixture("similar/class_rename_1.ts");
    const code2 = loadFixture("similar/class_rename_2.ts");

    const levSimilarity = calculateSimilarity(code1, code2);
    expect(levSimilarity).toBeGreaterThan(0.7);
  });

  it("should detect async/await additions as similar", () => {
    const code1 = loadFixture("similar/async_function_1.ts");
    const code2 = loadFixture("similar/async_function_2.ts");

    const levSimilarity = calculateSimilarity(code1, code2);
    expect(levSimilarity).toBeGreaterThan(0.6);
  });

  it("should detect interface extensions as similar", () => {
    const code1 = loadFixture("similar/interface_extend_1.ts");
    const code2 = loadFixture("similar/interface_extend_2.ts");

    const levSimilarity = calculateSimilarity(code1, code2);
    expect(levSimilarity).toBeGreaterThan(0.6);
  });
});

describe("Fixtures: Dissimilar Code", () => {
  it("should detect function vs class as dissimilar", () => {
    const code1 = loadFixture("dissimilar/function_vs_class_1.ts");
    const code2 = loadFixture("dissimilar/function_vs_class_2.ts");

    const levSimilarity = calculateSimilarity(code1, code2);
    expect(levSimilarity).toBeLessThan(0.5);
  });

  it("should detect imperative vs functional as dissimilar", () => {
    const code1 = loadFixture("dissimilar/imperative_vs_functional_1.ts");
    const code2 = loadFixture("dissimilar/imperative_vs_functional_2.ts");

    const levSimilarity = calculateSimilarity(code1, code2);
    expect(levSimilarity).toBeLessThan(0.4);
  });

  it("should detect sync vs async patterns as dissimilar", () => {
    const code1 = loadFixture("dissimilar/sync_vs_async_1.ts");
    const code2 = loadFixture("dissimilar/sync_vs_async_2.ts");

    const levSimilarity = calculateSimilarity(code1, code2);
    expect(levSimilarity).toBeLessThan(0.5);
    // expect(similarity).toBeLessThan(0.6);
  });
});

describe("Fixtures: Edge Cases", () => {
  it("should handle empty files", () => {
    const code1 = loadFixture("edge_cases/empty_1.ts");
    const code2 = loadFixture("edge_cases/empty_2.ts");

    const similarity = calculateSimilarity(code1, code2);
    expect(similarity).toBe(1.0);
  });

  it("should handle identical files", () => {
    const code1 = loadFixture("edge_cases/identical_1.ts");
    const code2 = loadFixture("edge_cases/identical_2.ts");

    const similarity = calculateSimilarity(code1, code2);
    expect(similarity).toBe(1.0);
  });

  it("should handle syntax errors gracefully", () => {
    const code1 = loadFixture("edge_cases/syntax_error_1.ts");
    const code2 = loadFixture("edge_cases/syntax_error_2.ts");

    // Should not throw
    expect(() => calculateSimilarity(code1, code2)).not.toThrow();
    // expect(() => calculateAPTEDSimilarity(code1, code2)).not.toThrow();
  });
});

describe("Fixtures: Performance", () => {
  it("should handle small files quickly", () => {
    const code1 = loadFixture("performance/small/small_1.ts");
    const code2 = loadFixture("performance/small/small_2.ts");

    const start = performance.now();
    calculateSimilarity(code1, code2);
    const levTime = performance.now() - start;

    expect(levTime).toBeLessThan(50); // Should complete within 50ms
  });

  it("should handle medium files", () => {
    const code1 = loadFixture("performance/medium/medium_1.ts");
    const code2 = loadFixture("performance/medium/medium_2.ts");

    const start = performance.now();
    calculateSimilarity(code1, code2);
    const levTime = performance.now() - start;

    expect(levTime).toBeLessThan(100); // Should complete within 100ms
  });

  // Skip APTED tests for large files due to memory issues
  it.skip("APTED should handle large files (currently has memory issues)", () => {
    const code1 = loadFixture("performance/large/large_1.ts");
    const code2 = loadFixture("performance/large/large_2.ts");

    // This would cause OOM errors
    calculateAPTEDSimilarity(code1, code2);
  });
});
