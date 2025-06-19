// Example: Type duplication detection (--experimental-types)

// Duplicate 1: Identical interfaces with different names
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Duplicate 2: Similar type aliases
type UserResponse = {
  userId: string;
  userName: string;
  userEmail: string;
  isActive: boolean;
};

type CustomerResponse = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  isActive: boolean;
};

// Duplicate 3: Common API response patterns
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: Date;
}

interface ServiceResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: Date;
}