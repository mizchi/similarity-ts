import { calculateSimilarity, compareStructures } from "../src/oxc_similarity.ts";

console.log("=== oxc-parser Similarity Examples ===\n");

const examples = [
  {
    name: "Identical TypeScript code",
    code1: `
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  return { id, name: "User" + id };
}
`,
    code2: `
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  return { id, name: "User" + id };
}
`,
  },
  {
    name: "Different implementation, same structure",
    code1: `
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
`,
    code2: `
class Calculator {
  add(x: number, y: number): number {
    const result = x + y;
    return result;
  }
}
`,
  },
  {
    name: "TypeScript vs JavaScript-like",
    code1: `
type Status = "active" | "inactive";

function updateStatus(id: number, status: Status): void {
  console.log(\`Updating \${id} to \${status}\`);
}
`,
    code2: `
function updateStatus(id, status) {
  console.log(\`Updating \${id} to \${status}\`);
}
`,
  },
  {
    name: "Different TypeScript features",
    code1: `
enum Color {
  Red = "RED",
  Green = "GREEN",
  Blue = "BLUE"
}

const myColor: Color = Color.Red;
`,
    code2: `
type Color = "RED" | "GREEN" | "BLUE";

const myColor: Color = "RED";
`,
  },
];

examples.forEach(({ name, code1, code2 }) => {
  console.log(`\n--- ${name} ---`);
  const result = compareStructures(code1, code2);

  console.log(`Similarity: ${(result.similarity * 100).toFixed(1)}%`);
  console.log("\nStructure 1:");
  console.log(result.structure1.split("\n").slice(0, 5).join("\n"));
  if (result.structure1.split("\n").length > 5) {
    console.log(`... and ${result.structure1.split("\n").length - 5} more`);
  }

  console.log("\nStructure 2:");
  console.log(result.structure2.split("\n").slice(0, 5).join("\n"));
  if (result.structure2.split("\n").length > 5) {
    console.log(`... and ${result.structure2.split("\n").length - 5} more`);
  }
});

console.log("\n=== Performance Comparison ===\n");

const mediumTsCode = `
interface User {
  id: number;
  name: string;
  email?: string;
}

class UserService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  getUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
  
  getAllUsers(): User[] {
    return [...this.users];
  }
}

const service = new UserService();
service.addUser({ id: 1, name: "Alice" });
`;

const startTime = performance.now();
const similarity = calculateSimilarity(mediumTsCode, mediumTsCode);
const endTime = performance.now();

console.log(`Medium code similarity calculation took: ${(endTime - startTime).toFixed(2)}ms`);
console.log(`Result: ${(similarity * 100).toFixed(1)}% similar`);
