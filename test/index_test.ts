import { MinHash, SimHash, extractTokens, extractFeatures } from '../src/code_index.ts';
import { CodeRepository } from '../src/code_repository.ts';

function testMinHash() {
  console.log('=== Testing MinHash ===\n');
  
  const minhash = new MinHash(128);
  
  // Test 1: Identical sets should have identical signatures
  const tokens1 = new Set(['function', 'add', 'return', 'a', 'b']);
  const tokens2 = new Set(['function', 'add', 'return', 'a', 'b']);
  
  const sig1 = minhash.signature(tokens1);
  const sig2 = minhash.signature(tokens2);
  
  const similarity1 = minhash.similarity(sig1, sig2);
  console.log(`Identical sets similarity: ${(similarity1 * 100).toFixed(1)}%`);
  console.log(`Expected: 100%, Actual: ${(similarity1 * 100).toFixed(1)}%`);
  console.log(`Test 1: ${similarity1 === 1.0 ? 'PASS' : 'FAIL'}\n`);
  
  // Test 2: Similar sets
  const tokens3 = new Set(['function', 'sum', 'return', 'x', 'y']);
  const sig3 = minhash.signature(tokens3);
  
  const similarity2 = minhash.similarity(sig1, sig3);
  console.log(`Similar sets similarity: ${(similarity2 * 100).toFixed(1)}%`);
  console.log(`Test 2: ${similarity2 > 0.2 && similarity2 < 0.8 ? 'PASS' : 'FAIL'}\n`);
  
  // Test 3: Different sets
  const tokens4 = new Set(['class', 'User', 'constructor', 'name', 'age']);
  const sig4 = minhash.signature(tokens4);
  
  const similarity3 = minhash.similarity(sig1, sig4);
  console.log(`Different sets similarity: ${(similarity3 * 100).toFixed(1)}%`);
  console.log(`Test 3: ${similarity3 < 0.3 ? 'PASS' : 'FAIL'}\n`);
}

function testSimHash() {
  console.log('=== Testing SimHash ===\n');
  
  const simhash = new SimHash(64);
  
  // Test 1: Identical features
  const features1 = new Map([
    ['FunctionDeclaration', 2],
    ['Identifier', 5],
    ['ReturnStatement', 1]
  ]);
  
  const hash1 = simhash.hash(features1);
  const hash2 = simhash.hash(features1);
  
  const similarity1 = simhash.similarity(hash1, hash2);
  console.log(`Identical features similarity: ${(similarity1 * 100).toFixed(1)}%`);
  console.log(`Test 1: ${similarity1 === 1.0 ? 'PASS' : 'FAIL'}\n`);
  
  // Test 2: Similar features
  const features2 = new Map([
    ['FunctionDeclaration', 2],
    ['Identifier', 6],
    ['ReturnStatement', 1],
    ['BlockStatement', 1]
  ]);
  
  const hash3 = simhash.hash(features2);
  const similarity2 = simhash.similarity(hash1, hash3);
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

async function testCodeRepository() {
  console.log('=== Testing Code Repository ===\n');
  
  const repo = new CodeRepository();
  
  // Add test files
  repo.addFile('test1.ts', 'test1.ts', `
    function calculate(x: number, y: number): number {
      return x + y;
    }
  `);
  
  repo.addFile('test2.ts', 'test2.ts', `
    function compute(a: number, b: number): number {
      return a + b;
    }
  `);
  
  repo.addFile('test3.ts', 'test3.ts', `
    class User {
      name: string;
      age: number;
    }
  `);
  
  // Test MinHash similarity
  console.log('MinHash similarities for test1.ts:');
  const minHashResults = repo.findSimilarByMinHash('test1.ts', 0);
  for (const result of minHashResults) {
    console.log(`  ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
  }
  
  // Test SimHash similarity
  console.log('\nSimHash similarities for test1.ts:');
  const simHashResults = repo.findSimilarBySimHash('test1.ts', 0);
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
testCodeRepository().catch(console.error);