// TSED (Tree Similarity of Edit Distance) demonstration
import {
  calculateTSED,
  calculateTSEDWithMetrics,
  DEFAULT_TSED_OPTIONS,
  REFACTORING_TSED_OPTIONS,
  buildRepoAnalyzer,
} from "../src/index.ts";
import { parseTypeScript } from "../src/parser.ts";

console.log("=== TSED (Tree Similarity of Edit Distance) Demo ===\n");

// Example 1: Identical code
console.log("1. Identical Code Comparison");
const code1 = `
function add(a: number, b: number): number {
  return a + b;
}`;

const ast1a = parseTypeScript("file1.ts", code1);
const ast1b = parseTypeScript("file2.ts", code1);
const tsed1 = calculateTSED(ast1a, ast1b);
console.log(`TSED: ${tsed1.toFixed(4)} (expected: 1.0000)`);
console.log();

// Example 2: Renamed variables
console.log("2. Renamed Variables Comparison");
const code2a = `
function calculate(x: number, y: number): number {
  const result = x + y;
  return result;
}`;

const code2b = `
function calculate(a: number, b: number): number {
  const sum = a + b;
  return sum;
}`;

const ast2a = parseTypeScript("file1.ts", code2a);
const ast2b = parseTypeScript("file2.ts", code2b);

console.log("With default options (renameCost = 1.0):");
const tsed2Default = calculateTSED(ast2a, ast2b, DEFAULT_TSED_OPTIONS);
console.log(`TSED: ${tsed2Default.toFixed(4)}`);

console.log("With refactoring options (renameCost = 0.3):");
const tsed2Refactor = calculateTSED(ast2a, ast2b, REFACTORING_TSED_OPTIONS);
console.log(`TSED: ${tsed2Refactor.toFixed(4)} (higher = more similar)`);
console.log();

// Example 3: Detailed metrics
console.log("3. Detailed TSED Metrics");
const code3a = `
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}`;

const code3b = `
class Calculator {
  add(a: number, b: number): number {
    const result = a + b;
    console.log('Result:', result);
    return result;
  }
}`;

const ast3a = parseTypeScript("file1.ts", code3a);
const ast3b = parseTypeScript("file2.ts", code3b);

const metrics = calculateTSEDWithMetrics(ast3a, ast3b);
console.log("Metrics:");
console.log(`  TSED Score: ${metrics.tsed.toFixed(4)}`);
console.log(`  Edit Distance: ${metrics.editDistance}`);
console.log(`  Tree1 Nodes: ${metrics.tree1Nodes}`);
console.log(`  Tree2 Nodes: ${metrics.tree2Nodes}`);
console.log(`  Max Nodes: ${metrics.maxNodes}`);
console.log(`  Formula: TSED = max{1 - ${metrics.editDistance}/${metrics.maxNodes}, 0} = ${metrics.tsed.toFixed(4)}`);
console.log();

// Example 4: Different insert costs (paper optimization)
console.log("4. Insert Cost Optimization (Paper Section 5.3)");
const code4a = `
function process(data: string[]): void {
  for (const item of data) {
    console.log(item);
  }
}`;

const code4b = `
function process(data: string[]): void {
  for (const item of data) {
    console.log(item);
    console.log("---");
  }
}`;

const ast4a = parseTypeScript("file1.ts", code4a);
const ast4b = parseTypeScript("file2.ts", code4b);

console.log("With insertCost = 1.0:");
const tsed4_1 = calculateTSED(ast4a, ast4b, { insertCost: 1.0 });
console.log(`TSED: ${tsed4_1.toFixed(4)}`);

console.log("With insertCost = 0.8 (paper recommendation):");
const tsed4_08 = calculateTSED(ast4a, ast4b, { insertCost: 0.8 });
console.log(`TSED: ${tsed4_08.toFixed(4)}`);

console.log("With insertCost = 0.5:");
const tsed4_05 = calculateTSED(ast4a, ast4b, { insertCost: 0.5 });
console.log(`TSED: ${tsed4_05.toFixed(4)}`);
console.log();

// Example 5: Repository integration
console.log("5. Repository Integration with TSED\n");

async function demoRepositoryTSED() {
  const repo = buildRepoAnalyzer();

  // Add test files
  await repo.addFile(
    "original.ts",
    "original.ts",
    `
    class UserService {
      private users: User[] = [];
      
      addUser(user: User): void {
        this.users.push(user);
      }
      
      getUser(id: number): User | undefined {
        return this.users.find(u => u.id === id);
      }
    }
  `,
  );

  await repo.addFile(
    "renamed.ts",
    "renamed.ts",
    `
    class PersonService {
      private people: Person[] = [];
      
      addPerson(person: Person): void {
        this.people.push(person);
      }
      
      getPerson(id: number): Person | undefined {
        return this.people.find(p => p.id === id);
      }
    }
  `,
  );

  await repo.addFile(
    "different.ts",
    "different.ts",
    `
    export function formatDate(date: Date): string {
      return date.toISOString().split('T')[0];
    }
    
    export function parseDate(str: string): Date {
      return new Date(str);
    }
  `,
  );

  // Find similar files using APTED (which uses TSED internally)
  const results = await repo.findSimilarByAPTED("original.ts", 0.5);

  console.log("Repository TSED Similarity Results:");
  for (const result of results) {
    console.log(`  ${result.file1} <-> ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
  }
}

// Example 6: Comparing different programming constructs
console.log("6. Comparing Different Constructs\n");

const constructs = [
  {
    name: "For Loop",
    code: "for (let i = 0; i < 10; i++) { console.log(i); }",
  },
  {
    name: "While Loop",
    code: "let i = 0; while (i < 10) { console.log(i); i++; }",
  },
  {
    name: "Array Method",
    code: "[0,1,2,3,4,5,6,7,8,9].forEach(i => console.log(i));",
  },
  { name: "Function", code: 'function print() { console.log("Hello"); }' },
  {
    name: "Arrow Function",
    code: 'const print = () => { console.log("Hello"); };',
  },
];

console.log("TSED Similarity Matrix:");
console.log("                  ", constructs.map((c) => c.name.padEnd(14)).join(" "));

for (let i = 0; i < constructs.length; i++) {
  const row = [constructs[i].name.padEnd(18)];
  const ast_i = parseTypeScript(`${i}.ts`, constructs[i].code);

  for (let j = 0; j < constructs.length; j++) {
    const ast_j = parseTypeScript(`${j}.ts`, constructs[j].code);
    const tsed = calculateTSED(ast_i, ast_j);
    row.push((tsed * 100).toFixed(0).padStart(14) + "%");
  }

  console.log(row.join(" "));
}

console.log("\nNote: TSED captures structural similarity, not semantic equivalence.");

// Run async demo
demoRepositoryTSED().catch(console.error);
