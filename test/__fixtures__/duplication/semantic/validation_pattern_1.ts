// Semantic duplication: Early return validation pattern
// Common validation logic using early returns
export function validateUserRegistration(data: any): ValidationResult {
  if (!data.email) {
    return { valid: false, error: 'Email is required' };
  }
  
  if (!isValidEmail(data.email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (!data.password) {
    return { valid: false, error: 'Password is required' };
  }
  
  if (data.password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (!data.username) {
    return { valid: false, error: 'Username is required' };
  }
  
  if (data.username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  return { valid: true };
}

export function validateProductCreation(data: any): ValidationResult {
  if (!data.name) {
    return { valid: false, error: 'Product name is required' };
  }
  
  if (data.name.length < 3) {
    return { valid: false, error: 'Product name must be at least 3 characters' };
  }
  
  if (!data.price) {
    return { valid: false, error: 'Price is required' };
  }
  
  if (typeof data.price !== 'number' || data.price <= 0) {
    return { valid: false, error: 'Price must be a positive number' };
  }
  
  if (!data.category) {
    return { valid: false, error: 'Category is required' };
  }
  
  if (!['electronics', 'clothing', 'food', 'other'].includes(data.category)) {
    return { valid: false, error: 'Invalid category' };
  }
  
  return { valid: true };
}

// Helper
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}