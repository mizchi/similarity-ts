import { Order, OrderStatus } from "../models/order.ts";
import { Logger } from "../utils/logger.ts";
import { ValidationError } from "../utils/errors.ts";

export class OrderService {
  private orders: Map<string, Order> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async createOrder(userId: string, items: Array<{ productId: string; quantity: number }>): Promise<Order> {
    if (items.length === 0) {
      throw new ValidationError("Order must contain at least one item");
    }

    const order: Order = {
      id: this.generateOrderId(),
      userId,
      items,
      status: OrderStatus.PENDING,
      totalAmount: this.calculateTotal(items),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(order.id, order);
    this.logger.info(`Order created: ${order.id} for user: ${userId}`);

    return order;
  }

  async getOrderById(id: string): Promise<Order | null> {
    return this.orders.get(id) || null;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((order) => order.userId === userId);
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
    const order = this.orders.get(id);

    if (!order) {
      this.logger.warn(`Order not found: ${id}`);
      return null;
    }

    const updatedOrder = {
      ...order,
      status,
      updatedAt: new Date(),
    };

    this.orders.set(id, updatedOrder);
    this.logger.info(`Order ${id} status updated to: ${status}`);

    return updatedOrder;
  }

  async cancelOrder(id: string): Promise<boolean> {
    const order = await this.getOrderById(id);

    if (!order) {
      return false;
    }

    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(`Cannot cancel order ${id} with status: ${order.status}`);
      return false;
    }

    await this.updateOrderStatus(id, OrderStatus.CANCELLED);
    return true;
  }

  private calculateTotal(items: Array<{ productId: string; quantity: number }>): number {
    // Simplified calculation - in real app would fetch product prices
    return items.reduce((total, item) => total + item.quantity * 10, 0);
  }

  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
