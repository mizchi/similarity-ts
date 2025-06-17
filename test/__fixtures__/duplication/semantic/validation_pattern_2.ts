// Semantic duplication: Rule-based validation pattern
// Same validation logic as pattern_1 but using a rule-based approach
export function validateUserRegistration(data: any): ValidationResult {
  const rules: ValidationRule[] = [
    {
      field: 'email',
      required: true,
      message: 'Email is required'
    },
    {
      field: 'email',
      validator: (value) => isValidEmail(value),
      message: 'Invalid email format'
    },
    {
      field: 'password',
      required: true,
      message: 'Password is required'
    },
    {
      field: 'password',
      minLength: 8,
      message: 'Password must be at least 8 characters'
    },
    {
      field: 'username',
      required: true,
      message: 'Username is required'
    },
    {
      field: 'username',
      minLength: 3,
      message: 'Username must be at least 3 characters'
    }
  ];
  
  return validate(data, rules);
}

export function validateProductCreation(data: any): ValidationResult {
  const rules: ValidationRule[] = [
    {
      field: 'name',
      required: true,
      message: 'Product name is required'
    },
    {
      field: 'name',
      minLength: 3,
      message: 'Product name must be at least 3 characters'
    },
    {
      field: 'price',
      required: true,
      message: 'Price is required'
    },
    {
      field: 'price',
      validator: (value) => typeof value === 'number' && value > 0,
      message: 'Price must be a positive number'
    },
    {
      field: 'category',
      required: true,
      message: 'Category is required'
    },
    {
      field: 'category',
      validator: (value) => ['electronics', 'clothing', 'food', 'other'].includes(value),
      message: 'Invalid category'
    }
  ];
  
  return validate(data, rules);
}

// Validation engine
function validate(data: any, rules: ValidationRule[]): ValidationResult {
  for (const rule of rules) {
    const value = data[rule.field];
    
    if (rule.required && !value) {
      return { valid: false, error: rule.message };
    }
    
    if (rule.minLength && value && value.length < rule.minLength) {
      return { valid: false, error: rule.message };
    }
    
    if (rule.validator && value && !rule.validator(value)) {
      return { valid: false, error: rule.message };
    }
  }
  
  return { valid: true };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  validator?: (value: any) => boolean;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}