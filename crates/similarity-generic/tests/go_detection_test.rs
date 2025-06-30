use similarity_core::generic_parser_config::GenericParserConfig;
use similarity_core::generic_tree_sitter_parser::GenericTreeSitterParser;
use similarity_core::language_parser::LanguageParser;

#[test]
fn test_go_function_detection() {
    let config = GenericParserConfig::go();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_go::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
package main

// Should be detected: regular function
func regularFunction(x int) int {
    return x * 2
}

// Should be detected: method
type Calculator struct{}

func (c Calculator) Add(a, b int) int {
    return a + b
}

// Should be detected: function with multiple parameters and returns
func multipleReturns(x, y int) (int, error) {
    return x + y, nil
}

// Should be detected: anonymous function assigned to variable
var anonymousFunc = func(x int) int {
    return x * 3
}

// Should NOT be detected: function type definition
type HandlerFunc func(int) int

// Should NOT be detected: interface method declaration
type Processor interface {
    Process(data []byte) error
}

// Should be detected: Test function
func TestSomething(t *testing.T) {
    // test code
}

// Should be detected: Benchmark function
func BenchmarkSomething(b *testing.B) {
    // benchmark code
}
"#;

    let functions = parser
        .extract_functions(code, "test.go")
        .expect("Failed to extract functions");

    // Check that expected functions are detected
    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();
    
    assert!(function_names.contains(&"regularFunction"), "regularFunction should be detected");
    assert!(function_names.contains(&"Add"), "Method Add should be detected");
    assert!(function_names.contains(&"multipleReturns"), "multipleReturns should be detected");
    assert!(function_names.contains(&"TestSomething"), "Test function should be detected");
    assert!(function_names.contains(&"BenchmarkSomething"), "Benchmark function should be detected");
    
    // Check that non-functions are not detected
    assert!(!function_names.contains(&"HandlerFunc"), "Type definitions should not be detected");
    assert!(!function_names.contains(&"Process"), "Interface methods should not be detected");
    
    // Anonymous functions are tricky - they might not have a name
    // So we check the count instead
    assert_eq!(functions.len(), 5, "Should detect exactly 5 functions");
}

#[test]
fn test_go_type_detection() {
    let config = GenericParserConfig::go();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_go::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
package main

// Should be detected: struct type
type User struct {
    Name string
    Age  int
}

// Should be detected: interface type
type Writer interface {
    Write([]byte) (int, error)
}

// Should be detected: type alias
type ID int

// Should be detected: function type (as type declaration)
type Handler func(http.ResponseWriter, *http.Request)

// Should NOT be detected: variable declarations
var globalVar = 42

// Should NOT be detected: const declarations
const MaxSize = 1024
"#;

    let types = parser
        .extract_types(code, "test.go")
        .expect("Failed to extract types");

    // Debug: print what we actually detected
    println!("Detected types:");
    for t in &types {
        println!("  {} ({})", t.name, t.kind);
    }

    let type_names: Vec<&str> = types.iter().map(|t| t.name.as_str()).collect();
    
    assert!(type_names.contains(&"User"), "Struct type should be detected");
    assert!(type_names.contains(&"Writer"), "Interface type should be detected");
    assert!(type_names.contains(&"ID"), "Type alias should be detected");
    assert!(type_names.contains(&"Handler"), "Function type should be detected");
    
    assert!(!type_names.contains(&"globalVar"), "Variables should not be detected as types");
    assert!(!type_names.contains(&"MaxSize"), "Constants should not be detected as types");
    
    assert_eq!(types.len(), 4, "Should detect exactly 4 types");
}

#[test]
fn test_go_edge_cases() {
    let config = GenericParserConfig::go();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_go::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    // Test embedded methods
    let code = r#"
package main

type Base struct{}

func (b Base) BaseMethod() {}

type Extended struct {
    Base
}

// Should be detected: method on embedded struct
func (e Extended) ExtendedMethod() {}
"#;

    let functions = parser
        .extract_functions(code, "test.go")
        .expect("Failed to extract functions");

    assert_eq!(functions.len(), 2, "Should detect both methods");
    
    // Test generic functions (Go 1.18+)
    let generic_code = r#"
package main

// Should be detected: generic function
func Map[T any, U any](slice []T, f func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = f(v)
    }
    return result
}

// Should be detected: generic type
type List[T any] struct {
    items []T
}

// Should be detected: method on generic type
func (l List[T]) Add(item T) {
    l.items = append(l.items, item)
}
"#;

    let functions = parser
        .extract_functions(generic_code, "test.go")
        .expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();
    assert!(function_names.contains(&"Map"), "Generic function should be detected");
    assert!(function_names.contains(&"Add"), "Method on generic type should be detected");
}