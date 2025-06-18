import { describe, it, expect } from "vitest";
import { join } from "path";
import {
  createRepository,
  loadFilesIntoRepository,
  findCodeClones,
  findAllSimilarPairs,
  findSimilarFiles,
} from "../src/index.ts";

const fixturesDir = join(__dirname, "__fixtures__", "duplication");

describe("Code Duplication Detection", () => {
  it("should find exact duplicates", async () => {
    let repo = createRepository();
    repo = await loadFilesIntoRepository(repo, join(fixturesDir, "exact", "*.ts").replace(/\\/g, "/"));

    const clones = findCodeClones(repo, 0.95);
    expect(clones).toHaveLength(1); // One group of clones
    expect(clones[0]).toHaveLength(2); // Two files in the group
  });

  it("should find structural duplicates", async () => {
    let repo = createRepository();
    repo = await loadFilesIntoRepository(repo, join(fixturesDir, "structural", "*.ts"));

    const pairs = findAllSimilarPairs(repo, 0.7);
    const highSimilarityPairs = pairs.filter((p) => p.similarity > 0.8);

    expect(highSimilarityPairs.length).toBeGreaterThan(0);
  });

  it("should find semantic duplicates with lower threshold", async () => {
    let repo = createRepository();
    repo = await loadFilesIntoRepository(repo, join(fixturesDir, "semantic", "*.ts"));

    const pairs = findAllSimilarPairs(repo, 0.6);
    expect(pairs.length).toBeGreaterThan(0);

    // Async operations should be similar
    const asyncPair = pairs.find((p) => p.file1.includes("async_operations") && p.file2.includes("async_operations"));
    expect(asyncPair).toBeDefined();
    expect(asyncPair!.similarity).toBeGreaterThan(0.7);
  });

  it("should find copy-paste patterns", async () => {
    let repo = createRepository();
    repo = await loadFilesIntoRepository(repo, join(fixturesDir, "copy_paste", "*.ts"));

    const pairs = findAllSimilarPairs(repo, 0.5);
    expect(pairs.length).toBeGreaterThan(0);
  });

  it("should find similar files to a specific file", async () => {
    let repo = createRepository();
    repo = await loadFilesIntoRepository(repo, join(fixturesDir, "**", "*.ts"));

    const targetFile = join(fixturesDir, "structural", "array_iteration_pattern_1.ts");
    const similar = findSimilarFiles(repo, targetFile, 0.6);

    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].file2).toContain("array_iteration_pattern_2");
  });

  it("should handle different similarity methods", async () => {
    let repo = createRepository();
    repo = await loadFilesIntoRepository(repo, join(fixturesDir, "structural", "*.ts"));

    const minHashPairs = findAllSimilarPairs(repo, 0.5, "minhash");
    const simHashPairs = findAllSimilarPairs(repo, 0.5, "simhash");

    // Both methods should find some similar pairs
    expect(minHashPairs.length).toBeGreaterThan(0);
    expect(simHashPairs.length).toBeGreaterThan(0);
  });

  it("should group clones correctly", async () => {
    let repo = createRepository();
    repo = await loadFilesIntoRepository(repo, join(fixturesDir, "structural", "visitnode_pattern_*.ts"));

    const clones = findCodeClones(repo, 0.8);
    expect(clones).toHaveLength(1); // One group
    expect(clones[0].length).toBeGreaterThanOrEqual(2); // At least 2 files
  });
});

describe("Repository Performance", () => {
  it("should handle empty repository", () => {
    const repo = createRepository();
    const clones = findCodeClones(repo, 0.9);
    expect(clones).toHaveLength(0);
  });

  it("should handle single file repository", async () => {
    let repo = createRepository();
    repo = await loadFilesIntoRepository(repo, join(fixturesDir, "exact", "service_duplication_1.ts"));

    const clones = findCodeClones(repo, 0.9);
    expect(clones).toHaveLength(0); // No clones with just one file
  });

  it("should scale with multiple files", async () => {
    let repo = createRepository();
    repo = await loadFilesIntoRepository(repo, join(fixturesDir, "**", "*.ts"));

    const start = performance.now();
    const pairs = findAllSimilarPairs(repo, 0.5, "minhash");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000); // Should complete within 1 second
    expect(pairs.length).toBeGreaterThan(0);
  });
});
