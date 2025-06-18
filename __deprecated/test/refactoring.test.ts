import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { calculateSimilarity, calculateAPTEDSimilarity } from "../src/index.ts";

const fixturesDir = join(__dirname, "__fixtures__", "refactoring", "class_to_function");

function loadFixture(filename: string): string {
  return readFileSync(join(fixturesDir, filename), "utf-8");
}

describe.skip("Class to Function Refactoring Detection (skipped due to memory issues)", () => {
  it("should detect calculator refactoring", () => {
    const classCode = loadFixture("calculator_class.ts");
    const functionCode = loadFixture("calculator_functions.ts");

    const aptedSimilarity = calculateAPTEDSimilarity(classCode, functionCode, { renameCost: 0.3 });

    // APTED should detect some structural similarity
    expect(aptedSimilarity).toBeGreaterThan(0.3);
    expect(aptedSimilarity).toBeLessThan(0.7); // But not too high, as structure changed
  });

  it("should detect repository pattern refactoring", () => {
    const classCode = loadFixture("repository_class.ts");
    const functionCode = loadFixture("repository_functions.ts");

    const similarity = calculateAPTEDSimilarity(classCode, functionCode, { renameCost: 0.3 });

    // Should detect that the logic is similar even though structure changed
    expect(similarity).toBeGreaterThan(0.25);
    expect(similarity).toBeLessThan(0.6);
  });

  it("should detect user service refactoring", () => {
    const classCode = loadFixture("user_service_class.ts");
    const functionCode = loadFixture("user_service_functions.ts");

    const similarity = calculateAPTEDSimilarity(classCode, functionCode, { renameCost: 0.3 });

    // Service logic should be recognized as similar
    expect(similarity).toBeGreaterThan(0.3);
    expect(similarity).toBeLessThan(0.7);
  });

  it("Levenshtein should show lower similarity for paradigm changes", () => {
    const classCode = loadFixture("calculator_class.ts");
    const functionCode = loadFixture("calculator_functions.ts");

    const levSimilarity = calculateSimilarity(classCode, functionCode);

    // Levenshtein should see these as quite different
    expect(levSimilarity).toBeLessThan(0.5);
  });

  it("APTED should be better than Levenshtein for refactoring detection", () => {
    const testCases = [
      { class: "calculator_class.ts", function: "calculator_functions.ts" },
      { class: "repository_class.ts", function: "repository_functions.ts" },
      { class: "user_service_class.ts", function: "user_service_functions.ts" },
    ];

    for (const testCase of testCases) {
      const classCode = loadFixture(testCase.class);
      const functionCode = loadFixture(testCase.function);

      const levSimilarity = calculateSimilarity(classCode, functionCode);
      const aptedSimilarity = calculateAPTEDSimilarity(classCode, functionCode, { renameCost: 0.3 });

      // APTED should generally give higher scores for refactored code
      expect(aptedSimilarity).toBeGreaterThanOrEqual(levSimilarity);
    }
  });
});

describe.skip("Refactoring Pattern Recognition (skipped due to memory issues)", () => {
  it("should recognize method extraction patterns", () => {
    const before = `
      class Service {
        process(data: any) {
          // validation
          if (!data) throw new Error("Invalid");
          
          // transformation
          const result = transform(data);
          
          // save
          save(result);
        }
      }
    `;

    const after = `
      function validate(data: any) {
        if (!data) throw new Error("Invalid");
      }
      
      function process(data: any) {
        validate(data);
        const result = transform(data);
        save(result);
      }
    `;

    const similarity = calculateAPTEDSimilarity(before, after, { renameCost: 0.3 });
    expect(similarity).toBeGreaterThan(0.5); // Should recognize the pattern
  });

  it("should recognize state management refactoring", () => {
    const classState = `
      class Counter {
        private count = 0;
        increment() { this.count++; }
        getCount() { return this.count; }
      }
    `;

    const functionState = `
      function createCounter() {
        let count = 0;
        return {
          increment: () => { count++; },
          getCount: () => count
        };
      }
    `;

    const similarity = calculateAPTEDSimilarity(classState, functionState, { renameCost: 0.3 });
    expect(similarity).toBeGreaterThan(0.4); // Should see similar patterns
  });
});
