import { buildRepoAnalyzer } from "../src/index.ts";
import { join } from "path";

async function analyzeProject() {
  console.log("=== Sample Project Code Similarity Analysis ===\n");

  const repo = buildRepoAnalyzer();
  const projectPath = join(new URL(".", import.meta.url).pathname, "sample_project");

  // Load all TypeScript files from the sample project
  console.log("Loading project files...");
  await repo.loadFiles("src/**/*.ts", projectPath);

  const stats = repo.getStatistics();
  console.log(`\nProject Statistics:`);
  console.log(`- Total files: ${stats.totalFiles}`);
  console.log(`- Average tokens per file: ${stats.averageTokens.toFixed(0)}`);
  console.log(`- Unique tokens: ${stats.uniqueTokens}`);

  // 1. Find code clones (threshold: 80%)
  console.log("\n\n--- Code Clones (>80% similarity) ---");
  const clones = repo.findClones(0.8);

  if (clones.size === 0) {
    console.log("No exact clones found.");
  } else {
    let groupNum = 1;
    for (const [representative, group] of clones) {
      console.log(`\nClone Group ${groupNum++}:`);
      group.forEach((file) => {
        console.log(`  - ${file}`);
      });
    }
  }

  // 2. Find all similar pairs (threshold: 50%)
  console.log("\n\n--- Similar Code Pairs (>50% similarity) ---");
  const similarPairs = repo.findAllSimilarPairs(0.5, "minhash");

  if (similarPairs.length === 0) {
    console.log("No similar pairs found at this threshold.");
  } else {
    console.log(`Found ${similarPairs.length} similar pairs:\n`);

    // Group by similarity ranges
    const highSimilarity = similarPairs.filter((p) => p.similarity >= 0.8);
    const mediumSimilarity = similarPairs.filter((p) => p.similarity >= 0.7 && p.similarity < 0.8);
    const lowSimilarity = similarPairs.filter((p) => p.similarity >= 0.5 && p.similarity < 0.7);

    if (highSimilarity.length > 0) {
      console.log("High similarity (80-100%):");
      highSimilarity.forEach((pair) => {
        console.log(`  ${pair.file1} <-> ${pair.file2}: ${(pair.similarity * 100).toFixed(1)}%`);
      });
    }

    if (mediumSimilarity.length > 0) {
      console.log("\nMedium similarity (70-80%):");
      mediumSimilarity.forEach((pair) => {
        console.log(`  ${pair.file1} <-> ${pair.file2}: ${(pair.similarity * 100).toFixed(1)}%`);
      });
    }

    if (lowSimilarity.length > 0) {
      console.log("\nLow similarity (50-70%):");
      lowSimilarity.forEach((pair) => {
        console.log(`  ${pair.file1} <-> ${pair.file2}: ${(pair.similarity * 100).toFixed(1)}%`);
      });
    }
  }

  // 3. Analyze specific patterns
  console.log("\n\n--- Pattern Analysis ---");

  // Find all services
  const serviceFiles = repo
    .getFiles()
    .map((f) => f.id)
    .filter((f) => f.includes("service"));
  console.log(`\nService files (${serviceFiles.length}):`);
  serviceFiles.forEach((f) => console.log(`  - ${f}`));

  // Compare services using different algorithms
  if (serviceFiles.length >= 2) {
    const file1 = serviceFiles[0];
    const file2 = serviceFiles[1];

    console.log(`\n\nComparing ${file1} vs ${file2}:`);

    // MinHash
    const minHashSim = repo.findSimilarByMinHash(file1, 0).find((r) => r.file2 === file2);
    if (minHashSim) {
      console.log(`  MinHash: ${(minHashSim.similarity * 100).toFixed(1)}%`);
    }

    // SimHash
    const simHashSim = repo.findSimilarBySimHash(file1, 0).find((r) => r.file2 === file2);
    if (simHashSim) {
      console.log(`  SimHash: ${(simHashSim.similarity * 100).toFixed(1)}%`);
    }

    // APTED (precise)
    const aptedSim = repo.findSimilarByAPTED(file1, 0, 100).find((r) => r.file2 === file2);
    if (aptedSim) {
      console.log(`  APTED:   ${(aptedSim.similarity * 100).toFixed(1)}%`);
    }
  }

  // 4. Component similarity matrix
  console.log("\n\n--- Component Similarity Matrix ---");
  const componentFiles = repo
    .getFiles()
    .map((f) => f.id)
    .filter((f) => f.includes("component"));

  if (componentFiles.length > 0) {
    console.log("\nComponents:");
    componentFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));

    console.log("\nSimilarity Matrix:");
    console.log("     ", componentFiles.map((_, i) => `  ${i + 1} `).join(""));

    componentFiles.forEach((file1, i) => {
      const row = [`${i + 1}.  `];
      componentFiles.forEach((file2, j) => {
        if (i === j) {
          row.push("  - ");
        } else if (j < i) {
          row.push("    ");
        } else {
          const sim = repo.findSimilarByMinHash(file1, 0).find((r) => r.file2 === file2);
          const score = sim ? (sim.similarity * 100).toFixed(0) : "0";
          row.push(score.padStart(3) + " ");
        }
      });
      console.log(row.join(""));
    });
  }

  // 5. Refactoring opportunities
  console.log("\n\n--- Refactoring Opportunities ---");

  // Find files with similar structure but different names
  const allFiles = repo.getFiles().map((f) => f.id);
  const refactoringCandidates: Array<{ files: string[]; pattern: string }> = [];

  // Group by similar structure
  const processed = new Set<string>();

  for (const file of allFiles) {
    if (processed.has(file)) continue;

    const similar = repo.findSimilarBySimHash(file, 0.7);
    if (similar.length > 0) {
      const group = [file, ...similar.map((s) => s.file2)];
      processed.add(file);
      similar.forEach((s) => processed.add(s.file2));

      // Determine pattern
      const pattern = detectPattern(group);
      if (pattern) {
        refactoringCandidates.push({ files: group, pattern });
      }
    }
  }

  if (refactoringCandidates.length > 0) {
    console.log("\nPotential refactoring targets:");
    refactoringCandidates.forEach(({ files, pattern }) => {
      console.log(`\n${pattern}:`);
      files.forEach((f) => console.log(`  - ${f}`));
    });
  } else {
    console.log("\nNo obvious refactoring opportunities found.");
  }
}

function detectPattern(files: string[]): string | null {
  // Simple pattern detection based on file names
  const hasServices = files.every((f) => f.includes("service"));
  const hasComponents = files.every((f) => f.includes("component"));
  const hasUtils = files.every((f) => f.includes("util"));
  const hasModels = files.every((f) => f.includes("model"));

  if (hasServices) return "Similar service implementations";
  if (hasComponents) return "Similar component structures";
  if (hasUtils) return "Similar utility functions";
  if (hasModels) return "Similar data models";

  return "Similar code structure";
}

// Run the analysis
analyzeProject().catch(console.error);
