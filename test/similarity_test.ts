import { calculateSimilarity } from '../src/index.ts';

function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('Running oxc-parser similarity tests...\n');

  // Test 1: Identical code should have similarity = 1.0
  function test1() {
    const code = `function test() { return 42; }`;
    const score = calculateSimilarity(code, code);
    const expected = 1.0;
    
    if (Math.abs(score - expected) < 0.001) {
      console.log('✓ Test 1 passed: Identical code has similarity 1.0');
      passed++;
    } else {
      console.log(`✗ Test 1 failed: Expected ${expected}, got ${score}`);
      failed++;
    }
  }

  // Test 2: Completely different code should have low similarity
  function test2() {
    const code1 = `function add(a: number, b: number) { return a + b; }`;
    const code2 = `class User { name: string; }`;
    const score = calculateSimilarity(code1, code2);
    
    if (score < 0.7) {
      console.log(`✓ Test 2 passed: Different code has low similarity (${score.toFixed(4)})`);
      passed++;
    } else {
      console.log(`✗ Test 2 failed: Expected < 0.7, got ${score}`);
      failed++;
    }
  }

  // Test 3: Similar structure with different names should have high similarity
  function test3() {
    const code1 = `
function calculate(x: number, y: number): number {
  const result = x + y;
  return result;
}`;
    
    const code2 = `
function compute(a: number, b: number): number {
  const sum = a + b;
  return sum;
}`;
    
    const score = calculateSimilarity(code1, code2);
    
    if (score > 0.7) {
      console.log(`✓ Test 3 passed: Similar structure has high similarity (${score.toFixed(4)})`);
      passed++;
    } else {
      console.log(`✗ Test 3 failed: Expected > 0.7, got ${score}`);
      failed++;
    }
  }

  // Test 4: TypeScript specific features
  function test4() {
    const code1 = `
interface User {
  id: number;
  name: string;
}`;
    
    const code2 = `
interface Person {
  id: number;
  name: string;
}`;
    
    const score = calculateSimilarity(code1, code2);
    
    if (score > 0.8) {
      console.log(`✓ Test 4 passed: Similar interfaces have high similarity (${score.toFixed(4)})`);
      passed++;
    } else {
      console.log(`✗ Test 4 failed: Expected > 0.8, got ${score}`);
      failed++;
    }
  }

  // Test 5: Error handling
  function test5() {
    try {
      // Invalid TypeScript code
      const code1 = `function broken( { return`;
      const code2 = `function test() { return 1; }`;
      const score = calculateSimilarity(code1, code2);
      
      // Should still return a score even with parse errors
      if (typeof score === 'number' && score >= 0 && score <= 1) {
        console.log(`✓ Test 5 passed: Handles parse errors gracefully (${score.toFixed(4)})`);
        passed++;
      } else {
        console.log(`✗ Test 5 failed: Invalid score ${score}`);
        failed++;
      }
    } catch (error) {
      console.log(`✗ Test 5 failed: Threw error: ${error}`);
      failed++;
    }
  }

  // Run all tests
  test1();
  test2();
  test3();
  test4();
  test5();

  console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
}

runTests();