import { extractFunctions, findDuplicateFunctions, compareFunctions } from "../src/core/function_extractor.ts";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

console.log("=== Analyzing similarity-ts source code for refactoring opportunities ===\n");

// Collect all TypeScript files from src directory
function collectTsFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && !entry.startsWith(".")) {
        walk(fullPath);
      } else if (entry.endsWith(".ts") && !entry.endsWith("_test.ts")) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Analyze files
const srcDir = "./src";
const files = collectTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files to analyze\n`);

const allFunctions: Array<{
  function: ReturnType<typeof extractFunctions>[0];
  file: string;
}> = [];

// Extract functions from each file
for (const file of files) {
  try {
    const content = readFileSync(file, "utf-8");
    const functions = extractFunctions(content);

    if (functions.length > 0) {
      console.log(`${file}: ${functions.length} functions`);
      functions.forEach((func) => {
        allFunctions.push({ function: func, file });
      });
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
}

console.log(`\nTotal functions extracted: ${allFunctions.length}`);

// Find duplicates across all files
console.log("\n=== Looking for duplicate functions across files ===\n");

const duplicatesAcrossFiles: Array<{
  func1: { function: ReturnType<typeof extractFunctions>[0]; file: string };
  func2: { function: ReturnType<typeof extractFunctions>[0]; file: string };
  similarity: number;
}> = [];

// Compare functions from different files
for (let i = 0; i < allFunctions.length; i++) {
  for (let j = i + 1; j < allFunctions.length; j++) {
    const item1 = allFunctions[i];
    const item2 = allFunctions[j];

    // Skip if from same file
    if (item1.file === item2.file) continue;

    // Skip constructors
    if (item1.function.type === "constructor" || item2.function.type === "constructor") continue;

    const comparison = compareFunctions(item1.function, item2.function, {
      ignoreThis: true,
      ignoreParamNames: true,
    });

    if (comparison.similarity > 0.8) {
      duplicatesAcrossFiles.push({
        func1: item1,
        func2: item2,
        similarity: comparison.similarity,
      });
    }
  }
}

// Sort by similarity
duplicatesAcrossFiles.sort((a, b) => b.similarity - a.similarity);

if (duplicatesAcrossFiles.length > 0) {
  console.log(`Found ${duplicatesAcrossFiles.length} potential duplicates:\n`);

  duplicatesAcrossFiles.slice(0, 10).forEach(({ func1, func2, similarity }) => {
    console.log(`${(similarity * 100).toFixed(1)}% similarity:`);
    console.log(`  ${func1.file}:`);
    console.log(`    ${func1.function.name} (${func1.function.type})`);
    console.log(`  ${func2.file}:`);
    console.log(`    ${func2.function.name} (${func2.function.type})`);
    console.log();
  });
}

// Analyze specific patterns
console.log("\n=== Analyzing common patterns ===\n");

// Group functions by name
const functionsByName = new Map<string, Array<{ function: ReturnType<typeof extractFunctions>[0]; file: string }>>();

allFunctions.forEach((item) => {
  const name = item.function.name;
  if (!functionsByName.has(name)) {
    functionsByName.set(name, []);
  }
  functionsByName.get(name)!.push(item);
});

// Find functions with same name in different files
console.log("Functions with same name in different files:");
let sameNameCount = 0;

functionsByName.forEach((items, name) => {
  const uniqueFiles = new Set(items.map((item) => item.file));
  if (uniqueFiles.size > 1) {
    sameNameCount++;
    console.log(`\n  ${name}: found in ${uniqueFiles.size} files`);
    items.forEach((item) => {
      console.log(`    - ${item.file} (${item.function.type})`);
    });
  }
});

if (sameNameCount === 0) {
  console.log("  None found");
}

// Look for potential refactoring opportunities
console.log("\n\n=== Refactoring Opportunities ===\n");

// Find very similar functions that could be unified
const highSimilarityPairs = duplicatesAcrossFiles.filter((d) => d.similarity > 0.9);

if (highSimilarityPairs.length > 0) {
  console.log("1. Functions with >90% similarity that could be unified:\n");

  highSimilarityPairs.slice(0, 5).forEach(({ func1, func2, similarity }) => {
    console.log(`   ${func1.function.name} and ${func2.function.name}`);
    console.log(`   Similarity: ${(similarity * 100).toFixed(1)}%`);
    console.log(`   Consider extracting to a shared utility`);
    console.log();
  });
}

// Check for helper functions that could be extracted
console.log("2. Common helper patterns:\n");

const helperPatterns = ["normalize", "validate", "extract", "map", "filter", "convert"];
const helperFunctions = allFunctions.filter((item) =>
  helperPatterns.some((pattern) => item.function.name.toLowerCase().includes(pattern)),
);

if (helperFunctions.length > 0) {
  console.log(`   Found ${helperFunctions.length} helper-like functions`);

  // Group by pattern
  helperPatterns.forEach((pattern) => {
    const matching = helperFunctions.filter((item) => item.function.name.toLowerCase().includes(pattern));
    if (matching.length > 1) {
      console.log(`\n   ${pattern} functions (${matching.length}):`);
      matching.slice(0, 3).forEach((item) => {
        console.log(`     - ${item.function.name} in ${item.file}`);
      });
    }
  });
}

console.log("\n\n=== Summary ===");
console.log(`- Analyzed ${files.length} files`);
console.log(`- Found ${allFunctions.length} functions`);
console.log(`- Detected ${duplicatesAcrossFiles.length} potential duplicates`);
console.log(`- ${highSimilarityPairs.length} functions with >90% similarity`);
console.log(`- ${sameNameCount} function names appear in multiple files`);
