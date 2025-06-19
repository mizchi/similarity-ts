import {
  calculateSimilarity,
  calculateAPTEDSimilarity,
  createRepository,
  addFile,
  findSimilarByMinHash,
  findSimilarBySimHash,
  findSimilarByAPTED,
  type RepositoryState,
} from "./index.ts";
import { performance } from "perf_hooks";

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
}

export interface ComparisonBenchmark {
  algorithm: string;
  fileSize: number;
  result: BenchmarkResult;
}

export class SimilarityBenchmark {
  /**
   * Run benchmark for a specific algorithm
   */
  async runBenchmark(
    name: string,
    fn: () => any,
    iterations: number = 100,
    warmup: number = 10,
  ): Promise<BenchmarkResult> {
    // Warmup
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Calculate standard deviation
    const variance = times.reduce((sum, t) => sum + Math.pow(t - averageTime, 2), 0) / iterations;
    const standardDeviation = Math.sqrt(variance);

    return {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
    };
  }

  /**
   * Benchmark pairwise comparison algorithms
   */
  async benchmarkPairwiseComparison(code1: string, code2: string): Promise<ComparisonBenchmark[]> {
    const fileSize = (code1.length + code2.length) / 2;
    const results: ComparisonBenchmark[] = [];

    // Levenshtein
    const levResult = await this.runBenchmark("Levenshtein", () => calculateSimilarity(code1, code2), 50, 5);
    results.push({ algorithm: "Levenshtein", fileSize, result: levResult });

    // APTED (default)
    const aptedResult = await this.runBenchmark("APTED (default)", () => calculateAPTEDSimilarity(code1, code2), 20, 5);
    results.push({
      algorithm: "APTED (default)",
      fileSize,
      result: aptedResult,
    });

    // APTED (custom)
    const aptedCustomResult = await this.runBenchmark(
      "APTED (rename=0.3)",
      () => calculateAPTEDSimilarity(code1, code2, { renameCost: 0.3 }),
      20,
      5,
    );
    results.push({
      algorithm: "APTED (rename=0.3)",
      fileSize,
      result: aptedCustomResult,
    });

    return results;
  }

  /**
   * Benchmark multi-file operations
   */
  async benchmarkMultiFile(
    repo: RepositoryState,
    targetFile: string,
  ): Promise<{
    minHash: BenchmarkResult;
    simHash: BenchmarkResult;
    apted: BenchmarkResult;
  }> {
    const minHashResult = await this.runBenchmark(
      "MinHash/LSH",
      () => findSimilarByMinHash(repo, targetFile, 0.5),
      100,
      10,
    );

    const simHashResult = await this.runBenchmark(
      "SimHash",
      () => findSimilarBySimHash(repo, targetFile, 0.5),
      100,
      10,
    );

    const aptedResult = await this.runBenchmark(
      "APTED (top 10)",
      () => findSimilarByAPTED(repo, targetFile, 0.5, 10),
      20,
      5,
    );

    return {
      minHash: minHashResult,
      simHash: simHashResult,
      apted: aptedResult,
    };
  }

  /**
   * Generate code samples of different sizes
   */
  generateCodeSample(size: "small" | "medium" | "large"): string {
    const sizes = {
      small: 5,
      medium: 20,
      large: 50,
    };

    const count = sizes[size];
    let code = "";

    // Add imports
    code += `import { Service } from './base';\n`;
    code += `import { Logger } from './logger';\n\n`;

    // Add interfaces
    for (let i = 0; i < count / 5; i++) {
      code += `interface Entity${i} {\n`;
      code += `  id: string;\n`;
      code += `  name: string;\n`;
      code += `  value: number;\n`;
      code += `}\n\n`;
    }

    // Add classes
    for (let i = 0; i < count / 2; i++) {
      code += `class Service${i} extends Service<Entity${i % (count / 5)}> {\n`;
      code += `  private cache: Map<string, Entity${i % (count / 5)}> = new Map();\n\n`;
      code += `  async process(id: string): Promise<void> {\n`;
      code += `    const entity = await this.get(id);\n`;
      code += `    if (entity) {\n`;
      code += `      this.cache.set(id, entity);\n`;
      code += `      this.logger.info(\`Processed \${id}\`);\n`;
      code += `    }\n`;
      code += `  }\n`;
      code += `}\n\n`;
    }

    // Add functions
    for (let i = 0; i < count; i++) {
      code += `function utility${i}(param: string): string {\n`;
      code += `  return param.toLowerCase().trim();\n`;
      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Format benchmark results as a table
   */
  formatResults(results: BenchmarkResult[]): string {
    let output = "\n";
    output += "| Algorithm | Avg Time (ms) | Min Time | Max Time | Std Dev | Iterations |\n";
    output += "|-----------|---------------|----------|----------|---------|------------|\n";

    for (const result of results) {
      output += `| ${result.name.padEnd(9)} `;
      output += `| ${result.averageTime.toFixed(2).padStart(13)} `;
      output += `| ${result.minTime.toFixed(2).padStart(8)} `;
      output += `| ${result.maxTime.toFixed(2).padStart(8)} `;
      output += `| ${result.standardDeviation.toFixed(2).padStart(7)} `;
      output += `| ${result.iterations.toString().padStart(10)} |\n`;
    }

    return output;
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runComprehensiveBenchmark(): Promise<void> {
    console.log("=== Comprehensive Similarity Benchmark ===\n");

    // Test different code sizes
    const sizes: Array<"small" | "medium" | "large"> = ["small", "medium", "large"];

    for (const size of sizes) {
      console.log(`\n--- ${size.toUpperCase()} Code Size ---`);

      const code1 = this.generateCodeSample(size);
      const code2 = this.generateCodeSample(size);
      // Make code2 slightly different
      const modifiedCode2 = code2
        .replace(/Service(\d+)/g, "Manager$1")
        .replace(/utility(\d+)/g, "helper$1")
        .replace(/Entity(\d+)/g, "Model$1");

      console.log(`Code size: ${code1.length} characters`);

      const results = await this.benchmarkPairwiseComparison(code1, modifiedCode2);
      const benchmarkResults = results.map((r) => r.result);
      console.log(this.formatResults(benchmarkResults));

      // Show relative performance
      const baseline = benchmarkResults[0].averageTime;
      console.log("\nRelative Performance:");
      benchmarkResults.forEach((result) => {
        const relative = baseline / result.averageTime;
        console.log(`  ${result.name}: ${relative.toFixed(2)}x`);
      });
    }

    // Test multi-file operations
    console.log("\n\n--- Multi-File Operations ---");
    let repo = createRepository();

    // Add test files
    for (let i = 0; i < 50; i++) {
      const code = this.generateCodeSample(i % 3 === 0 ? "small" : i % 3 === 1 ? "medium" : "large");
      repo = addFile(repo, `file${i}.ts`, `file${i}.ts`, code);
    }

    console.log(`Repository contains ${50} files`);

    const multiFileResults = await this.benchmarkMultiFile(repo, "file0.ts");
    const multiFileBenchmarks = [multiFileResults.minHash, multiFileResults.simHash, multiFileResults.apted];

    console.log(this.formatResults(multiFileBenchmarks));
  }
}
