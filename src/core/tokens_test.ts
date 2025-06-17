import { extractTokens } from "./tokens.ts";

function testTokenExtraction() {
  console.log("=== Testing Token Extraction ===\n");

  const code1 = `function add(a: number, b: number): number {
    return a + b;
  }`;

  const tokens = extractTokens(code1);
  console.log(`Extracted ${tokens.size} tokens`);
  console.log(`Sample tokens:`, Array.from(tokens).slice(0, 10));
  console.log(`Test: ${tokens.size > 5 ? "PASS" : "FAIL"}\n`);
}

function testFeatureExtraction() {
  console.log("=== Testing Feature Extraction ===\n");

  const code2 = `
  class Calculator {
    add(a: number, b: number): number {
      return a + b;
    }
  }`;

  const features = extractTokens(code2);
  console.log(`Extracted ${features.size} features`);
  console.log("Features:");

  const sortedFeatures = Array.from(features).sort().slice(0, 10);

  for (const feature of sortedFeatures) {
    console.log(`  ${feature}`);
  }

  console.log(`Test: ${features.size > 3 ? "PASS" : "FAIL"}\n`);
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testTokenExtraction();
  testFeatureExtraction();
}
