import { extractFunctions, compareFunctions, findDuplicateFunctions } from "../src/core/function_extractor.ts";

function runFunctionExtractorTests() {
  let passed = 0;
  let failed = 0;

  console.log("Running Function Extractor Tests...\n");

  // Test 1: Extract functions from mixed code
  function test1() {
    const code = `
// Standalone function
function calculateSum(a: number, b: number): number {
  return a + b;
}

// Arrow function
const multiply = (x: number, y: number): number => {
  return x * y;
};

// Class with methods
class Calculator {
  private result: number = 0;
  
  add(a: number, b: number): number {
    this.result = a + b;
    return this.result;
  }
  
  subtract(a: number, b: number): number {
    this.result = a - b;
    return this.result;
  }
}

// Function expression
const divide = function(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
};
`;

    const functions = extractFunctions(code);

    console.log("Test 1 - Function extraction:");
    console.log(`  Found ${functions.length} functions`);

    const expectedFunctions = ["calculateSum", "multiply", "add", "subtract", "divide"];
    const foundNames = functions.map((f) => f.name);

    const allFound = expectedFunctions.every((name) => foundNames.includes(name));

    if (allFound && functions.length === 5) {
      console.log("✓ Test 1 passed: All functions extracted correctly\n");
      passed++;
    } else {
      console.log("✗ Test 1 failed: Not all functions were extracted");
      console.log("  Expected:", expectedFunctions);
      console.log("  Found:", foundNames);
      console.log();
      failed++;
    }
  }

  // Test 2: Compare equivalent functions (class method vs standalone)
  function test2() {
    const code = `
// Class method using this
class UserService {
  private users: Map<string, User> = new Map();
  
  addUser(user: User): void {
    this.users.set(user.id, user);
  }
}

// Standalone function with same logic
function addUserToMap(users: Map<string, User>, user: User): void {
  users.set(user.id, user);
}

// Another equivalent implementation
const addUserFunc = (users: Map<string, User>, user: User): void => {
  users.set(user.id, user);
};
`;

    const functions = extractFunctions(code);
    const methodFunc = functions.find((f) => f.name === "addUser")!;
    const standaloneFunc = functions.find((f) => f.name === "addUserToMap")!;
    const arrowFunc = functions.find((f) => f.name === "addUserFunc")!;

    console.log("Test 2 - Function comparison (this vs parameter):");

    // Compare without ignoring this
    const comparison1 = compareFunctions(methodFunc, standaloneFunc);
    console.log(`  Method vs Standalone (strict): ${(comparison1.similarity * 100).toFixed(1)}%`);
    console.log(`  This usage differs: ${comparison1.differences.thisUsage}`);

    // Compare ignoring this
    const comparison2 = compareFunctions(methodFunc, standaloneFunc, {
      ignoreThis: true,
    });
    console.log(`  Method vs Standalone (ignoring this): ${(comparison2.similarity * 100).toFixed(1)}%`);

    // Compare two standalone functions
    const comparison3 = compareFunctions(standaloneFunc, arrowFunc);
    console.log(`  Standalone vs Arrow: ${(comparison3.similarity * 100).toFixed(1)}%`);

    if (comparison1.differences.thisUsage && comparison2.similarity > comparison1.similarity) {
      console.log("✓ Test 2 passed: This usage correctly detected and handled\n");
      passed++;
    } else {
      console.log("✗ Test 2 failed: This usage not properly detected\n");
      failed++;
    }
  }

  // Test 3: Find duplicate implementations
  function test3() {
    const code = `
class DataProcessor {
  processData(items: string[]): string[] {
    const result = [];
    for (const item of items) {
      if (item.length > 0) {
        result.push(item.toUpperCase());
      }
    }
    return result;
  }
}

function processStringArray(items: string[]): string[] {
  const result = [];
  for (const item of items) {
    if (item.length > 0) {
      result.push(item.toUpperCase());
    }
  }
  return result;
}

// Slightly different parameter names
const processItems = (data: string[]): string[] => {
  const result = [];
  for (const item of data) {
    if (item.length > 0) {
      result.push(item.toUpperCase());
    }
  }
  return result;
};

// Different implementation
function filterAndUpper(items: string[]): string[] {
  return items
    .filter(item => item.length > 0)
    .map(item => item.toUpperCase());
}
`;

    const functions = extractFunctions(code);
    const duplicates = findDuplicateFunctions(functions, {
      ignoreThis: true,
      ignoreParamNames: true,
      similarityThreshold: 0.8,
    });

    console.log("Test 3 - Duplicate detection:");
    console.log(`  Found ${duplicates.length} duplicate pairs`);

    duplicates.forEach(([func1, func2, comparison]) => {
      console.log(`  ${func1.name} <-> ${func2.name}: ${(comparison.similarity * 100).toFixed(1)}%`);
    });

    // Should find at least 2 duplicates (processData/processStringArray/processItems are similar)
    if (duplicates.length >= 2) {
      console.log("✓ Test 3 passed: Duplicates detected correctly\n");
      passed++;
    } else {
      console.log("✗ Test 3 failed: Not enough duplicates detected\n");
      failed++;
    }
  }

  // Test 4: Constructor and initialization patterns
  function test4() {
    const code = `
class UserManager {
  private users: User[];
  
  constructor(initialUsers: User[]) {
    this.users = initialUsers || [];
  }
  
  initialize(users: User[]): void {
    this.users = users || [];
  }
}

function createUserManager(initialUsers: User[]): { users: User[] } {
  return {
    users: initialUsers || []
  };
}

const initializeUserManager = (manager: { users: User[] }, users: User[]): void => {
  manager.users = users || [];
};
`;

    const functions = extractFunctions(code);
    const constructor = functions.find((f) => f.name === "constructor")!;
    const initMethod = functions.find((f) => f.name === "initialize")!;
    // const factoryFunc = functions.find((f) => f.name === "createUserManager")!;

    console.log("Test 4 - Constructor patterns:");
    console.log(`  Found constructor: ${constructor.type === "constructor"}`);
    console.log(
      `  Constructor vs initialize method: ${(compareFunctions(constructor, initMethod, { ignoreThis: true }).similarity * 100).toFixed(1)}%`,
    );

    if (constructor && constructor.type === "constructor") {
      console.log("✓ Test 4 passed: Constructor correctly identified\n");
      passed++;
    } else {
      console.log("✗ Test 4 failed: Constructor not properly identified\n");
      failed++;
    }
  }

  // Test 5: Complex duplication with different contexts
  function test5() {
    const code = `
// Repository pattern in class
class ProductRepository {
  private products: Map<string, Product> = new Map();
  
  findById(id: string): Product | undefined {
    return this.products.get(id);
  }
  
  save(product: Product): void {
    this.products.set(product.id, product);
  }
  
  delete(id: string): boolean {
    return this.products.delete(id);
  }
}

// Same pattern as standalone functions
const productStore = new Map<string, Product>();

function findProductById(id: string): Product | undefined {
  return productStore.get(id);
}

function saveProduct(product: Product): void {
  productStore.set(product.id, product);
}

function deleteProduct(id: string): boolean {
  return productStore.delete(id);
}

// Generic repository functions
function findInMap<T extends { id: string }>(map: Map<string, T>, id: string): T | undefined {
  return map.get(id);
}

function saveToMap<T extends { id: string }>(map: Map<string, T>, item: T): void {
  map.set(item.id, item);
}

function deleteFromMap<T>(map: Map<string, T>, id: string): boolean {
  return map.delete(id);
}
`;

    const functions = extractFunctions(code);
    const classMethods = functions.filter((f) => f.className === "ProductRepository");
    const standaloneFuncs = functions.filter((f) => f.name.includes("Product") && !f.className);
    const genericFuncs = functions.filter((f) => f.name.includes("Map"));

    console.log("Test 5 - Complex duplication patterns:");
    console.log(`  Class methods: ${classMethods.length}`);
    console.log(`  Standalone functions: ${standaloneFuncs.length}`);
    console.log(`  Generic functions: ${genericFuncs.length}`);

    // Find all duplicates
    const allDuplicates = findDuplicateFunctions(functions, {
      ignoreThis: true,
      similarityThreshold: 0.7,
    });

    console.log(`  Total duplicate pairs found: ${allDuplicates.length}`);

    // Group by similarity level
    const highSimilarity = allDuplicates.filter(([, , comp]) => comp.similarity >= 0.9);
    const mediumSimilarity = allDuplicates.filter(([, , comp]) => comp.similarity >= 0.8 && comp.similarity < 0.9);

    console.log(`  High similarity (>90%): ${highSimilarity.length} pairs`);
    console.log(`  Medium similarity (80-90%): ${mediumSimilarity.length} pairs`);

    if (allDuplicates.length >= 3) {
      console.log("✓ Test 5 passed: Complex duplication patterns detected\n");
      passed++;
    } else {
      console.log("✗ Test 5 failed: Not enough duplicates found in complex pattern\n");
      failed++;
    }
  }

  // Run all tests
  test1();
  test2();
  test3();
  test4();
  test5();

  console.log(`\nFunction Extractor Tests completed: ${passed} passed, ${failed} failed`);
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runFunctionExtractorTests();
}
