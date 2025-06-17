import { Product } from "../models/product.ts";

export class ProductList {
  private container: HTMLElement;
  private products: Product[] = [];

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id ${containerId} not found`);
    }
    this.container = element;
  }

  setProducts(products: Product[]): void {
    this.products = products;
    this.render();
  }

  addProduct(product: Product): void {
    this.products.push(product);
    this.render();
  }

  removeProduct(productId: string): void {
    this.products = this.products.filter((p) => p.id !== productId);
    this.render();
  }

  private render(): void {
    this.container.innerHTML = "";

    if (this.products.length === 0) {
      this.container.innerHTML = "<p>No products found</p>";
      return;
    }

    const div = document.createElement("div");
    div.className = "product-grid";

    this.products.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <h3>${this.escapeHtml(product.name)}</h3>
        <p class="description">${this.escapeHtml(product.description)}</p>
        <p class="price">$${product.price.toFixed(2)}</p>
        <p class="stock">Stock: ${product.stock}</p>
      `;
      div.appendChild(card);
    });

    this.container.appendChild(div);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
