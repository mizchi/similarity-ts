def calculate_factorial(n):
    """Calculate factorial of a number."""
    if n <= 1:
        return 1
    return n * calculate_factorial(n - 1)

def calculate_fibonacci(n):
    """Calculate fibonacci number."""
    if n <= 1:
        return n
    return calculate_fibonacci(n - 1) + calculate_fibonacci(n - 2)

class MathUtils:
    def __init__(self):
        self.cache = {}
    
    def factorial(self, n):
        if n in self.cache:
            return self.cache[n]
        
        if n <= 1:
            result = 1
        else:
            result = n * self.factorial(n - 1)
        
        self.cache[n] = result
        return result
    
    def fibonacci(self, n):
        if n <= 1:
            return n
        return self.fibonacci(n - 1) + self.fibonacci(n - 2)

class Calculator:
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b
    
    def multiply(self, a, b):
        return a * b
    
    def divide(self, a, b):
        if b != 0:
            return a / b
        raise ValueError("Cannot divide by zero")