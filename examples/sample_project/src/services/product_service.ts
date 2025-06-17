import { Product } from "../models/product.ts";
import { Logger } from "../utils/logger.ts";

export class ProductService {
  private products: Map<string, Product> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async createProduct(data: Omit<Product, "id" | "createdAt">): Promise<Product> {
    const product: Product = {
      id: this.generateId(),
      ...data,
      createdAt: new Date(),
    };

    this.products.set(product.id, product);
    this.logger.info(`Product created: ${product.id}`);

    return product;
  }

  async getProductById(id: string): Promise<Product | null> {
    const product = this.products.get(id);

    if (!product) {
      this.logger.warn(`Product not found: ${id}`);
      return null;
    }

    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const product = await this.getProductById(id);

    if (!product) {
      return null;
    }

    const updatedProduct = { ...product, ...updates, id: product.id };
    this.products.set(id, updatedProduct);
    this.logger.info(`Product updated: ${id}`);

    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const exists = this.products.has(id);

    if (exists) {
      this.products.delete(id);
      this.logger.info(`Product deleted: ${id}`);
    }

    return exists;
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter((product) => product.category === category);
  }

  private generateId(): string {
    return `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
