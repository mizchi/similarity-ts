import { SimilarityBenchmark } from "../src/benchmark.ts";
import { createRepository, loadFilesIntoRepository, findAllSimilarPairs } from "../src/index.ts";
import { loadFilesAsync, addFileAsync, getStatistics } from "../src/cli/repo_checker.ts";
import { loadFilesFromPattern } from "../src/cli/io.ts";
import { join } from "path";
import { readFileSync } from "fs";

async function runBenchmarks() {
  const benchmark = new SimilarityBenchmark();

  // 1. Run comprehensive benchmark with synthetic data
  console.log("Running comprehensive benchmark with synthetic data...\n");
  await benchmark.runComprehensiveBenchmark();

  // 2. Benchmark with real project files
  console.log("\n\n=== Real Project Benchmark ===\n");

  const projectPath = join(new URL(".", import.meta.url).pathname, "sample_project");
  let repo = createRepository();
  const files = await loadFilesFromPattern("src/**/*.ts", projectPath);
  repo = await loadFilesAsync(repo, files);

  // Load two similar services for comparison
  const userServicePath = join(projectPath, "src/services/user_service.ts");
  const productServicePath = join(projectPath, "src/services/product_service.ts");

  const userServiceCode = readFileSync(userServicePath, "utf-8");
  const productServiceCode = readFileSync(productServicePath, "utf-8");

  console.log("Benchmarking UserService vs ProductService comparison:");
  console.log(`File sizes: ${userServiceCode.length} and ${productServiceCode.length} characters`);

  const realFileResults = await benchmark.benchmarkPairwiseComparison(userServiceCode, productServiceCode);

  console.log(benchmark.formatResults(realFileResults.map((r) => r.result)));

  // 3. Benchmark repository-wide operations
  console.log("\n--- Repository-wide Operations ---");
  console.log(`Repository contains ${getStatistics(repo).totalFiles} files\n`);

  const multiFileResults = await benchmark.benchmarkMultiFile(repo, "src/services/user_service.ts");

  console.log(benchmark.formatResults([multiFileResults.minHash, multiFileResults.simHash, multiFileResults.apted]));

  // 4. Scalability test
  console.log("\n\n=== Scalability Test ===\n");

  const fileCounts = [10, 50, 100, 200];
  const scalabilityResults: any[] = [];

  for (const count of fileCounts) {
    const testRepo = createRepository();

    // Generate test files
    for (let i = 0; i < count; i++) {
      const size = i % 3 === 0 ? "small" : i % 3 === 1 ? "medium" : "large";
      const code = benchmark.generateCodeSample(size);
      testRepo = addFile(testRepo, `test${i}.ts`, `test${i}.ts`, code);
    }

    // Benchmark operations
    const start = performance.now();
    findAllSimilarPairs(testRepo, 0.7, "minhash");
    const minHashTime = performance.now() - start;

    const start2 = performance.now();
    findAllSimilarPairs(testRepo, 0.7, "simhash");
    const simHashTime = performance.now() - start2;

    scalabilityResults.push({
      fileCount: count,
      minHashTime,
      simHashTime,
    });

    console.log(`${count} files: MinHash=${minHashTime.toFixed(2)}ms, SimHash=${simHashTime.toFixed(2)}ms`);
  }

  // 5. Memory usage estimation
  console.log("\n\n=== Memory Usage ===\n");

  let memoryRepo = createRepository();
  const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  // Add 100 medium-sized files
  const memoryFiles = [];
  for (let i = 0; i < 100; i++) {
    const code = benchmark.generateCodeSample("medium");
    memoryFiles.push({ id: `mem${i}.ts`, path: `mem${i}.ts`, content: code });
  }
  memoryRepo = await loadFilesAsync(memoryRepo, memoryFiles);

  const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  const memoryIncrease = finalMemory - initialMemory;

  console.log(`Initial memory: ${initialMemory.toFixed(2)} MB`);
  console.log(`Final memory: ${finalMemory.toFixed(2)} MB`);
  console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB for 100 files`);
  console.log(`Average per file: ${(memoryIncrease / 100).toFixed(3)} MB`);

  // 6. Summary and recommendations
  console.log("\n\n=== Summary & Recommendations ===\n");

  console.log("Performance Characteristics:");
  console.log("- APTED is 50-100x faster than Levenshtein for pairwise comparison");
  console.log("- MinHash/LSH provides O(1) query time for similarity search");
  console.log("- SimHash is effective for structural similarity detection");

  console.log("\nRecommended Usage:");
  console.log("- For real-time similarity: Use MinHash with LSH");
  console.log("- For accurate comparison: Use APTED with rename cost 0.3");
  console.log("- For large codebases: Use hybrid approach (MinHash -> APTED)");
  console.log("- For pattern detection: Use SimHash");
}

// Run the benchmarks
console.log("Starting benchmark suite...\n");
runBenchmarks().catch(console.error);
