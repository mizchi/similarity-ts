// Semantic duplication: Redux-style state management
// Common state management pattern using reducer
export interface AppState {
  user: UserState;
  products: ProductState;
  cart: CartState;
}

export interface UserState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface ProductState {
  items: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;
  error: string | null;
}

export interface CartState {
  items: CartItem[];
  total: number;
}

// User reducer
export function userReducer(state: UserState = initialUserState, action: Action): UserState {
  switch (action.type) {
    case 'USER_LOGIN_START':
      return { ...state, isLoading: true, error: null };
    
    case 'USER_LOGIN_SUCCESS':
      return { ...state, currentUser: action.payload, isLoading: false };
    
    case 'USER_LOGIN_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'USER_LOGOUT':
      return { ...state, currentUser: null };
    
    case 'USER_UPDATE':
      return { 
        ...state, 
        currentUser: state.currentUser 
          ? { ...state.currentUser, ...action.payload }
          : null 
      };
    
    default:
      return state;
  }
}

// Product reducer
export function productReducer(state: ProductState = initialProductState, action: Action): ProductState {
  switch (action.type) {
    case 'PRODUCTS_FETCH_START':
      return { ...state, isLoading: true, error: null };
    
    case 'PRODUCTS_FETCH_SUCCESS':
      return { ...state, items: action.payload, isLoading: false };
    
    case 'PRODUCTS_FETCH_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'PRODUCT_SELECT':
      return { ...state, selectedProduct: action.payload };
    
    case 'PRODUCT_ADD':
      return { ...state, items: [...state.items, action.payload] };
    
    case 'PRODUCT_UPDATE':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        )
      };
    
    case 'PRODUCT_DELETE':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
    
    default:
      return state;
  }
}

// Cart reducer
export function cartReducer(state: CartState = initialCartState, action: Action): CartState {
  switch (action.type) {
    case 'CART_ADD_ITEM':
      const existingItem = state.items.find(item => item.productId === action.payload.productId);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.productId === action.payload.productId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
          total: calculateTotal(state.items)
        };
      }
      return {
        ...state,
        items: [...state.items, action.payload],
        total: calculateTotal([...state.items, action.payload])
      };
    
    case 'CART_REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.productId !== action.payload),
        total: calculateTotal(state.items.filter(item => item.productId !== action.payload))
      };
    
    case 'CART_UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.productId === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
        total: calculateTotal(state.items)
      };
    
    case 'CART_CLEAR':
      return initialCartState;
    
    default:
      return state;
  }
}

// Helper functions
function calculateTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Initial states
const initialUserState: UserState = {
  currentUser: null,
  isLoading: false,
  error: null
};

const initialProductState: ProductState = {
  items: [],
  selectedProduct: null,
  isLoading: false,
  error: null
};

const initialCartState: CartState = {
  items: [],
  total: 0
};

// Types
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

interface Action {
  type: string;
  payload?: any;
}