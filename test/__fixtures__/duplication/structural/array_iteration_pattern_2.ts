// Structural duplication: Functional array processing
// Same logic as pattern_1 but using functional approach
export function processUserData(users: User[]): ProcessedUser[] {
  return users
    .filter(user => user.isActive)
    .map(user => ({
      id: user.id,
      displayName: `${user.firstName} ${user.lastName}`,
      status: 'active',
      lastSeen: user.lastLogin
    }));
}

export function processOrderData(orders: Order[]): ProcessedOrder[] {
  return orders
    .filter(order => order.status === 'completed')
    .map(order => ({
      id: order.id,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      total: order.items.reduce((sum, item) => sum + item.price, 0),
      completedAt: order.completedDate
    }));
}

// Same types as pattern_1
interface User {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin: Date;
}

interface ProcessedUser {
  id: string;
  displayName: string;
  status: string;
  lastSeen: Date;
}

interface Order {
  id: string;
  status: string;
  customer: { firstName: string; lastName: string };
  items: Array<{ price: number }>;
  completedDate: Date;
}

interface ProcessedOrder {
  id: string;
  customerName: string;
  total: number;
  completedAt: Date;
}