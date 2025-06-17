// Structural duplication: Imperative array processing
// Common pattern of iterating arrays with for loops
export function processUserData(users: User[]): ProcessedUser[] {
  const result: ProcessedUser[] = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (user.isActive) {
      const processed: ProcessedUser = {
        id: user.id,
        displayName: user.firstName + ' ' + user.lastName,
        status: 'active',
        lastSeen: user.lastLogin
      };
      result.push(processed);
    }
  }
  
  return result;
}

export function processOrderData(orders: Order[]): ProcessedOrder[] {
  const result: ProcessedOrder[] = [];
  
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (order.status === 'completed') {
      const processed: ProcessedOrder = {
        id: order.id,
        customerName: order.customer.firstName + ' ' + order.customer.lastName,
        total: order.items.reduce((sum, item) => sum + item.price, 0),
        completedAt: order.completedDate
      };
      result.push(processed);
    }
  }
  
  return result;
}

// Types
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