# Python helper functions

def process_data(data):
    """Process data and return result."""
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result

def calculate_sum(numbers):
    """Calculate sum of numbers."""
    total = 0
    for num in numbers:
        total += num
    return total

class DataHelper:
    def __init__(self):
        self.data = []
    
    def process(self, data):
        result = []
        for item in data:
            if item > 0:
                result.append(item * 2)
        return result
    
    def sum(self, numbers):
        total = 0
        for n in numbers:
            total += n
        return total