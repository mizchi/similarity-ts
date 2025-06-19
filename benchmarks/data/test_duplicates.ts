// Test file with various function sizes

// Small function (likely < 20 tokens)
function tiny(x: number) {
  return x + 1;
}

// Another small function  
function small(y: number) {
  return y + 1;
}

// Medium function (~25-30 tokens)
function processUser(user: { id: string; name: string; age: number }) {
  if (!user.id) {
    throw new Error('Invalid user');
  }
  const result = {
    userId: user.id,
    displayName: user.name.toUpperCase(),
    ageGroup: user.age >= 18 ? 'adult' : 'minor'
  };
  return result;
}

// Similar medium function
function processCustomer(customer: { id: string; name: string; age: number }) {
  if (!customer.id) {
    throw new Error('Invalid customer');
  }
  const result = {
    customerId: customer.id,
    displayName: customer.name.toUpperCase(),
    ageGroup: customer.age >= 18 ? 'adult' : 'minor'
  };
  return result;
}

// Larger function (> 30 tokens)
function calculateStatistics(numbers: number[]) {
  if (numbers.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0 };
  }
  
  let min = numbers[0];
  let max = numbers[0];
  let sum = 0;
  
  for (const num of numbers) {
    if (num < min) min = num;
    if (num > max) max = num;
    sum += num;
  }
  
  return {
    min,
    max,
    avg: sum / numbers.length,
    sum
  };
}

// Similar larger function
function computeStatistics(values: number[]) {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0 };
  }
  
  let min = values[0];
  let max = values[0];
  let sum = 0;
  
  for (const val of values) {
    if (val < min) min = val;
    if (val > max) max = val;
    sum += val;
  }
  
  return {
    min,
    max,
    avg: sum / values.length,
    sum
  };
}