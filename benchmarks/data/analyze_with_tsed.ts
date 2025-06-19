// Analyze TypeScript project using TSED
import { buildRepoAnalyzer, calculateTSEDWithMetrics, REFACTORING_TSED_OPTIONS } from "../src/index.ts";
import { parseTypeScript } from "../src/parser.ts";
import { readFileSync } from "fs";

async function analyzeTSSimilarityProject() {
  console.log("=== Analyzing similarity-ts Project with TSED ===\n");

  const repo = buildRepoAnalyzer();

  // Load source files
  console.log("Loading source files...");
  await repo.loadFiles("src/**/*.ts");

  const stats = repo.getStatistics();
  console.log(`Loaded ${stats.totalFiles} files`);
  console.log(`Average tokens per file: ${stats.averageTokens.toFixed(0)}`);
  console.log(`Total unique tokens: ${stats.uniqueTokens}\n`);

  // Analyze specific files with TSED
  console.log("--- TSED Analysis of Core Modules ---\n");

  const coreFiles = ["src/core/apted.ts", "src/core/tsed.ts", "src/core/ast.ts", "src/core/levenshtein.ts"];

  // Compare each pair
  for (let i = 0; i < coreFiles.length; i++) {
    for (let j = i + 1; j < coreFiles.length; j++) {
      try {
        const code1 = readFileSync(coreFiles[i], "utf-8");
        const code2 = readFileSync(coreFiles[j], "utf-8");

        const ast1 = parseTypeScript(coreFiles[i], code1);
        const ast2 = parseTypeScript(coreFiles[j], code2);

        const metrics = calculateTSEDWithMetrics(ast1, ast2, REFACTORING_TSED_OPTIONS);

        console.log(`${coreFiles[i].split("/").pop()} <-> ${coreFiles[j].split("/").pop()}`);
        console.log(`  TSED: ${(metrics.tsed * 100).toFixed(1)}%`);
        console.log(`  Edit Distance: ${metrics.editDistance}`);
        console.log(`  Nodes: ${metrics.tree1Nodes} vs ${metrics.tree2Nodes}`);
        console.log();
      } catch (e) {
        console.error(`Error comparing ${coreFiles[i]} and ${coreFiles[j]}:`, e.message);
      }
    }
  }

  // Find most similar files using TSED
  console.log("--- Finding Similar Files with TSED (threshold: 70%) ---\n");

  const targetFile = "src/core/apted.ts";
  const aptedResults = await repo.findSimilarByAPTED(targetFile, 0.7, 20);

  console.log(`Files similar to ${targetFile}:`);
  for (const result of aptedResults.slice(0, 10)) {
    const fileName = result.file2.split("/").pop();
    console.log(`  ${fileName}: ${(result.similarity * 100).toFixed(1)}%`);
  }
  console.log();

  // Compare TSED with other methods
  console.log("--- Comparing TSED with MinHash/SimHash ---\n");

  const testFile = "src/index.ts";

  console.log(`Analyzing ${testFile}:`);

  const minHashResults = repo.findSimilarByMinHash(testFile, 0.5);
  const simHashResults = repo.findSimilarBySimHash(testFile, 0.5);
  const tsedResults = await repo.findSimilarByAPTED(testFile, 0.5, 10);

  console.log("\nMinHash results (top 5):");
  for (const result of minHashResults.slice(0, 5)) {
    console.log(`  ${result.file2.split("/").pop()}: ${(result.similarity * 100).toFixed(1)}%`);
  }

  console.log("\nSimHash results (top 5):");
  for (const result of simHashResults.slice(0, 5)) {
    console.log(`  ${result.file2.split("/").pop()}: ${(result.similarity * 100).toFixed(1)}%`);
  }

  console.log("\nTSED results (top 5):");
  for (const result of tsedResults.slice(0, 5)) {
    console.log(`  ${result.file2.split("/").pop()}: ${(result.similarity * 100).toFixed(1)}%`);
  }

  // Analyze refactoring opportunities
  console.log("\n--- Potential Refactoring Opportunities (TSED > 85%) ---\n");

  const allPairs = await Promise.all(
    ["src/core/apted.ts", "src/core/tokens.ts", "src/core/hash.ts"].map(async (file) => {
      const results = await repo.findSimilarByAPTED(file, 0.85, 10);
      return { file, results };
    }),
  );

  for (const { file, results } of allPairs) {
    if (results.length > 0) {
      console.log(`${file}:`);
      for (const result of results) {
        console.log(`  -> ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
      }
      console.log();
    }
  }

  // Performance comparison
  console.log("--- Performance Comparison ---\n");

  const perfTestFile = "src/parser.ts";

  const start1 = performance.now();
  repo.findSimilarByMinHash(perfTestFile, 0.7);
  const minHashTime = performance.now() - start1;

  const start2 = performance.now();
  repo.findSimilarBySimHash(perfTestFile, 0.7);
  const simHashTime = performance.now() - start2;

  const start3 = performance.now();
  await repo.findSimilarByAPTED(perfTestFile, 0.7, 5);
  const tsedTime = performance.now() - start3;

  console.log(`MinHash: ${minHashTime.toFixed(2)}ms`);
  console.log(`SimHash: ${simHashTime.toFixed(2)}ms`);
  console.log(`TSED (5 candidates): ${tsedTime.toFixed(2)}ms`);
  console.log();

  console.log("Summary:");
  console.log("- TSED provides the most accurate structural similarity");
  console.log("- MinHash/SimHash are faster for large-scale searches");
  console.log("- Best practice: Use MinHash/SimHash for candidate selection, then TSED for precise comparison");
}

analyzeTSSimilarityProject().catch(console.error);
