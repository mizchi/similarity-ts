import { calculateSimilarity, calculateAPTEDSimilarity } from "../src/index.ts";
import { compareStructuresAPTED } from "../src/core/apted.ts";
import { parseTypeScript } from "../src/parser.ts";

console.log("=== APTED vs Levenshtein Comparison ===\n");

const examples = [
  {
    name: "Identical code",
    code1: `
function add(a: number, b: number): number {
  return a + b;
}`,
    code2: `
function add(a: number, b: number): number {
  return a + b;
}`,
  },
  {
    name: "Renamed function (same structure)",
    code1: `
function add(a: number, b: number): number {
  return a + b;
}`,
    code2: `
function sum(x: number, y: number): number {
  return x + y;
}`,
  },
  {
    name: "Different implementation, same interface",
    code1: `
function calculate(a: number, b: number): number {
  return a + b;
}`,
    code2: `
function calculate(a: number, b: number): number {
  const result = a + b;
  return result;
}`,
  },
  {
    name: "Swapped parameters",
    code1: `
function divide(dividend: number, divisor: number): number {
  return dividend / divisor;
}`,
    code2: `
function divide(divisor: number, dividend: number): number {
  return dividend / divisor;
}`,
  },
  {
    name: "Similar classes",
    code1: `
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  subtract(a: number, b: number): number {
    return a - b;
  }
}`,
    code2: `
class Calculator {
  sum(x: number, y: number): number {
    return x + y;
  }
  
  diff(x: number, y: number): number {
    return x - y;
  }
}`,
  },
  {
    name: "Completely different structures",
    code1: `
interface User {
  id: number;
  name: string;
}`,
    code2: `
function processData(data: any[]): void {
  for (const item of data) {
    console.log(item);
  }
}`,
  },
];

console.log("Comparing different similarity algorithms:\n");

examples.forEach(({ name, code1, code2 }) => {
  const levenshtein = calculateSimilarity(code1, code2);
  const apted = calculateAPTEDSimilarity(code1, code2);
  const aptedLowRename = calculateAPTEDSimilarity(code1, code2, {
    renameCost: 0.3,
  });

  console.log(`--- ${name} ---`);
  console.log(`Levenshtein:          ${(levenshtein * 100).toFixed(1)}%`);
  console.log(`APTED (default):      ${(apted * 100).toFixed(1)}%`);
  console.log(`APTED (rename=0.3):   ${(aptedLowRename * 100).toFixed(1)}%`);
  console.log();
});

console.log("\n=== Detailed Comparison Example ===\n");

const detailedCode1 = `
class UserService {
  private users: Map<string, User> = new Map();
  
  addUser(user: User): void {
    this.users.set(user.id, user);
  }
  
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }
}`;

const detailedCode2 = `
class PersonService {
  private people: Map<string, Person> = new Map();
  
  addPerson(person: Person): void {
    this.people.set(person.id, person);
  }
  
  getPerson(id: string): Person | undefined {
    return this.people.get(id);
  }
}`;

const ast1 = parseTypeScript("file1.ts", detailedCode1);
const ast2 = parseTypeScript("file2.ts", detailedCode2);
const result = compareStructuresAPTED(ast1.program, ast2.program);

console.log("Code comparison:");
console.log(`Levenshtein similarity: ${(result.levenshteinSimilarity * 100).toFixed(1)}%`);
console.log(`APTED similarity:       ${(result.similarity * 100).toFixed(1)}%`);
console.log("\nStructure preview (first 5 nodes):");
console.log("Structure 1:", result.structure1.split("\n").slice(0, 5).join(", "));
console.log("Structure 2:", result.structure2.split("\n").slice(0, 5).join(", "));

console.log("\n=== Performance Test ===\n");

const mediumCode = `
${Array.from(
  { length: 10 },
  (_, i) => `
function func${i}(param: string): number {
  const result = param.length * ${i};
  return result;
}
`,
).join("\n")}
`;

const iterations = 10;
let levenshteinTime = 0;
let aptedTime = 0;

for (let i = 0; i < iterations; i++) {
  const start1 = performance.now();
  calculateSimilarity(mediumCode, mediumCode);
  levenshteinTime += performance.now() - start1;

  const start2 = performance.now();
  calculateAPTEDSimilarity(mediumCode, mediumCode);
  aptedTime += performance.now() - start2;
}

console.log(`Average time over ${iterations} iterations:`);
console.log(`Levenshtein: ${(levenshteinTime / iterations).toFixed(2)}ms`);
console.log(`APTED:       ${(aptedTime / iterations).toFixed(2)}ms`);
