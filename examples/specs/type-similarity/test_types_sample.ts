// Sample TypeScript file for testing type similarity detection

// Similar interfaces - should be detected as highly similar
interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

interface Person {
  id: string;
  name: string;
  email: string;
  age?: number;
}

// Similar but with different property names - should be detected as moderately similar
interface Customer {
  id: string;
  fullName: string;
  emailAddress: string;
  yearsOld?: number;
}

// Type alias vs interface - should be detected as similar if cross-kind comparison is enabled
type UserType = {
  id: string;
  name: string;
  email: string;
  age?: number;
};

// Union types
type Status = "active" | "inactive" | "pending";
type State = "active" | "inactive" | "suspended";

// Different structure - should not be similar
interface Product {
  sku: string;
  price: number;
  category: string;
  inStock: boolean;
}

// Generic interface
interface Container<T> {
  value: T;
  metadata: {
    created: Date;
    updated: Date;
  };
}

// Similar generic interface
interface Wrapper<T> {
  value: T;
  metadata: {
    created: Date;
    updated: Date;
  };
}

// Interface with extends
interface BaseEntity {
  id: string;
  createdAt: Date;
}

interface ExtendedUser extends BaseEntity {
  name: string;
  email: string;
}

interface ExtendedPerson extends BaseEntity {
  name: string;
  email: string;
}
