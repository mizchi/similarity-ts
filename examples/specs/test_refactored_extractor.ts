import { extractFunctions as extractFunctionsOld } from "../src/core/function_extractor.ts";
import { extractFunctions as extractFunctionsNew } from "../src/core/function_extractor_refactored.ts";

console.log("=== Testing Refactored Function Extractor ===\n");

const testCode = `
class Calculator {
  private value: number = 0;
  
  add(n: number): number {
    this.value += n;
    return this.value;
  }
  
  constructor(initial: number) {
    this.value = initial;
  }
}

function multiply(a: number, b: number): number {
  return a * b;
}

const divide = (a: number, b: number): number => {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
};

const subtract = function(a: number, b: number): number {
  return a - b;
};
`;

console.log("Extracting functions with OLD implementation:");
const oldResults = extractFunctionsOld(testCode);
console.log(`Found ${oldResults.length} functions\n`);

oldResults.forEach((func) => {
  console.log(`- ${func.name} (${func.type})`);
  if (func.className) console.log(`  Class: ${func.className}`);
  console.log(`  Parameters: [${func.parameters.join(", ")}]`);
  console.log(`  Body length: ${func.body.length}`);
});

console.log("\n" + "=".repeat(50) + "\n");

console.log("Extracting functions with NEW implementation:");
const newResults = extractFunctionsNew(testCode);
console.log(`Found ${newResults.length} functions\n`);

newResults.forEach((func) => {
  console.log(`- ${func.name} (${func.type})`);
  if (func.className) console.log(`  Class: ${func.className}`);
  console.log(`  Parameters: [${func.parameters.join(", ")}]`);
  console.log(`  Body length: ${func.body.length}`);
});

console.log("\n" + "=".repeat(50) + "\n");

// Compare results
console.log("Comparison:");
console.log(`Same number of functions: ${oldResults.length === newResults.length}`);

// Check each function
const allMatch = oldResults.every((oldFunc, i) => {
  const newFunc = newResults.find((f) => f.name === oldFunc.name && f.type === oldFunc.type);
  if (!newFunc) {
    console.log(`❌ Missing: ${oldFunc.name} (${oldFunc.type})`);
    return false;
  }

  const paramsMatch = JSON.stringify(oldFunc.parameters) === JSON.stringify(newFunc.parameters);
  const bodyMatch = oldFunc.body === newFunc.body;

  if (!paramsMatch || !bodyMatch) {
    console.log(`❌ Mismatch: ${oldFunc.name}`);
    if (!paramsMatch) console.log(`   Parameters: ${oldFunc.parameters} vs ${newFunc.parameters}`);
    if (!bodyMatch) console.log(`   Body length: ${oldFunc.body.length} vs ${newFunc.body.length}`);
    return false;
  }

  return true;
});

console.log(`\nAll functions match: ${allMatch ? "✅" : "❌"}`);
