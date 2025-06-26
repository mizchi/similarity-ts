# Example Python file with duplicate functions

def process_data(data):
    """Process data and return result."""
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result

def transform_data(data):
    """Transform data and return result."""
    output = []
    for element in data:
        if element > 0:
            output.append(element * 2)
    return output

class DataProcessor:
    def __init__(self):
        self.cache = {}
    
    def process(self, data):
        result = []
        for item in data:
            if item > 0:
                result.append(item * 2)
        return result
    
    def transform(self, data):
        output = []
        for element in data:
            if element > 0:
                output.append(element * 2)
        return output

# Another duplicate with slight variations
def filter_and_double(items):
    """Filter positive numbers and double them."""
    filtered = []
    for i in items:
        if i > 0:
            filtered.append(i * 2)
    return filtered

class NumberProcessor:
    def process_numbers(self, numbers):
        processed = []
        for num in numbers:
            if num > 0:
                processed.append(num * 2)
        return processed