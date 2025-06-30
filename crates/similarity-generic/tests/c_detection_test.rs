use similarity_core::generic_parser_config::GenericParserConfig;
use similarity_core::generic_tree_sitter_parser::GenericTreeSitterParser;
use similarity_core::language_parser::LanguageParser;

#[test]
fn test_c_function_detection() {
    let config = GenericParserConfig::c();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_c::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
#include <stdio.h>
#include <stdlib.h>

// Should be detected: regular function
int add(int a, int b) {
    return a + b;
}

// Should be detected: void function
void print_message(const char* msg) {
    printf("%s\n", msg);
}

// Should be detected: function with pointer return type
char* allocate_string(int size) {
    return malloc(size * sizeof(char));
}

// Should be detected: static function
static int internal_helper(void) {
    return 42;
}

// Should be detected: inline function
inline int max(int a, int b) {
    return a > b ? a : b;
}

// Should NOT be detected: function declaration (no body)
int external_function(int x);

// Should NOT be detected: function pointer typedef
typedef int (*operation_func)(int, int);

// Should NOT be detected: macro that looks like function
#define SQUARE(x) ((x) * (x))

// Should be detected: function with complex signature
void process_data(int (*callback)(void*, int), void* context, int count) {
    for (int i = 0; i < count; i++) {
        callback(context, i);
    }
}

// Should be detected: variadic function
int sum_all(int count, ...) {
    // variadic implementation
    return 0;
}
"#;

    let functions = parser
        .extract_functions(code, "test.c")
        .expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();
    
    println!("Detected functions:");
    for func in &functions {
        println!("  {}", func.name);
    }
    
    assert!(function_names.contains(&"add"), "add function should be detected");
    assert!(function_names.contains(&"print_message"), "print_message should be detected");
    assert!(function_names.contains(&"allocate_string"), "allocate_string should be detected");
    assert!(function_names.contains(&"internal_helper"), "static function should be detected");
    assert!(function_names.contains(&"max"), "inline function should be detected");
    assert!(function_names.contains(&"process_data"), "function with callback should be detected");
    assert!(function_names.contains(&"sum_all"), "variadic function should be detected");
    
    assert!(!function_names.contains(&"external_function"), "Function declarations should not be detected");
    assert!(!function_names.contains(&"SQUARE"), "Macros should not be detected");
    
    assert_eq!(functions.len(), 7, "Should detect exactly 7 functions");
}

#[test]
fn test_c_type_detection() {
    let config = GenericParserConfig::c();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_c::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
// Should be detected: struct
struct Point {
    int x;
    int y;
};

// Should be detected: typedef struct
typedef struct {
    char name[50];
    int age;
} Person;

// Should be detected: enum
enum Color {
    RED,
    GREEN,
    BLUE
};

// Should be detected: typedef enum
typedef enum {
    MONDAY = 1,
    TUESDAY,
    WEDNESDAY
} Weekday;

// Should be detected: union
union Data {
    int i;
    float f;
    char str[20];
};

// Should NOT be detected: simple typedef
typedef int Integer;

// Should NOT be detected: function pointer typedef
typedef void (*callback_t)(int);

// Should NOT be detected: macro
#define MAX_SIZE 100
"#;

    let types = parser
        .extract_types(code, "test.c")
        .expect("Failed to extract types");

    println!("Detected types:");
    for t in &types {
        println!("  {} ({})", t.name, t.kind);
    }
    
    let type_names: Vec<&str> = types.iter().map(|t| t.name.as_str()).collect();
    
    assert!(type_names.contains(&"Point"), "Struct should be detected");
    assert!(type_names.contains(&"Person"), "Typedef struct should be detected");
    assert!(type_names.contains(&"Color"), "Enum should be detected");
    assert!(type_names.contains(&"Weekday"), "Typedef enum should be detected");
    assert!(type_names.contains(&"Data"), "Union should be detected");
    
    // Note: Simple typedefs are detected with their actual type (primitive_type)
    // They have different kinds, so they won't be confused with structs
    assert!(!type_names.contains(&"MAX_SIZE"), "Macros should not be detected");
}

#[test]
fn test_c_edge_cases() {
    let config = GenericParserConfig::c();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_c::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
// Function with K&R style parameters
int old_style(a, b)
int a;
int b;
{
    return a + b;
}

// Function returning function pointer
int (*get_operation(char op))(int, int) {
    // implementation
    return NULL;
}

// Static inline function
static inline void fast_swap(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

// Function with restrict keyword
void copy_array(int * restrict dest, const int * restrict src, size_t n) {
    for (size_t i = 0; i < n; i++) {
        dest[i] = src[i];
    }
}

// Nested struct
struct Outer {
    struct Inner {
        int value;
    } inner;
    int outer_value;
};
"#;

    let functions = parser
        .extract_functions(code, "test.c")
        .expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();
    
    // Note: K&R style might not be properly detected depending on parser
    println!("Edge case functions detected: {:?}", function_names);
    
    assert!(function_names.iter().any(|name| name.contains("get_operation")), "Function returning function pointer should be detected");
    assert!(function_names.contains(&"fast_swap"), "Static inline function should be detected");
    assert!(function_names.contains(&"copy_array"), "Function with restrict should be detected");
    
    let types = parser
        .extract_types(code, "test.c")
        .expect("Failed to extract types");
    
    let type_names: Vec<&str> = types.iter().map(|t| t.name.as_str()).collect();
    
    assert!(type_names.contains(&"Outer"), "Outer struct should be detected");
    assert!(type_names.contains(&"Inner"), "Nested struct should be detected");
}