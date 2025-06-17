#!/usr/bin/env tsx
/**
 * Test async functionality after refactoring
 */

import { calculateAPTEDSimilarityAsync, calculateAPTEDSimilarityFromAST, parseAsync } from "../src/index.ts";

async function main() {
  const code1 = `
    function add(a: number, b: number): number {
      return a + b;
    }
  `;

  const code2 = `
    function sum(x: number, y: number): number {
      return x + y;
    }
  `;

  console.log("Testing async APTED similarity...");
  const similarity = await calculateAPTEDSimilarityAsync(code1, code2);
  console.log(`Similarity: ${(similarity * 100).toFixed(1)}%`);

  console.log("\nTesting with pre-parsed AST...");
  const [ast1, ast2] = await Promise.all([parseAsync("test1.ts", code1), parseAsync("test2.ts", code2)]);

  const similarityFromAST = calculateAPTEDSimilarityFromAST(ast1, ast2);
  console.log(`Similarity from AST: ${(similarityFromAST * 100).toFixed(1)}%`);

  console.log("\nCore modules remain sync - async parsing is handled at the application level ✓");
}

main().catch(console.error);
