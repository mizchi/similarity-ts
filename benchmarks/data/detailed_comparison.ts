import { buildRepoAnalyzer, calculateSimilarity, calculateAPTEDSimilarity } from "../src/index.ts";
import { readFileSync } from "fs";
import { join } from "path";

async function detailedComparison() {
  console.log("=== Detailed Code Comparison ===\n");

  const projectPath = join(new URL(".", import.meta.url).pathname, "sample_project");
  const repo = buildRepoAnalyzer();
  await repo.loadFiles("src/**/*.ts", projectPath);

  // Compare services in detail
  const userServicePath = join(projectPath, "src/services/user_service.ts");
  const productServicePath = join(projectPath, "src/services/product_service.ts");

  const userServiceCode = readFileSync(userServicePath, "utf-8");
  const productServiceCode = readFileSync(productServicePath, "utf-8");

  console.log("Comparing UserService vs ProductService:\n");

  // 1. Using different algorithms
  console.log("Algorithm Comparison:");
  console.log(`  Levenshtein:        ${(calculateSimilarity(userServiceCode, productServiceCode) * 100).toFixed(1)}%`);
  console.log(
    `  APTED (default):    ${(calculateAPTEDSimilarity(userServiceCode, productServiceCode) * 100).toFixed(1)}%`,
  );
  console.log(
    `  APTED (rename=0.3): ${(calculateAPTEDSimilarity(userServiceCode, productServiceCode, 0.3) * 100).toFixed(1)}%`,
  );

  // 2. Extract common patterns
  console.log("\n\nCommon Patterns:");

  const userLines = userServiceCode.split("\n");
  const productLines = productServiceCode.split("\n");

  // Find identical methods
  const userMethods = extractMethods(userLines);
  const productMethods = extractMethods(productLines);

  console.log("\nUserService methods:");
  userMethods.forEach((m) => console.log(`  - ${m}`));

  console.log("\nProductService methods:");
  productMethods.forEach((m) => console.log(`  - ${m}`));

  // Identify pattern
  console.log("\n\nPattern Analysis:");
  console.log("Both services follow the same CRUD pattern:");
  console.log("  1. create{Entity} - Creates new entity with generated ID");
  console.log("  2. get{Entity}ById - Retrieves entity by ID");
  console.log("  3. update{Entity} - Updates existing entity");
  console.log("  4. delete{Entity} - Deletes entity");
  console.log("  5. getAll{Entities} - Returns all entities");
  console.log("  6. generateId - Private method for ID generation");

  // 3. Suggest refactoring
  console.log("\n\n--- Refactoring Suggestion ---");
  console.log("\nCreate a generic BaseService class:");
  console.log(`
abstract class BaseService<T extends { id: string }> {
  protected items: Map<string, T> = new Map();
  protected logger: Logger;
  protected entityName: string;

  constructor(logger: Logger, entityName: string) {
    this.logger = logger;
    this.entityName = entityName;
  }

  async create(data: Omit<T, 'id' | 'createdAt'>): Promise<T> {
    const item = {
      id: this.generateId(),
      ...data,
      createdAt: new Date(),
    } as T;

    this.items.set(item.id, item);
    this.logger.info(\`\${this.entityName} created: \${item.id}\`);
    return item;
  }

  async getById(id: string): Promise<T | null> {
    const item = this.items.get(id);
    if (!item) {
      this.logger.warn(\`\${this.entityName} not found: \${id}\`);
      return null;
    }
    return item;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const item = await this.getById(id);
    if (!item) return null;

    const updated = { ...item, ...updates, id };
    this.items.set(id, updated);
    this.logger.info(\`\${this.entityName} updated: \${id}\`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const exists = this.items.has(id);
    if (exists) {
      this.items.delete(id);
      this.logger.info(\`\${this.entityName} deleted: \${id}\`);
    }
    return exists;
  }

  async getAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  protected abstract generateId(): string;
}
`);

  console.log("\nThen refactor services to extend BaseService:");
  console.log(`
class UserService extends BaseService<User> {
  constructor(logger: Logger) {
    super(logger, 'User');
  }

  protected generateId(): string {
    return \`user_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }
}

class ProductService extends BaseService<Product> {
  constructor(logger: Logger) {
    super(logger, 'Product');
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return (await this.getAll()).filter(p => p.category === category);
  }

  protected generateId(): string {
    return \`product_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }
}
`);

  // 4. Compare components
  console.log("\n\n=== Component Comparison ===\n");

  const userListPath = join(projectPath, "src/components/user_list.ts");
  const productListPath = join(projectPath, "src/components/product_list.ts");

  const userListCode = readFileSync(userListPath, "utf-8");
  const productListCode = readFileSync(productListPath, "utf-8");

  console.log("UserList vs ProductList:");
  console.log(`  Levenshtein:        ${(calculateSimilarity(userListCode, productListCode) * 100).toFixed(1)}%`);
  console.log(
    `  APTED (rename=0.3): ${(calculateAPTEDSimilarity(userListCode, productListCode, 0.3) * 100).toFixed(1)}%`,
  );

  console.log("\nBoth components share the same pattern:");
  console.log("  - Constructor that finds container element");
  console.log("  - set{Items} method to update and render");
  console.log("  - add{Item} method to append and render");
  console.log("  - remove{Item} method to filter and render");
  console.log("  - render() method for DOM manipulation");
  console.log("  - escapeHtml() for security");

  console.log("\nSuggestion: Create a generic BaseList component");
}

function extractMethods(lines: string[]): string[] {
  const methods: string[] = [];
  const methodRegex = /^\s*(async\s+)?(\w+)\s*\(/;

  for (const line of lines) {
    const match = line.match(methodRegex);
    if (match && !line.includes("constructor")) {
      methods.push(match[2]);
    }
  }

  return methods;
}

detailedComparison().catch(console.error);
