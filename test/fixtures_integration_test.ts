import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { extractFunctions, compareFunctions } from "../src/index.ts";
import { calculateTSED, REFACTORING_TSED_OPTIONS } from "../src/core/tsed.ts";
import { parseTypeScript } from "../src/parser.ts";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "__fixtures__");

test("Refactoring fixtures - Class to Function", async () => {
  const refactoringDir = join(fixturesDir, "refactoring/class_to_function");
  const metadata = JSON.parse(readFileSync(join(refactoringDir, "metadata.json"), "utf-8"));

  for (const testCase of metadata.testCases) {
    console.log(`\nTesting: ${testCase.name}`);

    const beforeCode = readFileSync(join(refactoringDir, testCase.files.before), "utf-8");
    const afterCode = readFileSync(join(refactoringDir, testCase.files.after), "utf-8");

    // Extract functions from both files
    const beforeFunctions = extractFunctions(beforeCode);
    const afterFunctions = extractFunctions(afterCode);

    console.log(`  Before: ${beforeFunctions.length} functions/methods`);
    console.log(`  After: ${afterFunctions.length} functions`);

    // Compare each method with its function counterpart
    for (const methodName of Object.keys(testCase.expectedSimilarity)) {
      const method = beforeFunctions.find((f) => f.name === methodName && f.type === "method");
      const func = afterFunctions.find((f) => f.name === methodName && f.type === "function");

      if (method && func) {
        const comparison = compareFunctions(method, func, {
          ignoreThis: true,
          ignoreParamNames: false,
        });

        console.log(
          `  ${methodName}: ${(comparison.similarity * 100).toFixed(1)}% (expected: ${testCase.expectedSimilarity[methodName] * 100}%)`,
        );

        // Check if similarity is close to expected
        assert(
          Math.abs(comparison.similarity - testCase.expectedSimilarity[methodName]) < 0.15,
          `Similarity for ${methodName} should be close to expected value`,
        );

        // Check semantic equivalence
        // const semanticallyEquivalent = areSemanticallySimilar(method, func);
        // assert(semanticallyEquivalent, `${methodName} should be semantically equivalent`);
      }
    }
  }
});

test("Duplication fixtures - visitNode patterns", async () => {
  const duplicationDir = join(fixturesDir, "duplication/structural");
  const metadata = JSON.parse(readFileSync(join(duplicationDir, "metadata.json"), "utf-8"));

  for (const testCase of metadata.testCases) {
    console.log(`\nTesting: ${testCase.name}`);

    const files = testCase.files.map((file: string) => ({
      name: file,
      content: readFileSync(join(duplicationDir, file), "utf-8"),
    }));

    // Compare all pairs using TSED
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const ast1 = parseTypeScript(files[i].name, files[i].content);
        const ast2 = parseTypeScript(files[j].name, files[j].content);

        const tsed = calculateTSED(ast1, ast2, REFACTORING_TSED_OPTIONS);
        const key = `${i + 1}_vs_${j + 1}`;

        console.log(`  ${files[i].name} vs ${files[j].name}: ${(tsed * 100).toFixed(1)}%`);

        if (testCase.expectedSimilarity[key]) {
          assert(
            Math.abs(tsed - testCase.expectedSimilarity[key]) < 0.15,
            `TSED for ${key} should be close to expected value`,
          );
        }
      }
    }
  }
});

test("Performance fixtures - Size categories", async () => {
  const performanceDir = join(fixturesDir, "performance");
  const metadata = JSON.parse(readFileSync(join(performanceDir, "metadata.json"), "utf-8"));

  for (const [category, info] of Object.entries(metadata.categories)) {
    console.log(`\n${category} files: ${(info as any).description}`);

    const categoryDir = join(performanceDir, category);
    const files = readdirSync(categoryDir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => ({
        name: f,
        path: join(categoryDir, f),
        content: readFileSync(join(categoryDir, f), "utf-8"),
      }));

    // Measure parsing and analysis time
    const times: number[] = [];

    for (const file of files) {
      const start = performance.now();
      // const ast = parseTypeScript(file.name, file.content);
      const functions = extractFunctions(file.content);
      const time = performance.now() - start;

      times.push(time);

      const lines = file.content.split("\n").length;
      console.log(`  ${file.name}: ${lines} lines, ${functions.length} functions, ${time.toFixed(2)}ms`);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
  }
});

test("Edge case fixtures", async () => {
  const edgeCasesDir = join(fixturesDir, "edge_cases");
  const files = readdirSync(edgeCasesDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => ({
      name: f,
      path: join(edgeCasesDir, f),
      content: readFileSync(join(edgeCasesDir, f), "utf-8"),
    }));

  console.log("\nTesting edge cases:");

  for (const file of files) {
    try {
      // const ast = parseTypeScript(file.name, file.content);
      const functions = extractFunctions(file.content);
      console.log(`  ✓ ${file.name}: Parsed successfully, ${functions.length} functions`);
    } catch (error) {
      console.log(`  ✗ ${file.name}: ${(error as Error).message}`);
    }
  }
});

// Run comparison between similar and dissimilar pairs
test("Similar vs Dissimilar fixtures", async () => {
  const similarDir = join(fixturesDir, "similar");
  const dissimilarDir = join(fixturesDir, "dissimilar");

  // Get pairs from similar directory
  const similarPairs = new Map<string, string[]>();
  readdirSync(similarDir)
    .filter((f) => f.endsWith(".ts"))
    .forEach((f) => {
      const base = f.replace(/_\d+\.ts$/, "");
      if (!similarPairs.has(base)) {
        similarPairs.set(base, []);
      }
      similarPairs.get(base)!.push(f);
    });

  console.log("\nSimilar pairs (should have high TSED):");
  for (const [base, files] of similarPairs) {
    if (files.length >= 2) {
      const file1 = readFileSync(join(similarDir, files[0]), "utf-8");
      const file2 = readFileSync(join(similarDir, files[1]), "utf-8");

      const ast1 = parseTypeScript(files[0], file1);
      const ast2 = parseTypeScript(files[1], file2);

      const tsed = calculateTSED(ast1, ast2, REFACTORING_TSED_OPTIONS);
      console.log(`  ${base}: ${(tsed * 100).toFixed(1)}%`);

      assert(tsed > 0.7, `Similar pair ${base} should have TSED > 70%`);
    }
  }

  // Test dissimilar pairs
  const dissimilarPairs = new Map<string, string[]>();
  readdirSync(dissimilarDir)
    .filter((f) => f.endsWith(".ts"))
    .forEach((f) => {
      const base = f.replace(/_\d+\.ts$/, "");
      if (!dissimilarPairs.has(base)) {
        dissimilarPairs.set(base, []);
      }
      dissimilarPairs.get(base)!.push(f);
    });

  console.log("\nDissimilar pairs (should have low TSED):");
  for (const [base, files] of dissimilarPairs) {
    if (files.length >= 2) {
      const file1 = readFileSync(join(dissimilarDir, files[0]), "utf-8");
      const file2 = readFileSync(join(dissimilarDir, files[1]), "utf-8");

      const ast1 = parseTypeScript(files[0], file1);
      const ast2 = parseTypeScript(files[1], file2);

      const tsed = calculateTSED(ast1, ast2);
      console.log(`  ${base}: ${(tsed * 100).toFixed(1)}%`);

      assert(tsed < 0.8, `Dissimilar pair ${base} should have TSED < 80%`);
    }
  }
});
