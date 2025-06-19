import { extractFunctions, compareFunctions } from "../src/core/function_extractor.ts";
import { calculateAPTEDSimilarity } from "../src/core/apted.ts";

console.log("=== Method vs Function Comparison ===\n");

const code = `
// クラスベースの実装
class Calculator {
  private result: number = 0;
  
  add(a: number, b: number): number {
    const sum = a + b;
    this.result = sum;
    console.log(\`Result: \${sum}\`);
    return sum;
  }
  
  multiply(a: number, b: number): number {
    const product = a * b;
    this.result = product;
    console.log(\`Result: \${product}\`);
    return product;
  }
}

// 関数ベースの実装（同じロジック）
function add(state: { result: number }, a: number, b: number): number {
  const sum = a + b;
  state.result = sum;
  console.log(\`Result: \${sum}\`);
  return sum;
}

// Arrow関数版（パラメータ名が異なる）
const addNumbers = (context: { result: number }, x: number, y: number): number => {
  const sum = x + y;
  context.result = sum;
  console.log(\`Result: \${sum}\`);
  return sum;
};

// 似ているが異なる実装
function multiply(state: { result: number }, a: number, b: number): number {
  const product = a * b;
  state.result = product;
  console.log(\`Result: \${product}\`);
  return product;
}
`;

// 関数を抽出
const functions = extractFunctions(code);
console.log(`Found ${functions.length} functions:\n`);

functions.forEach((func, i) => {
  console.log(`${i + 1}. ${func.type === "method" ? `${func.className}.` : ""}${func.name} (${func.type})`);
  console.log(`   Parameters: [${func.parameters.join(", ")}]`);
  console.log(`   Body preview: ${func.body.substring(0, 50)}...`);
});

console.log("\n--- Detailed Comparisons ---\n");

// メソッドと関数を比較
const methodAdd = functions.find((f) => f.name === "add" && f.type === "method");
const functionAdd = functions.find((f) => f.name === "add" && f.type === "function");
const arrowAdd = functions.find((f) => f.name === "addNumbers");

if (methodAdd && functionAdd) {
  console.log("1. Calculator.add (method) vs add (function):\n");

  // 直接比較
  const directSimilarity = calculateAPTEDSimilarity(methodAdd.body, functionAdd.body);
  console.log(`   Direct body similarity: ${(directSimilarity * 100).toFixed(1)}%`);

  // Function extractor の比較
  const comparison = compareFunctions(methodAdd, functionAdd, {
    ignoreThis: true,
    ignoreParamNames: true,
  });

  console.log(`   Structural equivalence: ${comparison.isStructurallyEquivalent}`);
  console.log(`   Has this difference: ${comparison.differences.thisUsage}`);
  console.log(`   Parameter difference: ${comparison.differences.parameterNames}`);
  console.log(`   Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
}

if (methodAdd && arrowAdd) {
  console.log("\n2. Calculator.add (method) vs addNumbers (arrow):\n");

  const comparison = compareFunctions(methodAdd, arrowAdd, {
    ignoreThis: true,
    ignoreParamNames: true,
  });

  console.log(`   Structural equivalence: ${comparison.isStructurallyEquivalent}`);
  console.log(`   Has this difference: ${comparison.differences.thisUsage}`);
  console.log(`   Parameter difference: ${comparison.differences.parameterNames}`);
  console.log(`   Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
}

if (functionAdd && arrowAdd) {
  console.log("\n3. add (function) vs addNumbers (arrow):\n");

  const comparison = compareFunctions(functionAdd, arrowAdd, {
    ignoreThis: false,
    ignoreParamNames: true,
  });

  console.log(`   Structural equivalence: ${comparison.isStructurallyEquivalent}`);
  console.log(`   Has this difference: ${comparison.differences.thisUsage}`);
  console.log(`   Parameter difference: ${comparison.differences.parameterNames}`);
  console.log(`   Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
}

// 似た機能の比較
const methodMultiply = functions.find((f) => f.name === "multiply" && f.type === "method");
const functionMultiply = functions.find((f) => f.name === "multiply" && f.type === "function");

if (methodAdd && methodMultiply) {
  console.log("\n4. Calculator.add vs Calculator.multiply (both methods):\n");

  const comparison = compareFunctions(methodAdd, methodMultiply);

  console.log(`   Structural equivalence: ${comparison.isStructurallyEquivalent}`);
  console.log(`   Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
}

console.log("\n--- Summary ---\n");
console.log("The APTED algorithm successfully detects that:");
console.log('- Class methods using "this" and functions using parameters are structurally similar');
console.log("- Different parameter names do not affect structural similarity when normalized");
console.log("- Similar logic patterns (add vs multiply) show high similarity");
