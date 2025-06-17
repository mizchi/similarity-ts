import { levenshtein } from './levenshtein.ts';

function runLevenshteinTests() {
  let passed = 0;
  let failed = 0;

  console.log('Running Levenshtein distance tests...\n');

  // Test 1: Identical strings
  function test1() {
    const distance = levenshtein('hello', 'hello');
    const expected = 0;
    
    if (distance === expected) {
      console.log('✓ Test 1 passed: Identical strings have distance 0');
      passed++;
    } else {
      console.log(`✗ Test 1 failed: Expected ${expected}, got ${distance}`);
      failed++;
    }
  }

  // Test 2: Empty strings
  function test2() {
    const d1 = levenshtein('', '');
    const d2 = levenshtein('hello', '');
    const d3 = levenshtein('', 'world');
    
    if (d1 === 0 && d2 === 5 && d3 === 5) {
      console.log('✓ Test 2 passed: Empty string handling correct');
      passed++;
    } else {
      console.log(`✗ Test 2 failed: Expected 0, 5, 5, got ${d1}, ${d2}, ${d3}`);
      failed++;
    }
  }

  // Test 3: Single character operations
  function test3() {
    const d1 = levenshtein('cat', 'cats'); // insertion
    const d2 = levenshtein('cats', 'cat'); // deletion
    const d3 = levenshtein('cat', 'bat'); // substitution
    
    if (d1 === 1 && d2 === 1 && d3 === 1) {
      console.log('✓ Test 3 passed: Single operations have distance 1');
      passed++;
    } else {
      console.log(`✗ Test 3 failed: Expected 1, 1, 1, got ${d1}, ${d2}, ${d3}`);
      failed++;
    }
  }

  // Test 4: Complex transformations
  function test4() {
    const d1 = levenshtein('saturday', 'sunday'); // Expected: 3
    const d2 = levenshtein('sitting', 'kitten'); // Expected: 3
    
    if (d1 === 3 && d2 === 3) {
      console.log('✓ Test 4 passed: Complex transformations calculated correctly');
      passed++;
    } else {
      console.log(`✗ Test 4 failed: Expected 3, 3, got ${d1}, ${d2}`);
      failed++;
    }
  }

  // Test 5: Case sensitivity
  function test5() {
    const distance = levenshtein('Hello', 'hello');
    const expected = 1;
    
    if (distance === expected) {
      console.log('✓ Test 5 passed: Case sensitive comparison works');
      passed++;
    } else {
      console.log(`✗ Test 5 failed: Expected ${expected}, got ${distance}`);
      failed++;
    }
  }

  // Test 6: Unicode characters
  function test6() {
    const d1 = levenshtein('café', 'cafe');
    const d2 = levenshtein('東京', '京都');
    
    if (d1 === 1 && d2 === 2) {
      console.log('✓ Test 6 passed: Unicode characters handled correctly');
      passed++;
    } else {
      console.log(`✗ Test 6 failed: Expected 1, 2, got ${d1}, ${d2}`);
      failed++;
    }
  }

  // Run all tests
  test1();
  test2();
  test3();
  test4();
  test5();
  test6();

  console.log(`\nLevenshtein Tests completed: ${passed} passed, ${failed} failed`);
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runLevenshteinTests();
}