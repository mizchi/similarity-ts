// Sample TypeScript file for testing type literal similarity detection

// Type declaration
type UserData = { id: number; name: string; email: string };

// Function with type literal return type - should match UserData
function getUser(): { id: number; name: string; email: string } {
  return { id: 1, name: "John", email: "john@example.com" };
}

// Function with type literal parameter - should match UserData
function updateUser(user: { id: number; name: string; email: string }): void {
  console.log("Updating user:", user);
}

// Variable with type literal - should match UserData
const defaultUser: { id: number; name: string; email: string } = {
  id: 0,
  name: "Default",
  email: "default@example.com",
};

// Arrow function with type literal return type
const createUser = (): { id: number; name: string; email: string } => {
  return { id: Math.random(), name: "New User", email: "new@example.com" };
};

// Different type literal - should not match
function getProduct(): { sku: string; price: number; category: string } {
  return { sku: "ABC123", price: 99.99, category: "Electronics" };
}

// Similar but slightly different type literal
function getUserInfo(): { id: number; fullName: string; email: string } {
  return { id: 1, fullName: "John Doe", email: "john@example.com" };
}

// Nested type literal
function getOrder(): {
  id: number;
  user: { id: number; name: string; email: string };
  items: Array<{ sku: string; quantity: number }>;
} {
  return {
    id: 1,
    user: { id: 1, name: "John", email: "john@example.com" },
    items: [{ sku: "ABC123", quantity: 2 }],
  };
}

// Type literal with optional properties
function getPartialUser(): { id: number; name?: string; email?: string } {
  return { id: 1 };
}

// Interface for comparison
interface ProductInfo {
  sku: string;
  price: number;
  category: string;
}

// Type alias for comparison
type OrderData = {
  id: number;
  user: { id: number; name: string; email: string };
  items: Array<{ sku: string; quantity: number }>;
};
