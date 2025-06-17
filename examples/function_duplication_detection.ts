import {
  extractFunctions,
  findDuplicateFunctions,
  compareFunctions,
  methodToFunction,
  areSemanticallySimilar,
} from "../src/index.ts";

console.log("=== Function Duplication Detection Example ===\n");

// Example code with potential duplications
const sampleCode = `
// User management class
class UserManager {
  private users: Map<string, User> = new Map();
  
  addUser(user: User): void {
    if (!user.id) {
      throw new Error('User must have an ID');
    }
    this.users.set(user.id, user);
    console.log(\`User \${user.name} added\`);
  }
  
  removeUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (user) {
      this.users.delete(userId);
      console.log(\`User \${user.name} removed\`);
      return true;
    }
    return false;
  }
  
  findUser(userId: string): User | undefined {
    return this.users.get(userId);
  }
}

// Standalone user management functions
const userStore = new Map<string, User>();

function addUserToStore(user: User): void {
  if (!user.id) {
    throw new Error('User must have an ID');
  }
  userStore.set(user.id, user);
  console.log(\`User \${user.name} added\`);
}

function removeUserFromStore(userId: string): boolean {
  const user = userStore.get(userId);
  if (user) {
    userStore.delete(userId);
    console.log(\`User \${user.name} removed\`);
    return true;
  }
  return false;
}

function findUserInStore(userId: string): User | undefined {
  return userStore.get(userId);
}

// Product management with similar pattern
class ProductManager {
  private products: Map<string, Product> = new Map();
  
  addProduct(product: Product): void {
    if (!product.id) {
      throw new Error('Product must have an ID');
    }
    this.products.set(product.id, product);
    console.log(\`Product \${product.name} added\`);
  }
  
  removeProduct(productId: string): boolean {
    const product = this.products.get(productId);
    if (product) {
      this.products.delete(productId);
      console.log(\`Product \${product.name} removed\`);
      return true;
    }
    return false;
  }
}

// Generic store functions
function addToMap<T extends { id: string; name: string }>(map: Map<string, T>, item: T): void {
  if (!item.id) {
    throw new Error('Item must have an ID');
  }
  map.set(item.id, item);
  console.log(\`Item \${item.name} added\`);
}

function removeFromMap<T extends { name: string }>(map: Map<string, T>, itemId: string): boolean {
  const item = map.get(itemId);
  if (item) {
    map.delete(itemId);
    console.log(\`Item \${item.name} removed\`);
    return true;
  }
  return false;
}

// Array-based implementation (different data structure)
class UserList {
  private users: User[] = [];
  
  addUser(user: User): void {
    if (!user.id) {
      throw new Error('User must have an ID');
    }
    this.users.push(user);
    console.log(\`User \${user.name} added\`);
  }
  
  removeUser(userId: string): boolean {
    const index = this.users.findIndex(u => u.id === userId);
    if (index >= 0) {
      const user = this.users[index];
      this.users.splice(index, 1);
      console.log(\`User \${user.name} removed\`);
      return true;
    }
    return false;
  }
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}
`;

// Extract all functions
console.log("1. Extracting functions from code...");
const functions = extractFunctions(sampleCode);
console.log(`   Found ${functions.length} functions/methods\n`);

// Group by type
const methods = functions.filter((f) => f.type === "method");
const standaloneFuncs = functions.filter((f) => f.type === "function");
const arrowFuncs = functions.filter((f) => f.type === "arrow");

console.log(`   - Methods: ${methods.length}`);
console.log(`   - Functions: ${standaloneFuncs.length}`);
console.log(`   - Arrow functions: ${arrowFuncs.length}\n`);

// Find duplicates without considering 'this' differences
console.log("2. Finding duplicate implementations (ignoring this/parameter differences)...\n");
const duplicates = findDuplicateFunctions(functions, {
  ignoreThis: true,
  ignoreParamNames: true,
  similarityThreshold: 0.8,
});

console.log(`   Found ${duplicates.length} potential duplicate pairs:\n`);

// Group duplicates by similarity level
const highDuplicates = duplicates.filter(([, , comp]) => comp.similarity >= 0.95);
const mediumDuplicates = duplicates.filter(([, , comp]) => comp.similarity >= 0.85 && comp.similarity < 0.95);
const lowDuplicates = duplicates.filter(([, , comp]) => comp.similarity >= 0.8 && comp.similarity < 0.85);

if (highDuplicates.length > 0) {
  console.log("   🔴 Very High Similarity (≥95%):");
  highDuplicates.forEach(([func1, func2, comparison]) => {
    const desc1 = func1.className ? `${func1.className}.${func1.name}` : func1.name;
    const desc2 = func2.className ? `${func2.className}.${func2.name}` : func2.name;
    console.log(`      ${desc1} ↔ ${desc2}: ${(comparison.similarity * 100).toFixed(1)}%`);
  });
  console.log();
}

if (mediumDuplicates.length > 0) {
  console.log("   🟡 High Similarity (85-95%):");
  mediumDuplicates.forEach(([func1, func2, comparison]) => {
    const desc1 = func1.className ? `${func1.className}.${func1.name}` : func1.name;
    const desc2 = func2.className ? `${func2.className}.${func2.name}` : func2.name;
    console.log(`      ${desc1} ↔ ${desc2}: ${(comparison.similarity * 100).toFixed(1)}%`);
  });
  console.log();
}

if (lowDuplicates.length > 0) {
  console.log("   🟢 Medium Similarity (80-85%):");
  lowDuplicates.forEach(([func1, func2, comparison]) => {
    const desc1 = func1.className ? `${func1.className}.${func1.name}` : func1.name;
    const desc2 = func2.className ? `${func2.className}.${func2.name}` : func2.name;
    console.log(`      ${desc1} ↔ ${desc2}: ${(comparison.similarity * 100).toFixed(1)}%`);
  });
  console.log();
}

// Detailed comparison example
console.log("3. Detailed comparison example:\n");

const userManagerAdd = functions.find((f) => f.name === "addUser" && f.className === "UserManager");
const standaloneAdd = functions.find((f) => f.name === "addUserToStore");
const genericAdd = functions.find((f) => f.name === "addToMap");

if (userManagerAdd && standaloneAdd) {
  console.log("   Comparing UserManager.addUser vs addUserToStore:");

  // Compare with this difference
  const comp1 = compareFunctions(userManagerAdd, standaloneAdd);
  console.log(`   - With this difference: ${(comp1.similarity * 100).toFixed(1)}%`);
  console.log(`   - This usage differs: ${comp1.differences.thisUsage}`);

  // Compare ignoring this
  const comp2 = compareFunctions(userManagerAdd, standaloneAdd, {
    ignoreThis: true,
  });
  console.log(`   - Ignoring this: ${(comp2.similarity * 100).toFixed(1)}%`);
  console.log(`   - Structurally equivalent: ${comp2.isStructurallyEquivalent}\n`);
}

// Semantic similarity check
console.log("4. Semantic similarity analysis:\n");

if (userManagerAdd && standaloneAdd && genericAdd) {
  console.log("   Testing semantic equivalence:");

  const semanticSim1 = areSemanticallySimilar(
    userManagerAdd.body,
    "method",
    userManagerAdd.parameters,
    standaloneAdd.body,
    "function",
    standaloneAdd.parameters,
    0.85,
  );

  console.log(`   - UserManager.addUser ≈ addUserToStore: ${semanticSim1}`);

  const semanticSim2 = areSemanticallySimilar(
    userManagerAdd.body,
    "method",
    userManagerAdd.parameters,
    genericAdd.body,
    "function",
    genericAdd.parameters,
    0.85,
  );

  console.log(`   - UserManager.addUser ≈ addToMap<T>: ${semanticSim2}\n`);
}

// Method to function conversion example
console.log("5. Method to function conversion:\n");

if (userManagerAdd) {
  const convertedFunction = methodToFunction(
    userManagerAdd.body,
    userManagerAdd.name,
    userManagerAdd.parameters,
    "UserManager",
  );

  console.log("   Original method:");
  console.log("   ```typescript");
  console.log(`   ${userManagerAdd.name}(${userManagerAdd.parameters.join(", ")}) {`);
  console.log(
    userManagerAdd.body
      .split("\n")
      .map((line) => "   " + line)
      .join("\n"),
  );
  console.log("   }");
  console.log("   ```\n");

  console.log("   Converted to standalone function:");
  console.log("   ```typescript");
  console.log(
    convertedFunction
      .split("\n")
      .map((line) => "   " + line)
      .join("\n"),
  );
  console.log("   ```\n");
}

// Summary and recommendations
console.log("6. Summary and Recommendations:\n");

const uniqueClasses = [...new Set(functions.filter((f) => f.className).map((f) => f.className))];
console.log(`   - Classes analyzed: ${uniqueClasses.join(", ")}`);
console.log(`   - Total functions: ${functions.length}`);
console.log(`   - Duplicate pairs found: ${duplicates.length}`);

if (highDuplicates.length > 0) {
  console.log("\n   💡 Refactoring suggestions:");
  console.log("   - Consider extracting common logic into shared utility functions");
  console.log("   - Use generic implementations where possible");
  console.log("   - Apply DRY principle to reduce code duplication");
}

// Calculate duplication percentage
const totalPairs = (functions.length * (functions.length - 1)) / 2;
const duplicationRate = (duplicates.length / totalPairs) * 100;
console.log(`\n   📊 Duplication rate: ${duplicationRate.toFixed(1)}% of all function pairs`);
