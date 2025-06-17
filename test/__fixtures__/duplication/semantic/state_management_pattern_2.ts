// Semantic duplication: Class-based state management
// Same functionality as pattern_1 but using OOP approach
export class StateManager {
  private state: AppState;
  private subscribers: Array<(state: AppState) => void> = [];

  constructor() {
    this.state = {
      user: new UserStore(),
      products: new ProductStore(),
      cart: new CartStore()
    };
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(callback: (state: AppState) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach(callback => callback(this.state));
  }
}

export class UserStore {
  currentUser: User | null = null;
  isLoading: boolean = false;
  error: string | null = null;

  loginStart(): void {
    this.isLoading = true;
    this.error = null;
  }

  loginSuccess(user: User): void {
    this.currentUser = user;
    this.isLoading = false;
  }

  loginError(error: string): void {
    this.error = error;
    this.isLoading = false;
  }

  logout(): void {
    this.currentUser = null;
  }

  updateUser(updates: Partial<User>): void {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...updates };
    }
  }
}

export class ProductStore {
  items: Product[] = [];
  selectedProduct: Product | null = null;
  isLoading: boolean = false;
  error: string | null = null;

  fetchStart(): void {
    this.isLoading = true;
    this.error = null;
  }

  fetchSuccess(products: Product[]): void {
    this.items = products;
    this.isLoading = false;
  }

  fetchError(error: string): void {
    this.error = error;
    this.isLoading = false;
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
  }

  addProduct(product: Product): void {
    this.items.push(product);
  }

  updateProduct(id: string, updates: Partial<Product>): void {
    this.items = this.items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
  }

  deleteProduct(id: string): void {
    this.items = this.items.filter(item => item.id !== id);
  }
}

export class CartStore {
  items: CartItem[] = [];
  total: number = 0;

  addItem(item: CartItem): void {
    const existingItem = this.items.find(i => i.productId === item.productId);
    
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      this.items.push(item);
    }
    
    this.updateTotal();
  }

  removeItem(productId: string): void {
    this.items = this.items.filter(item => item.productId !== productId);
    this.updateTotal();
  }

  updateQuantity(productId: string, quantity: number): void {
    const item = this.items.find(i => i.productId === productId);
    if (item) {
      item.quantity = quantity;
      this.updateTotal();
    }
  }

  clear(): void {
    this.items = [];
    this.total = 0;
  }

  private updateTotal(): void {
    this.total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
}

// Types (same as pattern_1)
interface AppState {
  user: UserStore;
  products: ProductStore;
  cart: CartStore;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}