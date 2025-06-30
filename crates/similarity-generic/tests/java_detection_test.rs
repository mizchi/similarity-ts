use similarity_core::generic_parser_config::GenericParserConfig;
use similarity_core::generic_tree_sitter_parser::GenericTreeSitterParser;
use similarity_core::language_parser::LanguageParser;

#[test]
fn test_java_function_detection() {
    let config = GenericParserConfig::java();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_java::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
public class Example {
    // Should be detected: regular method
    public int calculateSum(int a, int b) {
        return a + b;
    }
    
    // Should be detected: static method
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
    
    // Should be detected: private method
    private boolean isValid(String input) {
        return input != null && !input.isEmpty();
    }
    
    // Should be detected: constructor
    public Example() {
        // constructor body
    }
    
    // Should be detected: constructor with parameters
    public Example(String name) {
        this.name = name;
    }
    
    // Should NOT be detected: field declaration
    private String name;
    
    // Should NOT be detected: static initializer
    static {
        System.out.println("Static initializer");
    }
    
    // Should be detected: method with generic parameters
    public <T> T process(T input) {
        return input;
    }
    
    // Should be detected: test method with annotation
    @Test
    public void testSomething() {
        // test code
    }
}

// Should be detected: interface methods
interface Processor {
    // Should NOT be detected: interface method declaration (no body)
    void process(String data);
    
    // Should be detected: default method (has body)
    default void preProcess(String data) {
        System.out.println("Pre-processing: " + data);
    }
}
"#;

    let functions = parser
        .extract_functions(code, "Example.java")
        .expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();
    
    // Debug output
    println!("Detected functions:");
    for func in &functions {
        println!("  {} (method: {})", func.name, func.is_method);
    }
    
    assert!(function_names.contains(&"calculateSum"), "calculateSum should be detected");
    assert!(function_names.contains(&"main"), "main method should be detected");
    assert!(function_names.contains(&"isValid"), "isValid should be detected");
    assert!(function_names.contains(&"Example"), "Constructors should be detected");
    assert!(function_names.contains(&"process"), "Generic method should be detected");
    assert!(function_names.contains(&"testSomething"), "Test method should be detected");
    assert!(function_names.contains(&"preProcess"), "Default interface method should be detected");
    
    assert!(!function_names.contains(&"name"), "Fields should not be detected");
    
    // Check constructor count
    let constructor_count = functions.iter().filter(|f| f.name == "Example").count();
    assert_eq!(constructor_count, 2, "Should detect both constructors");
}

#[test]
fn test_java_type_detection() {
    let config = GenericParserConfig::java();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_java::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
package com.example;

// Should be detected: class
public class User {
    private String name;
    private int age;
}

// Should be detected: interface
public interface Serializable {
    byte[] serialize();
    void deserialize(byte[] data);
}

// Should be detected: enum
public enum Status {
    ACTIVE, INACTIVE, PENDING
}

// Should be detected: abstract class
public abstract class Animal {
    public abstract void makeSound();
}

// Should be detected: nested class
public class Outer {
    // Should be detected: inner class
    public class Inner {
        // inner class body
    }
    
    // Should be detected: static nested class
    public static class StaticNested {
        // static nested class body
    }
}

// Should be detected: annotation type
@interface CustomAnnotation {
    String value() default "";
}

// Should NOT be detected: method local class
class Example {
    void method() {
        // This should still be detected as it's defined in a method
        class LocalClass {
            // local class body
        }
    }
}
"#;

    let types = parser
        .extract_types(code, "Example.java")
        .expect("Failed to extract types");

    // Debug output
    println!("Detected types:");
    for t in &types {
        println!("  {} ({})", t.name, t.kind);
    }
    
    let type_names: Vec<&str> = types.iter().map(|t| t.name.as_str()).collect();
    
    assert!(type_names.contains(&"User"), "Class should be detected");
    assert!(type_names.contains(&"Serializable"), "Interface should be detected");
    assert!(type_names.contains(&"Status"), "Enum should be detected");
    assert!(type_names.contains(&"Animal"), "Abstract class should be detected");
    assert!(type_names.contains(&"Outer"), "Outer class should be detected");
    assert!(type_names.contains(&"Inner"), "Inner class should be detected");
    assert!(type_names.contains(&"StaticNested"), "Static nested class should be detected");
    assert!(type_names.contains(&"CustomAnnotation"), "Annotation type should be detected");
    assert!(type_names.contains(&"Example"), "Example class should be detected");
    assert!(type_names.contains(&"LocalClass"), "Local class should be detected");
}

#[test] 
fn test_java_edge_cases() {
    let config = GenericParserConfig::java();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_java::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    // Test lambda expressions and anonymous classes
    let code = r#"
public class LambdaTest {
    // Should be detected: method containing lambda
    public void testLambda() {
        // Lambda should not be detected as separate function
        Runnable r = () -> System.out.println("Hello");
        
        // Anonymous class methods should not be detected
        ActionListener listener = new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                System.out.println("Clicked");
            }
        };
    }
    
    // Should be detected: method with varargs
    public void printAll(String... messages) {
        for (String msg : messages) {
            System.out.println(msg);
        }
    }
    
    // Should be detected: synchronized method
    public synchronized void synchronizedMethod() {
        // thread-safe code
    }
}
"#;

    let functions = parser
        .extract_functions(code, "LambdaTest.java")
        .expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();
    
    assert!(function_names.contains(&"testLambda"), "testLambda should be detected");
    assert!(function_names.contains(&"printAll"), "Varargs method should be detected");
    assert!(function_names.contains(&"synchronizedMethod"), "Synchronized method should be detected");
    assert!(!function_names.contains(&"actionPerformed"), "Anonymous class methods should not be detected");
    
    assert_eq!(functions.len(), 3, "Should detect exactly 3 methods");
}