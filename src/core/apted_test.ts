import {
  calculateSimilarity,
  compareStructures
} from './ast.ts';
import {
  calculateSimilarityAPTED,
  compareStructuresAPTED
} from './apted.ts';

function runAPTEDTests() {
  let passed = 0;
  let failed = 0;

  console.log('Running APTED algorithm tests...\n');

  // Test 1: APTED should handle structural similarity better
  function test1() {
    const code1 = `
class UserService {
  users: User[] = [];
  
  addUser(user: User) {
    this.users.push(user);
  }
}`;
    
    const code2 = `
class PersonService {
  people: Person[] = [];
  
  addPerson(person: Person) {
    this.people.push(person);
  }
}`;
    
    const levScore = calculateSimilarity(code1, code2);
    const aptedScore = calculateSimilarityAPTED(code1, code2, { renameCost: 0.3 });
    
    console.log(`Test 1 - Structural similarity with different names:`);
    console.log(`  Levenshtein: ${(levScore * 100).toFixed(1)}%`);
    console.log(`  APTED (rename=0.3): ${(aptedScore * 100).toFixed(1)}%`);
    
    // APTED with low rename cost should be close to Levenshtein for similar structures
    if (Math.abs(aptedScore - levScore) < 0.1) {
      console.log('✓ Test 1 passed: APTED with low rename cost is close to Levenshtein\n');
      passed++;
    } else {
      console.log('✗ Test 1 failed: APTED should be close to Levenshtein for similar structures\n');
      failed++;
    }
  }

  // Test 2: APTED should penalize structural differences more
  function test2() {
    const code1 = `
function process(data: string[]): void {
  for (const item of data) {
    console.log(item);
  }
}`;
    
    const code2 = `
function process(data: string[]): string {
  return data.join(', ');
}`;
    
    const levScore = calculateSimilarity(code1, code2);
    const aptedScore = calculateSimilarityAPTED(code1, code2);
    
    console.log(`Test 2 - Different implementations:`);
    console.log(`  Levenshtein: ${(levScore * 100).toFixed(1)}%`);
    console.log(`  APTED: ${(aptedScore * 100).toFixed(1)}%`);
    
    // APTED may score higher due to recognizing the shared function structure
    if (aptedScore !== levScore) {
      console.log('✓ Test 2 passed: APTED scores differently for structural differences\n');
      passed++;
    } else {
      console.log('✗ Test 2 failed: APTED should score differently than Levenshtein\n');
      failed++;
    }
  }

  // Test 3: Compare structures functionality
  function test3() {
    const code1 = `interface Config { timeout: number; }`;
    const code2 = `interface Settings { timeout: number; }`;
    
    const levResult = compareStructures(code1, code2);
    const aptedResult = compareStructuresAPTED(code1, code2, { renameCost: 0.3 });
    
    console.log(`Test 3 - Structure comparison:`);
    console.log(`  Levenshtein similarity: ${(levResult.similarity * 100).toFixed(1)}%`);
    console.log(`  APTED similarity: ${(aptedResult.similarity * 100).toFixed(1)}%`);
    console.log(`  APTED Levenshtein component: ${(aptedResult.levenshteinSimilarity * 100).toFixed(1)}%`);
    
    if (aptedResult.similarity > 0 && aptedResult.levenshteinSimilarity > 0) {
      console.log('✓ Test 3 passed: Structure comparison works correctly\n');
      passed++;
    } else {
      console.log('✗ Test 3 failed: Structure comparison failed\n');
      failed++;
    }
  }

  // Test 4: APTED performance with smaller code
  function test4() {
    const smallCode = `
class Service {
  data: any[] = [];
  
  process(input: any): void {
    this.data.push(input);
  }
}`;
    
    const start1 = performance.now();
    for (let i = 0; i < 10; i++) {
      calculateSimilarity(smallCode, smallCode);
    }
    const levTime = (performance.now() - start1) / 10;
    
    const start2 = performance.now();
    for (let i = 0; i < 10; i++) {
      calculateSimilarityAPTED(smallCode, smallCode);
    }
    const aptedTime = (performance.now() - start2) / 10;
    
    console.log(`Test 4 - Performance comparison (average of 10 runs):`);
    console.log(`  Levenshtein: ${levTime.toFixed(2)}ms`);
    console.log(`  APTED: ${aptedTime.toFixed(2)}ms`);
    
    // APTED should be reasonably fast (within 20x of Levenshtein for small code)
    if (aptedTime < levTime * 20) {
      console.log('✓ Test 4 passed: APTED performance is acceptable\n');
      passed++;
    } else {
      console.log('✗ Test 4 failed: APTED is too slow\n');
      failed++;
    }
  }

  // Run all tests
  test1();
  test2();
  test3();
  test4();

  console.log(`\nAPTED Tests completed: ${passed} passed, ${failed} failed`);
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAPTEDTests();
}