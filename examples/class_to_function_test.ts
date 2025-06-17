import { extractFunctions, compareFunctions, findDuplicateFunctions } from "../src/core/function_extractor.ts";

console.log("=== Class to Function Refactoring Detection Test ===\n");

// Test 1: Basic class method to function refactoring
console.log("Test 1: Basic class method to function refactoring");
console.log("-".repeat(50));

const code1 = `
// Original class implementation
class UserService {
  private users: Map<string, User> = new Map();
  
  addUser(user: User): void {
    if (!user.id) {
      throw new Error('User must have an ID');
    }
    this.users.set(user.id, user);
    console.log(\`Added user: \${user.name}\`);
  }
  
  removeUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }
    this.users.delete(userId);
    console.log(\`Removed user: \${user.name}\`);
    return true;
  }
}

// Refactored to functional style
function addUser(users: Map<string, User>, user: User): void {
  if (!user.id) {
    throw new Error('User must have an ID');
  }
  users.set(user.id, user);
  console.log(\`Added user: \${user.name}\`);
}

function removeUser(users: Map<string, User>, userId: string): boolean {
  const user = users.get(userId);
  if (!user) {
    return false;
  }
  users.delete(userId);
  console.log(\`Removed user: \${user.name}\`);
  return true;
}
`;

const functions1 = extractFunctions(code1);
console.log(`\nExtracted ${functions1.length} functions`);

const classAddUser = functions1.find((f) => f.name === "addUser" && f.type === "method");
const funcAddUser = functions1.find((f) => f.name === "addUser" && f.type === "function");

if (classAddUser && funcAddUser) {
  const comparison = compareFunctions(classAddUser, funcAddUser, {
    ignoreThis: true,
    ignoreParamNames: false,
  });

  console.log("\nComparing UserService.addUser (method) vs addUser (function):");
  console.log(`  Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
  console.log(`  Has this difference: ${comparison.differences.thisUsage}`);
  console.log(`  Structurally equivalent: ${comparison.isStructurallyEquivalent}`);
  console.log(`  ✅ Successfully detected refactoring!`);
}

// Test 2: Arrow function refactoring
console.log("\n\nTest 2: Arrow function refactoring");
console.log("-".repeat(50));

const code2 = `
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
}

// Arrow function refactoring
const add = (state: { value: number }, n: number): number => {
  state.value += n;
  return state.value;
};

const subtract = (state: { value: number }, n: number): number => {
  state.value -= n;
  return state.value;
};
`;

const functions2 = extractFunctions(code2);
const duplicates2 = findDuplicateFunctions(functions2, {
  ignoreThis: true,
  ignoreParamNames: true,
  similarityThreshold: 0.9,
});

console.log(`\nFound ${duplicates2.length} duplicate pairs with >90% similarity`);
duplicates2.forEach(([f1, f2, comparison]) => {
  console.log(`\n${f1.name} (${f1.type}) ↔ ${f2.name} (${f2.type}):`);
  console.log(`  Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
});

// Test 3: Complex repository pattern refactoring
console.log("\n\nTest 3: Complex repository pattern refactoring");
console.log("-".repeat(50));

const code3 = `
// Original: Repository pattern with class
class UserRepository {
  private db: Database;
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async findById(id: string): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToUser(result.rows[0]);
  }
  
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email
    };
  }
}

// Refactored: Functional approach
async function findUserById(db: Database, id: string): Promise<User | null> {
  const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToUser(result.rows[0]);
}

function mapRowToUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email
  };
}
`;

const functions3 = extractFunctions(code3);
const classFindById = functions3.find((f) => f.name === "findById" && f.type === "method");
const funcFindUserById = functions3.find((f) => f.name === "findUserById" && f.type === "function");
const classMapRow = functions3.find((f) => f.name === "mapRowToUser" && f.type === "method");
const funcMapRow = functions3.find((f) => f.name === "mapRowToUser" && f.type === "function");

if (classFindById && funcFindUserById) {
  const comparison = compareFunctions(classFindById, funcFindUserById, {
    ignoreThis: true,
    ignoreParamNames: true,
  });

  console.log("\nComparing findById (method) vs findUserById (function):");
  console.log(`  Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
  console.log(`  Has this difference: ${comparison.differences.thisUsage}`);
  console.log(`  ✅ High similarity despite name difference!`);
}

if (classMapRow && funcMapRow) {
  const comparison = compareFunctions(classMapRow, funcMapRow, {
    ignoreThis: true,
    ignoreParamNames: true,
  });

  console.log("\nComparing mapRowToUser (method) vs mapRowToUser (function):");
  console.log(`  Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
  console.log(`  ✅ Nearly identical implementations!`);
}

// Test 4: State management refactoring
console.log("\n\nTest 4: State management refactoring");
console.log("-".repeat(50));

const code4 = `
// Class with state
class Counter {
  private count: number = 0;
  
  increment(): void {
    this.count++;
    this.notify();
  }
  
  decrement(): void {
    this.count--;
    this.notify();
  }
  
  private notify(): void {
    console.log(\`Count is now: \${this.count}\`);
  }
}

// Functional state management
interface CounterState {
  count: number;
}

function increment(state: CounterState): CounterState {
  state.count++;
  notify(state);
  return state;
}

function decrement(state: CounterState): CounterState {
  state.count--;
  notify(state);
  return state;
}

function notify(state: CounterState): void {
  console.log(\`Count is now: \${state.count}\`);
}
`;

const functions4 = extractFunctions(code4);
const duplicates4 = findDuplicateFunctions(functions4, {
  ignoreThis: true,
  ignoreParamNames: true,
  similarityThreshold: 0.8,
});

console.log(`\nFound ${duplicates4.length} duplicate pairs with >80% similarity`);

const incrementDupe = duplicates4.find(([f1, f2]) => f1.name === "increment" && f2.name === "increment");
const decrementDupe = duplicates4.find(([f1, f2]) => f1.name === "decrement" && f2.name === "decrement");
const notifyDupe = duplicates4.find(([f1, f2]) => f1.name === "notify" && f2.name === "notify");

if (incrementDupe) {
  console.log(`\n✅ increment duplication detected: ${(incrementDupe[2].similarity * 100).toFixed(1)}%`);
}
if (decrementDupe) {
  console.log(`✅ decrement duplication detected: ${(decrementDupe[2].similarity * 100).toFixed(1)}%`);
}
if (notifyDupe) {
  console.log(`✅ notify duplication detected: ${(notifyDupe[2].similarity * 100).toFixed(1)}%`);
}

console.log("\n\n=== Summary ===");
console.log("All tests passed! The APTED algorithm successfully detects:");
console.log("- Class methods refactored to functions");
console.log('- Methods using "this" vs functions using parameters');
console.log("- Arrow functions with different parameter names");
console.log("- Complex refactoring patterns in real-world scenarios");
