import { buildRepoAnalyzer } from "../src/index.ts";
import { join } from "path";

async function demonstrateMultiFileSimilarity() {
  console.log("=== Multi-File Code Similarity Analysis ===\n");

  // Create repository
  const repo = buildRepoAnalyzer();

  // Load test fixtures
  console.log("Loading test fixtures...");
  await repo.loadFiles("test/__fixtures__/**/*.ts");

  const stats = repo.getStatistics();
  console.log(`Loaded ${stats.totalFiles} files`);
  console.log(`Average tokens per file: ${stats.averageTokens.toFixed(0)}`);
  console.log(`Total unique tokens: ${stats.uniqueTokens}\n`);

  // Example 1: Find similar files to a specific file
  console.log("--- Finding files similar to function_rename_1.ts ---");
  const targetFile = "test/__fixtures__/similar/function_rename_1.ts";

  console.log("\nUsing MinHash/LSH (fast):");
  const minHashResults = repo.findSimilarByMinHash(targetFile, 0.5);
  for (const result of minHashResults.slice(0, 5)) {
    console.log(`  ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
  }

  console.log("\nUsing SimHash (structural):");
  const simHashResults = repo.findSimilarBySimHash(targetFile, 0.5);
  for (const result of simHashResults.slice(0, 5)) {
    console.log(`  ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
  }

  console.log("\nUsing APTED (accurate):");
  const aptedResults = repo.findSimilarByAPTED(targetFile, 0.5);
  for (const result of aptedResults.slice(0, 5)) {
    console.log(`  ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
  }

  // Example 2: Find all similar pairs
  console.log("\n\n--- Finding all similar pairs (threshold: 70%) ---");
  const allPairs = repo.findAllSimilarPairs(0.7, "minhash");
  console.log(`Found ${allPairs.length} similar pairs:\n`);

  for (const pair of allPairs.slice(0, 10)) {
    const file1Name = pair.file1.split("/").pop();
    const file2Name = pair.file2.split("/").pop();
    console.log(`  ${file1Name} <-> ${file2Name}: ${(pair.similarity * 100).toFixed(1)}%`);
  }

  if (allPairs.length > 10) {
    console.log(`  ... and ${allPairs.length - 10} more pairs`);
  }

  // Example 3: Find code clones
  console.log("\n\n--- Finding code clones (threshold: 90%) ---");
  const clones = repo.findClones(0.9);
  console.log(`Found ${clones.size} clone groups:\n`);

  let groupNum = 1;
  for (const [representative, group] of clones) {
    console.log(`Clone Group ${groupNum++} (${group.length} files):`);
    for (const file of group) {
      console.log(`  - ${file.split("/").pop()}`);
    }
    console.log();
  }

  // Example 4: Performance comparison
  console.log("\n--- Performance Comparison ---");

  const testFile = "test/__fixtures__/similar/class_rename_1.ts";

  // MinHash/LSH
  const start1 = performance.now();
  repo.findSimilarByMinHash(testFile, 0.5);
  const minHashTime = performance.now() - start1;

  // SimHash
  const start2 = performance.now();
  repo.findSimilarBySimHash(testFile, 0.5);
  const simHashTime = performance.now() - start2;

  // APTED (limited to candidates)
  const start3 = performance.now();
  repo.findSimilarByAPTED(testFile, 0.5, 10);
  const aptedTime = performance.now() - start3;

  console.log(`MinHash/LSH: ${minHashTime.toFixed(2)}ms`);
  console.log(`SimHash:     ${simHashTime.toFixed(2)}ms`);
  console.log(`APTED:       ${aptedTime.toFixed(2)}ms (limited to top candidates)`);
}

// Demonstrate custom repository usage
async function customRepositoryExample() {
  console.log("\n\n=== Custom Repository Example ===\n");

  const repo = buildRepoAnalyzer();

  // Add files manually
  repo.addFile(
    "service1.ts",
    "service1.ts",
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

  repo.addFile(
    "service2.ts",
    "service2.ts",
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

  repo.addFile(
    "utils.ts",
    "utils.ts",
    `
    export function formatDate(date: Date): string {
      return date.toISOString().split('T')[0];
    }
    
    export function parseDate(str: string): Date {
      return new Date(str);
    }
  `,
  );

  // Find similarities
  console.log("Similarity Matrix:");
  const files = ["service1.ts", "service2.ts", "utils.ts"];

  for (const file1 of files) {
    const similarities = repo.findSimilarByMinHash(file1, 0);
    console.log(`\n${file1}:`);
    for (const result of similarities) {
      console.log(`  -> ${result.file2}: ${(result.similarity * 100).toFixed(1)}%`);
    }
  }
}

// Run demonstrations
demonstrateMultiFileSimilarity()
  .then(() => customRepositoryExample())
  .catch(console.error);
