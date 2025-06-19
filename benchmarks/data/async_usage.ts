#!/usr/bin/env tsx
/**
 * Example demonstrating async parsing and parallel processing
 */

import {
  createRepository,
  loadFilesIntoRepositoryAsync,
  findSimilarByAPTEDAsync,
  calculateAPTEDSimilarityAsync,
} from "../src/index.ts";

async function main() {
  console.log("=== Async Parsing Example ===\n");

  // Example 1: Calculate similarity between two code snippets
  const code1 = `
    class UserService {
      constructor(private db: Database) {}
      
      async getUser(id: string): Promise<User> {
        return this.db.users.findById(id);
      }
      
      async updateUser(id: string, data: Partial<User>): Promise<User> {
        return this.db.users.update(id, data);
      }
    }
  `;

  const code2 = `
    class ProductService {
      constructor(private database: Database) {}
      
      async getProduct(productId: string): Promise<Product> {
        return this.database.products.findById(productId);
      }
      
      async updateProduct(productId: string, info: Partial<Product>): Promise<Product> {
        return this.database.products.update(productId, info);
      }
    }
  `;

  // Calculate similarity using async parsing
  console.time("Async similarity calculation");
  const similarity = await calculateAPTEDSimilarityAsync(code1, code2, {
    renameCost: 0.3,
  });
  console.timeEnd("Async similarity calculation");
  console.log(`Similarity: ${(similarity * 100).toFixed(1)}%\n`);

  // Example 2: Load and analyze multiple files in parallel
  console.log("=== Parallel File Processing Example ===\n");

  const repo = createRepository();

  // Load files from the src directory with parallel parsing
  console.time("Loading files with parallel parsing");
  const loadedRepo = await loadFilesIntoRepositoryAsync(repo, "src/**/*.ts");
  console.timeEnd("Loading files with parallel parsing");

  const stats = loadedRepo.getStatistics();
  console.log(`Loaded ${stats.totalFiles} files`);
  console.log(`Repository size: ${(stats.totalSize / 1024).toFixed(1)} KB\n`);

  // Find similar files using async APTED comparison
  if (stats.totalFiles > 0) {
    const firstFileId = loadedRepo.getFiles()[0].id;

    console.time("Finding similar files");
    const similar = await findSimilarByAPTEDAsync(loadedRepo, firstFileId, 0.7);
    console.timeEnd("Finding similar files");

    if (similar.length > 0) {
      console.log(`\nFound ${similar.length} similar files:`);
      similar.slice(0, 5).forEach((result) => {
        console.log(`  ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
      });
    }
  }

  // Example 3: Compare parsing performance
  console.log("\n=== Performance Comparison ===\n");

  const testCode = `
    import { parseTypeScript } from './parser';
    
    export function analyzeCode(code: string) {
      const ast = parseTypeScript('file.ts', code);
      return ast.program.body.length;
    }
  `;

  // Measure sync parsing time
  console.time("Sync parsing (100 iterations)");
  for (let i = 0; i < 100; i++) {
    const { calculateSimilarity } = await import("../src/index.ts");
    calculateSimilarity(testCode, testCode);
  }
  console.timeEnd("Sync parsing (100 iterations)");

  // Measure async parsing time with parallelism
  console.time("Async parsing (100 iterations in parallel)");
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(calculateAPTEDSimilarityAsync(testCode, testCode));
  }
  await Promise.all(promises);
  console.timeEnd("Async parsing (100 iterations in parallel)");
}

main().catch(console.error);
