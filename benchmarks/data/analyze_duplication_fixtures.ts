// Example script to analyze duplication patterns in fixtures
import { readFileSync } from "fs";
import { join } from "path";
import { calculateSimilarity, calculateAPTEDSimilarity } from "../src/index.ts";
import { extractFunctions, findDuplicateFunctions, compareFunctions } from "../src/core/function_extractor.ts";

const FIXTURES_DIR = join(import.meta.dirname, "..", "test", "__fixtures__", "duplication");

// Analyze exact duplication
console.log("=== Analyzing Exact Duplication Patterns ===\n");

const serviceCode1 = readFileSync(join(FIXTURES_DIR, "exact", "service_duplication_1.ts"), "utf-8");
const serviceCode2 = readFileSync(join(FIXTURES_DIR, "exact", "service_duplication_2.ts"), "utf-8");

console.log("Service Class Duplication:");
console.log("- These are nearly identical service classes");
console.log("- Only entity names are different (User vs Customer)");
console.log("- This is classic copy-paste duplication\n");

const serviceSimilarity = calculateAPTEDSimilarity(serviceCode1, serviceCode2, {
  renameCost: 0.1,
});
console.log(`APTED Similarity: ${(serviceSimilarity * 100).toFixed(1)}%`);

// Extract and compare methods
const service1Functions = extractFunctions(serviceCode1);
const service2Functions = extractFunctions(serviceCode2);

console.log(`\nMethods in Service 1: ${service1Functions.map((f) => f.name).join(", ")}`);
console.log(`Methods in Service 2: ${service2Functions.map((f) => f.name).join(", ")}`);

// Analyze structural duplication
console.log("\n\n=== Analyzing Structural Duplication Patterns ===\n");

const errorHandlingCode = readFileSync(join(FIXTURES_DIR, "structural", "error_handling_pattern_1.ts"), "utf-8");
const errorFunctions = extractFunctions(errorHandlingCode);

console.log("Error Handling Pattern Analysis:");
console.log(`Found ${errorFunctions.length} functions with similar error handling structure\n`);

// Find duplicates within the file
const errorDuplicates = findDuplicateFunctions(errorFunctions, {
  similarityThreshold: 0.85,
  ignoreParamNames: true,
});

console.log(`Duplicate pairs found: ${errorDuplicates.length}`);
errorDuplicates.slice(0, 3).forEach(([func1, func2, result]) => {
  console.log(`- ${func1.name} <-> ${func2.name}: ${(result.similarity * 100).toFixed(1)}% similar`);
});

// Analyze semantic duplication
console.log("\n\n=== Analyzing Semantic Duplication Patterns ===\n");

const validationCode1 = readFileSync(join(FIXTURES_DIR, "semantic", "validation_pattern_1.ts"), "utf-8");
const validationCode2 = readFileSync(join(FIXTURES_DIR, "semantic", "validation_pattern_2.ts"), "utf-8");

console.log("Validation Pattern Analysis:");
console.log("- Pattern 1: Class-based with early returns");
console.log("- Pattern 2: Functional with validation rules array");
console.log("- Both implement the same validation logic\n");

const validationFunctions1 = extractFunctions(validationCode1);
const validationFunctions2 = extractFunctions(validationCode2);

console.log(`Methods in Pattern 1: ${validationFunctions1.filter((f) => f.type === "method").length}`);
console.log(
  `Functions in Pattern 2: ${validationFunctions2.filter((f) => f.type === "function" || f.type === "arrow").length}`,
);

// Analyze refactoring patterns
console.log("\n\n=== Analyzing Class-to-Function Refactoring Patterns ===\n");

const repoClassCode = readFileSync(
  join(FIXTURES_DIR, "..", "refactoring", "class_to_function", "repository_class.ts"),
  "utf-8",
);
const repoFunctionsCode = readFileSync(
  join(FIXTURES_DIR, "..", "refactoring", "class_to_function", "repository_functions.ts"),
  "utf-8",
);

const repoClassMethods = extractFunctions(repoClassCode);
const repoFunctions = extractFunctions(repoFunctionsCode);

console.log("Repository Pattern Refactoring:");
console.log(`- Class has ${repoClassMethods.length} methods`);
console.log(`- Functional version has ${repoFunctions.length} functions`);
console.log("- Shows how stateful classes can be refactored to functions with explicit state\n");

// Match methods to functions
const methodToFunctionMap = new Map<string, string>();

for (const method of repoClassMethods) {
  for (const func of repoFunctions) {
    const comparison = compareFunctions(method, func, {
      ignoreThis: true,
      ignoreParamNames: true,
    });

    if (comparison.similarity > 0.7) {
      methodToFunctionMap.set(method.name, func.name);
      break;
    }
  }
}

console.log("Method to Function Mapping:");
for (const [method, func] of methodToFunctionMap) {
  console.log(`- ${method}() -> ${func}()`);
}

// Summary and recommendations
console.log("\n\n=== Summary and Recommendations ===\n");

console.log("1. Exact Duplication Detection:");
console.log("   - Use low rename cost (0.1-0.3) for APTED to catch renamed identifiers");
console.log("   - Look for similarity > 90% for copy-paste detection\n");

console.log("2. Structural Duplication Detection:");
console.log("   - Extract functions and compare at function level");
console.log("   - Use ignoreParamNames option for better matching");
console.log("   - Similarity threshold of 70-85% works well\n");

console.log("3. Semantic Duplication Detection:");
console.log("   - Requires semantic normalization (this vs params)");
console.log("   - May need custom comparison logic for different paradigms");
console.log("   - Lower similarity thresholds (50-70%) may be needed\n");

console.log("4. Refactoring Detection:");
console.log("   - Use ignoreThis option when comparing methods to functions");
console.log("   - Consider parameter position changes (state/context params)");
console.log("   - Function body comparison often more reliable than full AST");
