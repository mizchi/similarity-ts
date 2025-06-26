use similarity_ts_core::language_parser::{Language, ParserFactory};
use similarity_ts_core::apted::{compute_edit_distance, APTEDOptions};

#[test]
fn test_python_function_extraction() {
    let source = r#"
def hello(name):
    """Say hello to someone."""
    return f"Hello, {name}!"

def greet(name):
    """Greet someone."""
    return f"Hi, {name}!"

class Greeter:
    def __init__(self, prefix="Hello"):
        self.prefix = prefix
    
    def greet(self, name):
        return f"{self.prefix}, {name}!"
    
    def say_goodbye(self, name):
        return f"Goodbye, {name}!"
"#;

    let mut parser = ParserFactory::create_parser(Language::Python).unwrap();
    let functions = parser.extract_functions(source, "test.py").unwrap();
    
    assert_eq!(functions.len(), 5);
    assert_eq!(functions[0].name, "hello");
    assert_eq!(functions[1].name, "greet");
    assert_eq!(functions[2].name, "__init__");
    assert_eq!(functions[3].name, "greet");
    assert_eq!(functions[4].name, "say_goodbye");
    
    // Check method detection
    assert!(!functions[0].is_method);
    assert!(!functions[1].is_method);
    assert!(functions[2].is_method);
    assert!(functions[3].is_method);
    assert!(functions[4].is_method);
    
    // Check class names
    assert_eq!(functions[2].class_name, Some("Greeter".to_string()));
    assert_eq!(functions[3].class_name, Some("Greeter".to_string()));
    assert_eq!(functions[4].class_name, Some("Greeter".to_string()));
}

#[test]
fn test_python_type_extraction() {
    let source = r#"
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email

class Admin(User):
    def __init__(self, name, email, level):
        super().__init__(name, email)
        self.level = level

class Guest:
    pass
"#;

    let mut parser = ParserFactory::create_parser(Language::Python).unwrap();
    let types = parser.extract_types(source, "test.py").unwrap();
    
    assert_eq!(types.len(), 3);
    assert_eq!(types[0].name, "User");
    assert_eq!(types[1].name, "Admin");
    assert_eq!(types[2].name, "Guest");
}

#[test]
fn test_python_similar_functions() {
    let source1 = r#"
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
"#;

    let source2 = r#"
def fact(num):
    if num <= 1:
        return 1
    return num * fact(num - 1)

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
"#;

    let mut parser = ParserFactory::create_parser(Language::Python).unwrap();
    
    let tree1 = parser.parse(source1, "file1.py").unwrap();
    let tree2 = parser.parse(source2, "file2.py").unwrap();
    
    let options = APTEDOptions {
        insert_cost: 1.0,
        delete_cost: 1.0,
        rename_cost: 1.0,
    };
    
    let distance = compute_edit_distance(&tree1, &tree2, &options);
    let max_size = tree1.get_subtree_size().max(tree2.get_subtree_size()) as f64;
    let similarity = 1.0 - (distance / max_size);
    
    // These are very similar functions, should have high similarity
    assert!(similarity > 0.7, "Similarity {} is too low", similarity);
}

#[test]
fn test_python_class_methods_similarity() {
    let source1 = r#"
class Calculator:
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b
    
    def multiply(self, a, b):
        return a * b
"#;

    let source2 = r#"
class Calc:
    def add(self, x, y):
        return x + y
    
    def sub(self, x, y):
        return x - y
    
    def mul(self, x, y):
        return x * y
"#;

    let mut parser = ParserFactory::create_parser(Language::Python).unwrap();
    
    let funcs1 = parser.extract_functions(source1, "calc1.py").unwrap();
    let funcs2 = parser.extract_functions(source2, "calc2.py").unwrap();
    
    assert_eq!(funcs1.len(), 3);
    assert_eq!(funcs2.len(), 3);
    
    // All should be methods
    assert!(funcs1.iter().all(|f| f.is_method));
    assert!(funcs2.iter().all(|f| f.is_method));
}

#[test]
fn test_python_decorators() {
    let source = r#"
@staticmethod
def static_method():
    return "static"

@classmethod
def class_method(cls):
    return "class"

@property
def prop(self):
    return self._value

class Example:
    @staticmethod
    def static_in_class():
        return "static in class"
    
    @property
    def value(self):
        return self._value
"#;

    let mut parser = ParserFactory::create_parser(Language::Python).unwrap();
    let functions = parser.extract_functions(source, "test.py").unwrap();
    
    // Should extract all functions including decorated ones
    assert_eq!(functions.len(), 5);
    assert_eq!(functions[0].name, "static_method");
    assert_eq!(functions[1].name, "class_method");
    assert_eq!(functions[2].name, "prop");
    assert_eq!(functions[3].name, "static_in_class");
    assert_eq!(functions[4].name, "value");
}

#[test]
fn test_python_nested_functions() {
    let source = r#"
def outer(x):
    def inner(y):
        return x + y
    return inner

def create_adder(n):
    def adder(x):
        return x + n
    return adder

class Factory:
    def create_multiplier(self, n):
        def multiplier(x):
            return x * n
        return multiplier
"#;

    let mut parser = ParserFactory::create_parser(Language::Python).unwrap();
    let functions = parser.extract_functions(source, "test.py").unwrap();
    
    // Should extract all functions including nested ones
    assert!(functions.len() >= 3); // At least outer, create_adder, and create_multiplier
    
    let outer_funcs: Vec<_> = functions.iter()
        .filter(|f| ["outer", "create_adder", "create_multiplier"].contains(&f.name.as_str()))
        .collect();
    assert_eq!(outer_funcs.len(), 3);
}

#[test]
fn test_python_lambda_functions() {
    let source = r#"
add = lambda x, y: x + y
multiply = lambda x, y: x * y

def high_order(f):
    return lambda x: f(x, x)

square = high_order(multiply)
"#;

    let mut parser = ParserFactory::create_parser(Language::Python).unwrap();
    let functions = parser.extract_functions(source, "test.py").unwrap();
    
    // Should at least find the regular function
    assert!(functions.iter().any(|f| f.name == "high_order"));
}

#[test]
fn test_cross_language_similarity() {
    let js_code = r#"
function add(a, b) {
    return a + b;
}

class Calculator {
    multiply(x, y) {
        return x * y;
    }
}
"#;

    let py_code = r#"
def add(a, b):
    return a + b

class Calculator:
    def multiply(self, x, y):
        return x * y
"#;

    let mut js_parser = ParserFactory::create_parser(Language::JavaScript).unwrap();
    let mut py_parser = ParserFactory::create_parser(Language::Python).unwrap();
    
    let js_funcs = js_parser.extract_functions(js_code, "test.js").unwrap();
    let py_funcs = py_parser.extract_functions(py_code, "test.py").unwrap();
    
    // Both should have 2 functions
    assert_eq!(js_funcs.len(), 2);
    assert_eq!(py_funcs.len(), 2);
    
    // Both should have 'add' and 'multiply' functions
    assert!(js_funcs.iter().any(|f| f.name == "add"));
    assert!(js_funcs.iter().any(|f| f.name == "multiply"));
    assert!(py_funcs.iter().any(|f| f.name == "add"));
    assert!(py_funcs.iter().any(|f| f.name == "multiply"));
}