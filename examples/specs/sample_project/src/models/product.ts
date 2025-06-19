export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ProductVariant extends Product {
  parentId: string;
  sku: string;
  attributes: Record<string, string>;
}
