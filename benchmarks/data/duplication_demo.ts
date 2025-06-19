// Demonstration of duplication detection capabilities
import {
  extractFunctions,
  compareFunctions,
  findDuplicateFunctions,
  calculateTSED,
  REFACTORING_TSED_OPTIONS,
  buildRepoAnalyzer,
} from "../src/index.ts";
import { parseTypeScript } from "../src/parser.ts";
import { readFileSync } from "fs";
import { join } from "path";

console.log("=== TypeScript Code Duplication Detection Demo ===\n");

// Example 1: Exact Duplication Detection
console.log("1. Exact Duplication Detection");
console.log("─".repeat(50));

const userServiceCode = `
class UserService {
  private users: Map<string, User> = new Map();
  
  addUser(user: User): void {
    if (!user.id) {
      throw new Error('User must have an ID');
    }
    this.users.set(user.id, user);
  }
  
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }
}`;

const customerServiceCode = `
class CustomerService {
  private customers: Map<string, Customer> = new Map();
  
  addCustomer(customer: Customer): void {
    if (!customer.id) {
      throw new Error('Customer must have an ID');
    }
    this.customers.set(customer.id, customer);
  }
  
  getCustomer(id: string): Customer | undefined {
    return this.customers.get(id);
  }
}`;

const ast1 = parseTypeScript("user.ts", userServiceCode);
const ast2 = parseTypeScript("customer.ts", customerServiceCode);
const tsed = calculateTSED(ast1, ast2);

console.log(`UserService vs CustomerService TSED: ${(tsed * 100).toFixed(1)}%`);
console.log("→ Nearly identical structure with only name changes\n");

// Example 2: Refactoring Detection
console.log("2. Class to Function Refactoring Detection");
console.log("─".repeat(50));

const classCode = `
class Calculator {
  private value: number = 0;
  
  add(n: number): number {
    this.value += n;
    return this.value;
  }
  
  subtract(n: number): number {
    this.value -= n;
    return this.value;
  }
}`;

const functionCode = `
interface State {
  value: number;
}

function add(state: State, n: number): number {
  state.value += n;
  return state.value;
}

function subtract(state: State, n: number): number {
  state.value -= n;
  return state.value;
}`;

const classAst = parseTypeScript("class.ts", classCode);
const funcAst = parseTypeScript("func.ts", functionCode);
const refactoringTsed = calculateTSED(classAst, funcAst, REFACTORING_TSED_OPTIONS);

console.log(`Calculator class vs functions TSED: ${(refactoringTsed * 100).toFixed(1)}%`);
console.log("→ Detects class-to-function refactoring pattern\n");

// Example 3: Copy-Paste Pattern Detection
console.log("3. Copy-Paste Pattern Detection");
console.log("─".repeat(50));

const copyPasteCode = `
function findMaxValue(numbers: number[]): number {
  let max = numbers[0];
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] > max) {
      max = numbers[i];
    }
  }
  return max;
}

function findMinValue(numbers: number[]): number {
  let min = numbers[0];
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] < min) {
      min = numbers[i];
    }
  }
  return min;
}

function calculateSum(numbers: number[]): number {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum;
}`;

const functions = extractFunctions(copyPasteCode);
const duplicatePairs = findDuplicateFunctions(functions, {
  similarityThreshold: 0.7,
});

// Group duplicates by similarity
const groups = new Map<string, { functions: typeof functions; similarities: number[] }>();

for (const [func1, func2, result] of duplicatePairs) {
  // Create a group key based on function names
  const key = [func1.name, func2.name].sort().join("-");

  if (!groups.has(key)) {
    groups.set(key, {
      functions: [func1, func2],
      similarities: [result.similarity],
    });
  }
}

console.log(`Found ${duplicatePairs.length} duplicate pairs (${groups.size} groups):`);
if (groups.size > 0) {
  let groupNum = 1;
  for (const [key, group] of groups) {
    const avgSim = group.similarities.reduce((a, b) => a + b, 0) / group.similarities.length;
    console.log(`\nGroup ${groupNum++}:`);
    for (const func of group.functions) {
      console.log(`  - ${func.name}`);
    }
    console.log(`  Similarity: ${(avgSim * 100).toFixed(1)}%`);
  }
} else {
  console.log("No duplicate groups found with threshold 0.7");
}

// Example 4: Semantic Duplication Detection
console.log("\n\n4. Semantic Duplication Detection");
console.log("─".repeat(50));

const imperativeCode = `
function processUsers(users: User[]): ProcessedUser[] {
  const result: ProcessedUser[] = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].isActive) {
      result.push({
        id: users[i].id,
        name: users[i].firstName + ' ' + users[i].lastName
      });
    }
  }
  return result;
}`;

const functionalCode = `
function processUsers(users: User[]): ProcessedUser[] {
  return users
    .filter(user => user.isActive)
    .map(user => ({
      id: user.id,
      name: \`\${user.firstName} \${user.lastName}\`
    }));
}`;

const impAst = parseTypeScript("imperative.ts", imperativeCode);
const funcAstSem = parseTypeScript("functional.ts", functionalCode);
const semanticTsed = calculateTSED(impAst, funcAstSem);

console.log(`Imperative vs Functional TSED: ${(semanticTsed * 100).toFixed(1)}%`);
console.log("→ Different style but same logic\n");

// Example 5: Real-world Duplication Analysis
console.log("5. Real-world Duplication Analysis");
console.log("─".repeat(50));

async function analyzeRealProject() {
  const repo = buildRepoAnalyzer();

  // Load duplication fixtures
  await repo.loadFiles("test/__fixtures__/duplication/**/*.ts");

  const stats = repo.getStatistics();
  console.log(`\nAnalyzed ${stats.totalFiles} files`);

  // Find highly similar pairs
  const highSimilarity = repo.findAllSimilarPairs(0.85, "minhash");
  console.log(`\nHighly similar pairs (>85%):`);

  for (const pair of highSimilarity.slice(0, 10)) {
    const file1 = pair.file1.split("/").pop();
    const file2 = pair.file2.split("/").pop();
    console.log(`  ${file1} ↔ ${file2}: ${(pair.similarity * 100).toFixed(1)}%`);
  }

  // Analyze specific patterns
  console.log("\n\nPattern Analysis:");

  // Check service duplications
  const serviceResults = await repo.findSimilarByAPTED(
    "test/__fixtures__/duplication/exact/service_duplication_1.ts",
    0.7,
  );

  console.log("\nService duplication detection:");
  for (const result of serviceResults) {
    const fileName = result.file2.split("/").pop();
    console.log(`  service_duplication_1.ts ↔ ${fileName}: ${(result.similarity * 100).toFixed(1)}%`);
  }
}

// Run the analysis
analyzeRealProject()
  .then(() => {
    console.log("\n\n=== Summary ===");
    console.log("• TSED effectively detects various duplication patterns");
    console.log("• Refactoring options help identify class-to-function conversions");
    console.log("• Function comparison finds copy-paste patterns");
    console.log("• Semantic duplications require lower thresholds");
  })
  .catch(console.error);
