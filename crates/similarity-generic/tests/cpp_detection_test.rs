use similarity_core::generic_parser_config::GenericParserConfig;
use similarity_core::generic_tree_sitter_parser::GenericTreeSitterParser;
use similarity_core::language_parser::LanguageParser;

#[test]
fn test_cpp_function_detection() {
    let config = GenericParserConfig::cpp();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_cpp::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
#include <iostream>
#include <vector>

// Should be detected: regular function
int add(int a, int b) {
    return a + b;
}

// Should be detected: class method
class Calculator {
public:
    // Should be detected: public method
    int multiply(int a, int b) {
        return a * b;
    }
    
    // Should be detected: const method
    int getValue() const {
        return value;
    }
    
    // Should be detected: virtual method
    virtual void process() {
        // implementation
    }
    
    // Should be detected: constructor
    Calculator() : value(0) {}
    
    // Should be detected: destructor
    ~Calculator() {}
    
    // Should be detected: operator overload
    Calculator operator+(const Calculator& other) {
        Calculator result;
        result.value = this->value + other.value;
        return result;
    }
    
private:
    int value;
};

// Should be detected: template function
template<typename T>
T max(T a, T b) {
    return a > b ? a : b;
}

// Should be detected: lambda (as variable)
auto lambda = [](int x) -> int {
    return x * 2;
};

// Should NOT be detected: function declaration
void external_function();

// Should be detected: namespace function
namespace Utils {
    void print(const std::string& msg) {
        std::cout << msg << std::endl;
    }
}

// Should be detected: friend function
class Point {
    friend std::ostream& operator<<(std::ostream& os, const Point& p) {
        os << "(" << p.x << ", " << p.y << ")";
        return os;
    }
    int x, y;
};
"#;

    let functions =
        parser.extract_functions(code, "test.cpp").expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();

    println!("Detected functions:");
    for func in &functions {
        println!("  {} (method: {})", func.name, func.is_method);
    }

    assert!(function_names.contains(&"add"), "add function should be detected");
    assert!(function_names.contains(&"multiply"), "multiply method should be detected");
    assert!(function_names.contains(&"getValue"), "const method should be detected");
    assert!(function_names.contains(&"process"), "virtual method should be detected");
    assert!(function_names.contains(&"Calculator"), "Constructor should be detected");
    assert!(function_names.contains(&"~Calculator"), "Destructor should be detected");
    assert!(function_names.contains(&"operator+"), "Operator overload should be detected");
    assert!(function_names.contains(&"max"), "Template function should be detected");
    assert!(function_names.contains(&"print"), "Namespace function should be detected");
    assert!(
        function_names.iter().any(|n| n.contains("operator<<")),
        "Friend function should be detected"
    );

    assert!(
        !function_names.contains(&"external_function"),
        "Function declarations should not be detected"
    );
}

#[test]
fn test_cpp_type_detection() {
    let config = GenericParserConfig::cpp();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_cpp::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
// Should be detected: class
class Shape {
public:
    virtual double area() = 0;
};

// Should be detected: struct (public by default)
struct Point {
    double x, y;
};

// Should be detected: enum
enum Color {
    RED,
    GREEN,
    BLUE
};

// Should be detected: enum class (C++11)
enum class Direction {
    NORTH,
    SOUTH,
    EAST,
    WEST
};

// Should be detected: union
union Data {
    int i;
    float f;
    char str[20];
};

// Should be detected: template class
template<typename T>
class Container {
    T* data;
    size_t size;
};

// Should be detected: namespace
namespace Graphics {
    // Should be detected: nested class
    class Renderer {
        // implementation
    };
}

// Should NOT be detected: typedef
typedef int Integer;

// Should NOT be detected: using alias
using String = std::string;

// Should be detected: template struct
template<typename T, typename U>
struct Pair {
    T first;
    U second;
};
"#;

    let types = parser.extract_types(code, "test.cpp").expect("Failed to extract types");

    println!("Detected types:");
    for t in &types {
        println!("  {} ({})", t.name, t.kind);
    }

    let type_names: Vec<&str> = types.iter().map(|t| t.name.as_str()).collect();

    assert!(type_names.contains(&"Shape"), "Class should be detected");
    assert!(type_names.contains(&"Point"), "Struct should be detected");
    assert!(type_names.contains(&"Color"), "Enum should be detected");
    assert!(type_names.contains(&"Direction"), "Enum class should be detected");
    assert!(type_names.contains(&"Data"), "Union should be detected");
    assert!(type_names.contains(&"Container"), "Template class should be detected");
    assert!(type_names.contains(&"Renderer"), "Nested class should be detected");
    assert!(type_names.contains(&"Pair"), "Template struct should be detected");
}

#[test]
fn test_cpp_edge_cases() {
    let config = GenericParserConfig::cpp();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_cpp::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
// Should be detected: constexpr function
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

// Should be detected: noexcept function
void safe_function() noexcept {
    // guaranteed not to throw
}

// Should be detected: trailing return type
auto divide(double a, double b) -> double {
    return a / b;
}

// Should be detected: variadic template
template<typename... Args>
void print(Args... args) {
    ((std::cout << args << " "), ...);
}

// Should be detected: deleted function
class NonCopyable {
    NonCopyable(const NonCopyable&) = delete;
    NonCopyable& operator=(const NonCopyable&) = delete;
};

// Should be detected: defaulted function
class Trivial {
    Trivial() = default;
    ~Trivial() = default;
};

// Should be detected: lambda with capture
void test_lambdas() {
    int x = 10;
    // Inline lambda - might not be detected as separate function
    auto lambda1 = [x](int y) { return x + y; };
    auto lambda2 = [&x]() { x++; };
    auto lambda3 = [=]() { return x; };
}
"#;

    let functions =
        parser.extract_functions(code, "test.cpp").expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();

    println!("Edge case functions detected: {function_names:?}");

    assert!(function_names.contains(&"factorial"), "constexpr function should be detected");
    assert!(function_names.contains(&"safe_function"), "noexcept function should be detected");
    assert!(
        function_names.contains(&"divide"),
        "Function with trailing return type should be detected"
    );
    assert!(function_names.contains(&"print"), "Variadic template function should be detected");
    assert!(
        function_names.contains(&"test_lambdas"),
        "Function containing lambdas should be detected"
    );

    // Deleted and defaulted functions might have special handling
    let has_deleted =
        function_names.iter().any(|n| n.contains("NonCopyable") || n.contains("operator="));
    let has_defaulted = function_names.iter().any(|n| n.contains("Trivial"));

    println!("Has deleted functions: {has_deleted}");
    println!("Has defaulted functions: {has_defaulted}");
}
