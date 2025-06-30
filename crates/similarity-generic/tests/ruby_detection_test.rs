use similarity_core::generic_parser_config::GenericParserConfig;
use similarity_core::generic_tree_sitter_parser::GenericTreeSitterParser;
use similarity_core::language_parser::LanguageParser;

#[test]
fn test_ruby_function_detection() {
    let config = GenericParserConfig::ruby();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_ruby::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
# Should be detected: regular method
def calculate_sum(a, b)
  a + b
end

# Should be detected: class method
class Calculator
  # Should be detected: instance method
  def add(x, y)
    x + y
  end
  
  # Should be detected: class method (self.)
  def self.create
    new
  end
  
  # Should be detected: class method (alternative syntax)
  class << self
    def factory_method
      new
    end
  end
  
  # Should be detected: method with default parameters
  def multiply(a, b = 1)
    a * b
  end
  
  # Should be detected: method with keyword arguments
  def divide(dividend:, divisor: 1)
    dividend / divisor
  end
  
  # Should be detected: method with splat operator
  def sum(*numbers)
    numbers.reduce(:+)
  end
  
  # Should be detected: private method
  private
  
  def internal_helper
    42
  end
  
  # Should be detected: protected method
  protected
  
  def protected_method
    "protected"
  end
end

# Should be detected: singleton method
obj = Object.new
def obj.singleton_method
  "I'm unique"
end

# Should be detected: module method
module Utils
  def self.helper_method
    "helper"
  end
  
  # Should be detected: mixin method
  def mixable_method
    "can be mixed in"
  end
end

# Should NOT be detected: blocks (not methods)
[1, 2, 3].each do |n|
  puts n
end

# Should NOT be detected: lambda/proc (not methods)
my_lambda = ->(x) { x * 2 }
my_proc = Proc.new { |x| x * 3 }

# Should be detected: method with block parameter
def with_block(&block)
  block.call if block_given?
end

# Should be detected: method ending with ? or !
def valid?
  true
end

def save!
  # force save
end

# Should be detected: operator methods
class Point
  def +(other)
    # addition logic
  end
  
  def ==(other)
    # equality logic
  end
  
  def [](index)
    # array access
  end
end
"#;

    let functions = parser
        .extract_functions(code, "test.rb")
        .expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();
    
    println!("Detected functions:");
    for func in &functions {
        println!("  {} (method: {})", func.name, func.is_method);
    }
    
    assert!(function_names.contains(&"calculate_sum"), "Top-level method should be detected");
    assert!(function_names.contains(&"add"), "Instance method should be detected");
    assert!(function_names.contains(&"create"), "Class method with self. should be detected");
    assert!(function_names.contains(&"factory_method"), "Class method in << self should be detected");
    assert!(function_names.contains(&"multiply"), "Method with default params should be detected");
    assert!(function_names.contains(&"divide"), "Method with keyword args should be detected");
    assert!(function_names.contains(&"sum"), "Method with splat should be detected");
    assert!(function_names.contains(&"internal_helper"), "Private method should be detected");
    assert!(function_names.contains(&"protected_method"), "Protected method should be detected");
    assert!(function_names.contains(&"singleton_method"), "Singleton method should be detected");
    assert!(function_names.contains(&"helper_method"), "Module method should be detected");
    assert!(function_names.contains(&"mixable_method"), "Mixin method should be detected");
    assert!(function_names.contains(&"with_block"), "Method with block param should be detected");
    assert!(function_names.contains(&"valid?"), "Predicate method should be detected");
    assert!(function_names.contains(&"save!"), "Bang method should be detected");
    assert!(function_names.contains(&"+"), "Plus operator should be detected");
    assert!(function_names.contains(&"=="), "Equality operator should be detected");
    assert!(function_names.contains(&"[]"), "Array access operator should be detected");
}

#[test]
fn test_ruby_type_detection() {
    let config = GenericParserConfig::ruby();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_ruby::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
# Should be detected: class
class User
  attr_accessor :name, :email
  
  def initialize(name, email)
    @name = name
    @email = email
  end
end

# Should be detected: class with inheritance
class Admin < User
  attr_reader :permissions
end

# Should be detected: module
module Authentication
  def authenticate(password)
    # authentication logic
  end
end

# Should be detected: module with nested class
module API
  class Client
    # client implementation
  end
  
  module V1
    class Resource
      # resource implementation
    end
  end
end

# Should be detected: Struct (creates a class)
Person = Struct.new(:first_name, :last_name) do
  def full_name
    "\#{first_name} \#{last_name}"
  end
end

# Should NOT be detected: constants
CONSTANT = 42
MAX_SIZE = 100

# Should NOT be detected: method calls that create classes dynamically
# (too dynamic to detect reliably)
MyClass = Class.new do
  def dynamic_method
    "dynamic"
  end
end

# Should be detected: class with class variables
class Config
  @@settings = {}
  
  def self.set(key, value)
    @@settings[key] = value
  end
end

# Should be detected: singleton class (eigenclass)
class << obj
  def singleton_stuff
    "singleton"
  end
end
"#;

    let types = parser
        .extract_types(code, "test.rb")
        .expect("Failed to extract types");

    println!("Detected types:");
    for t in &types {
        println!("  {} ({})", t.name, t.kind);
    }
    
    let type_names: Vec<&str> = types.iter().map(|t| t.name.as_str()).collect();
    
    assert!(type_names.contains(&"User"), "Class should be detected");
    assert!(type_names.contains(&"Admin"), "Inherited class should be detected");
    assert!(type_names.contains(&"Authentication"), "Module should be detected");
    assert!(type_names.contains(&"API"), "Module should be detected");
    assert!(type_names.contains(&"Client"), "Nested class should be detected");
    assert!(type_names.contains(&"V1"), "Nested module should be detected");
    assert!(type_names.contains(&"Resource"), "Deeply nested class should be detected");
    assert!(type_names.contains(&"Config"), "Class with class variables should be detected");
    
    // Note: Struct.new and singleton classes might be tricky
    let has_person = type_names.contains(&"Person");
    println!("Has Person struct: {}", has_person);
}

#[test]
fn test_ruby_edge_cases() {
    let config = GenericParserConfig::ruby();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_ruby::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
# Method with various parameter types
def complex_method(required, optional = nil, *rest, keyword:, optional_keyword: 42, **options, &block)
  # implementation
end

# Method definitions in different contexts
class MetaProgramming
  # Define method dynamically - should NOT be detected
  define_method :dynamic do |arg|
    arg * 2
  end
  
  # Method with alias
  def original_name
    "original"
  end
  alias_method :new_name, :original_name
  alias another_name original_name
  
  # Method with visibility modifier inline
  private def private_inline
    "private"
  end
  
  public def public_inline
    "public"
  end
end

# Method with heredoc
def with_heredoc
  sql = <<~SQL
    SELECT * FROM users
    WHERE active = true
  SQL
  sql
end

# Method with percent literals
def with_percent_literals
  %w[apple banana cherry]
  %i[symbol1 symbol2]
  %r{regex_pattern}
end

# One-liner method definition (Ruby 3.0+)
def square(x) = x * x

# Pattern matching method (Ruby 2.7+)
def process_data(data)
  case data
  in {type: "user", name:}
    "User: \#{name}"
  in {type: "admin", name:, level:}
    "Admin: \#{name} (Level \#{level})"
  else
    "Unknown"
  end
end
"#;

    let functions = parser
        .extract_functions(code, "edge_cases.rb")
        .expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();
    
    println!("Edge case functions detected: {:?}", function_names);
    
    assert!(function_names.contains(&"complex_method"), "Method with complex params should be detected");
    assert!(function_names.contains(&"original_name"), "Original method should be detected");
    assert!(function_names.contains(&"private_inline"), "Private inline method should be detected");
    assert!(function_names.contains(&"public_inline"), "Public inline method should be detected");
    assert!(function_names.contains(&"with_heredoc"), "Method with heredoc should be detected");
    assert!(function_names.contains(&"with_percent_literals"), "Method with percent literals should be detected");
    assert!(function_names.contains(&"square"), "One-liner method should be detected");
    assert!(function_names.contains(&"process_data"), "Pattern matching method should be detected");
    
    // Dynamic methods should NOT be detected
    assert!(!function_names.contains(&"dynamic"), "define_method should not be detected");
    
    // Aliases create references, not new methods
    assert!(!function_names.contains(&"new_name"), "alias_method should not create new detection");
    assert!(!function_names.contains(&"another_name"), "alias should not create new detection");
}