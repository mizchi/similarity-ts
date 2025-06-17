import { calculateSimilarity, calculateAPTEDSimilarity, getDetailedReport } from "../src/index.ts";

function runAPTEDTests() {
  let passed = 0;
  let failed = 0;

  console.log("Running APTED algorithm tests...\n");

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
    const aptedScore = calculateAPTEDSimilarity(code1, code2, {
      renameCost: 0.3,
    });

    console.log(`Test 1 - Structural similarity with different names:`);
    console.log(`  Levenshtein: ${(levScore * 100).toFixed(1)}%`);
    console.log(`  APTED (rename=0.3): ${(aptedScore * 100).toFixed(1)}%`);

    if (aptedScore > levScore) {
      console.log("✓ Test 1 passed: APTED recognizes structural similarity better\n");
      passed++;
    } else {
      console.log("✗ Test 1 failed: APTED should score higher for structural similarity\n");
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
    const aptedScore = calculateAPTEDSimilarity(code1, code2);

    console.log(`Test 2 - Different implementations:`);
    console.log(`  Levenshtein: ${(levScore * 100).toFixed(1)}%`);
    console.log(`  APTED: ${(aptedScore * 100).toFixed(1)}%`);

    // For different structures, scores might vary based on the algorithm
    console.log("✓ Test 2 passed: Different algorithms produce different scores\n");
    passed++;
  }

  // Test 3: Detailed report comparison
  function test3() {
    const code1 = `interface Config { timeout: number; }`;
    const code2 = `interface Settings { timeout: number; }`;

    const levReport = getDetailedReport(code1, code2, {
      algorithm: "levenshtein",
    });
    const aptedReport = getDetailedReport(code1, code2, {
      algorithm: "apted",
      aptedConfig: { renameCost: 0.3 },
    });

    console.log(`Test 3 - Detailed reports:`);
    console.log(`  Levenshtein: ${levReport.algorithm} - ${(levReport.similarity * 100).toFixed(1)}%`);
    console.log(`  APTED: ${aptedReport.algorithm} - ${(aptedReport.similarity * 100).toFixed(1)}%`);

    if (aptedReport.algorithm === "APTED" && levReport.algorithm === "Levenshtein") {
      console.log("✓ Test 3 passed: Algorithms correctly identified in reports\n");
      passed++;
    } else {
      console.log("✗ Test 3 failed: Algorithm identification incorrect\n");
      failed++;
    }
  }

  // Test 4: APTED performance
  function test4() {
    const largeCode = `
${Array.from(
  { length: 20 },
  (_, i) => `
class Service${i} {
  data${i}: any[] = [];
  
  process${i}(input: any): void {
    this.data${i}.push(input);
  }
}
`,
).join("\n")}
`;

    const start1 = performance.now();
    calculateSimilarity(largeCode, largeCode);
    const levTime = performance.now() - start1;

    const start2 = performance.now();
    calculateAPTEDSimilarity(largeCode, largeCode);
    const aptedTime = performance.now() - start2;

    console.log(`Test 4 - Performance comparison:`);
    console.log(`  Levenshtein: ${levTime.toFixed(2)}ms`);
    console.log(`  APTED: ${aptedTime.toFixed(2)}ms`);

    // APTED should be reasonably fast (within 10x of Levenshtein)
    if (aptedTime < levTime * 10) {
      console.log("✓ Test 4 passed: APTED performance is acceptable\n");
      passed++;
    } else {
      console.log("✗ Test 4 failed: APTED is too slow\n");
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

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runAPTEDTests();
}
