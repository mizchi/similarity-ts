export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price?: number;
}

export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}
