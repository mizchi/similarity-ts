import { extractTokens, extractFeatures } from '../src/core/tokens.ts';
import {
  createMinHashConfig,
  generateMinHashSignature,
  calculateMinHashSimilarity,
  createSimHashConfig,
  generateSimHash,
  calculateSimHashSimilarity
} from '../src/core/hash.ts';
import {
  createRepository,
  addFile,
  findSimilarByMinHash,
  findSimilarBySimHash
} from '../src/cli/repo_checker.ts';

function testMinHash() {
  console.log('=== Testing MinHash ===\n');
  
  const minHashConfig = createMinHashConfig(128);
  
  // Test 1: Identical sets should have identical signatures
  const tokens1 = new Set(['function', 'add', 'return', 'a', 'b']);
  const tokens2 = new Set(['function', 'add', 'return', 'a', 'b']);
  
  const sig1 = generateMinHashSignature(tokens1, minHashConfig);
  const sig2 = generateMinHashSignature(tokens2, minHashConfig);
  
  const similarity1 = calculateMinHashSimilarity(sig1, sig2);
  console.log(`Identical sets similarity: ${(similarity1 * 100).toFixed(1)}%`);
  console.log(`Expected: 100%, Actual: ${(similarity1 * 100).toFixed(1)}%`);
  console.log(`Test 1: ${similarity1 === 1.0 ? 'PASS' : 'FAIL'}\n`);
  
  // Test 2: Similar sets (with some overlap)
  const tokens3 = new Set(['function', 'add', 'return', 'x', 'y']);  // 'function', 'add', 'return' overlap
  const sig3 = generateMinHashSignature(tokens3, minHashConfig);
  
  const similarity2 = calculateMinHashSimilarity(sig1, sig3);
  console.log(`Similar sets similarity: ${(similarity2 * 100).toFixed(1)}%`);
  // Expected Jaccard similarity is 3/5 = 0.6, but MinHash is an approximation
  console.log(`Test 2: ${similarity2 > 0 ? 'PASS' : 'FAIL'}\n`);
  
  // Test 3: Different sets
  const tokens4 = new Set(['class', 'User', 'constructor', 'name', 'age']);
  const sig4 = generateMinHashSignature(tokens4, minHashConfig);
  
  const similarity3 = calculateMinHashSimilarity(sig1, sig4);
  console.log(`Different sets similarity: ${(similarity3 * 100).toFixed(1)}%`);
  console.log(`Test 3: ${similarity3 < 0.3 ? 'PASS' : 'FAIL'}\n`);
}

function testSimHash() {
  console.log('=== Testing SimHash ===\n');
  
  const simHashConfig = createSimHashConfig(64);
  
  // Test 1: Identical features
  const features1 = new Map([
    ['FunctionDeclaration', 2],
    ['Identifier', 5],
    ['ReturnStatement', 1]
  ]);
  
  const hash1 = generateSimHash(features1, simHashConfig);
  const hash2 = generateSimHash(features1, simHashConfig);
  
  const similarity1 = calculateSimHashSimilarity(hash1, hash2, simHashConfig.bits);
  console.log(`Identical features similarity: ${(similarity1 * 100).toFixed(1)}%`);
  console.log(`Test 1: ${similarity1 === 1.0 ? 'PASS' : 'FAIL'}\n`);
  
  // Test 2: Similar features
  const features2 = new Map([
    ['FunctionDeclaration', 2],
    ['Identifier', 6],
    ['ReturnStatement', 1],
    ['BlockStatement', 1]
  ]);
  
  const hash3 = generateSimHash(features2, simHashConfig);
  const similarity2 = calculateSimHashSimilarity(hash1, hash3, simHashConfig.bits);
  console.log(`Similar features similarity: ${(similarity2 * 100).toFixed(1)}%`);
  console.log(`Test 2: ${similarity2 > 0.7 ? 'PASS' : 'FAIL'}\n`);
}

function testTokenExtraction() {
  console.log('=== Testing Token Extraction ===\n');
  
  const code1 = `function add(a: number, b: number): number {
    return a + b;
  }`;
  
  const tokens = extractTokens(code1);
  console.log(`Extracted ${tokens.size} tokens`);
  console.log(`Sample tokens:`, Array.from(tokens).slice(0, 10));
  console.log(`Test: ${tokens.size > 5 ? 'PASS' : 'FAIL'}\n`);
}

function testFeatureExtraction() {
  console.log('=== Testing Feature Extraction ===\n');
  
  const code1 = `class Calculator {
    add(a: number, b: number): number {
      return a + b;
    }
  }`;
  
  const features = extractFeatures(code1);
  console.log(`Extracted ${features.size} features`);
  console.log('Features:');
  for (const [feature, count] of features) {
    console.log(`  ${feature}: ${count}`);
  }
  console.log(`Test: ${features.size > 3 ? 'PASS' : 'FAIL'}\n`);
}

async function testRepositoryFunctions() {
  console.log('=== Testing Repository Functions ===\n');
  
  let repo = createRepository();
  
  // Add test files
  repo = addFile(repo, 'test1.ts', 'test1.ts', `
    function calculate(x: number, y: number): number {
      return x + y;
    }
  `);
  
  repo = addFile(repo, 'test2.ts', 'test2.ts', `
    function compute(a: number, b: number): number {
      return a + b;
    }
  `);
  
  repo = addFile(repo, 'test3.ts', 'test3.ts', `
    class User {
      name: string;
      age: number;
    }
  `);
  
  // Test MinHash similarity
  console.log('MinHash similarities for test1.ts:');
  const minHashResults = findSimilarByMinHash(repo, 'test1.ts', 0);
  for (const result of minHashResults) {
    console.log(`  ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
  }
  
  // Test SimHash similarity
  console.log('\nSimHash similarities for test1.ts:');
  const simHashResults = findSimilarBySimHash(repo, 'test1.ts', 0);
  for (const result of simHashResults) {
    console.log(`  ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
  }
  
  console.log(`\nTest: ${minHashResults.length > 0 || simHashResults.length > 0 ? 'PASS' : 'FAIL'}`);
}

// Run all tests
testMinHash();
testSimHash();
testTokenExtraction();
testFeatureExtraction();
testRepositoryFunctions().catch(console.error);