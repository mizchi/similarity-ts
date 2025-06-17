import {
  extractFunctionBody,
  compareFunctionBodies,
  findDuplicateFunctionBodies,
} from "../src/core/function_body_comparer.ts";

console.log("=== Function Body Comparison Example ===\n");

const code = `
// Class-based implementation
class UserService {
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
}

// Standalone function implementation
function addUserToStore(store: Map<string, User>, user: User): void {
  if (!user.id) {
    throw new Error('User must have an ID');
  }
  store.set(user.id, user);
  console.log(\`User \${user.name} added\`);
}

// Arrow function with different parameter names
const addUserToMap = (userMap: Map<string, User>, newUser: User): void => {
  if (!newUser.id) {
    throw new Error('User must have an ID');
  }
  userMap.set(newUser.id, newUser);
  console.log(\`User \${newUser.name} added\`);
};

// Similar logic but for products
class ProductService {
  private products: Map<string, Product> = new Map();
  
  addProduct(product: Product): void {
    if (!product.id) {
      throw new Error('Product must have an ID');
    }
    this.products.set(product.id, product);
    console.log(\`Product \${product.name} added\`);
  }
}

// Different implementation pattern
function saveUser(users: User[], user: User): void {
  if (!user.id) {
    throw new Error('User must have an ID');
  }
  users.push(user);
  console.log(\`User \${user.name} saved\`);
}

interface User {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}
`;

// 1. Extract and display function bodies
console.log("1. Extracting function bodies:\n");

const functions = [
  { name: "addUser", isMethod: true },
  { name: "removeUser", isMethod: true },
  { name: "addUserToStore", isMethod: false },
  { name: "addUserToMap", isMethod: false },
  { name: "addProduct", isMethod: true },
  { name: "saveUser", isMethod: false },
];

const extractedBodies: Map<string, string> = new Map();

for (const func of functions) {
  const body = extractFunctionBody(code, func.name, func.isMethod);
  if (body) {
    extractedBodies.set(func.name, body);
    console.log(`${func.name}:`);
    console.log("```");
    console.log(body);
    console.log("```\n");
  }
}

// 2. Compare specific function pairs
console.log("\n2. Comparing function pairs:\n");

// Compare class method vs standalone function
const addUserBody = extractedBodies.get("addUser");
const addUserToStoreBody = extractedBodies.get("addUserToStore");

if (addUserBody && addUserToStoreBody) {
  console.log("Comparing UserService.addUser vs addUserToStore:");
  const comparison = compareFunctionBodies(
    addUserBody,
    addUserToStoreBody,
    "method",
    "function",
    ["user"],
    ["store", "user"],
  );

  console.log(`- Direct similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
  console.log(`- Normalized similarity: ${(comparison.normalizedSimilarity * 100).toFixed(1)}%`);
  console.log(`- Structural similarity: ${(comparison.structuralSimilarity * 100).toFixed(1)}%`);
  console.log(`- Has this difference: ${comparison.hasThisDifference}`);
  console.log(`- Has parameter difference: ${comparison.hasParameterDifference}\n`);
}

// Compare similar methods from different classes
const addProductBody = extractedBodies.get("addProduct");

if (addUserBody && addProductBody) {
  console.log("Comparing UserService.addUser vs ProductService.addProduct:");
  const comparison = compareFunctionBodies(addUserBody, addProductBody, "method", "method", ["user"], ["product"]);

  console.log(`- Direct similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
  console.log(`- Normalized similarity: ${(comparison.normalizedSimilarity * 100).toFixed(1)}%`);
  console.log(`- Structural similarity: ${(comparison.structuralSimilarity * 100).toFixed(1)}%`);
  console.log(`- Has this difference: ${comparison.hasThisDifference}`);
  console.log(`- Has parameter difference: ${comparison.hasParameterDifference}\n`);
}

// Compare different implementations
const saveUserBody = extractedBodies.get("saveUser");

if (addUserBody && saveUserBody) {
  console.log("Comparing UserService.addUser vs saveUser (different data structures):");
  const comparison = compareFunctionBodies(
    addUserBody,
    saveUserBody,
    "method",
    "function",
    ["user"],
    ["users", "user"],
  );

  console.log(`- Direct similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
  console.log(`- Normalized similarity: ${(comparison.normalizedSimilarity * 100).toFixed(1)}%`);
  console.log(`- Structural similarity: ${(comparison.structuralSimilarity * 100).toFixed(1)}%`);
  console.log(`- Has this difference: ${comparison.hasThisDifference}`);
  console.log(`- Has parameter difference: ${comparison.hasParameterDifference}\n`);
}

// 3. Find all duplicates automatically
console.log("\n3. Finding all duplicate function bodies:\n");

const duplicates = findDuplicateFunctionBodies(code, 0.8);

console.log(`Found ${duplicates.length} duplicate pairs with >80% normalized similarity:\n`);

duplicates.forEach(({ func1, func2, comparison }) => {
  console.log(`${func1} ↔ ${func2}:`);
  console.log(`  - Normalized similarity: ${(comparison.normalizedSimilarity * 100).toFixed(1)}%`);
  console.log(`  - Structural similarity: ${(comparison.structuralSimilarity * 100).toFixed(1)}%`);
  if (comparison.hasThisDifference) {
    console.log("  - Note: Different this usage (method vs function)");
  }
  console.log();
});

// 4. Summary and recommendations
console.log("4. Summary:\n");

const highDuplicates = duplicates.filter((d) => d.comparison.normalizedSimilarity >= 0.95);
const mediumDuplicates = duplicates.filter(
  (d) => d.comparison.normalizedSimilarity >= 0.85 && d.comparison.normalizedSimilarity < 0.95,
);

if (highDuplicates.length > 0) {
  console.log(`🔴 Very high duplication (≥95%): ${highDuplicates.length} pairs`);
  console.log("   Consider extracting shared logic into utility functions");
}

if (mediumDuplicates.length > 0) {
  console.log(`🟡 High duplication (85-95%): ${mediumDuplicates.length} pairs`);
  console.log("   Review for potential refactoring opportunities");
}

const totalFunctions = functions.length;
const duplicateRate = (duplicates.length / ((totalFunctions * (totalFunctions - 1)) / 2)) * 100;
console.log(`\n📊 Overall duplication rate: ${duplicateRate.toFixed(1)}%`);
