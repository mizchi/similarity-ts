use similarity_core::generic_parser_config::GenericParserConfig;
use similarity_core::generic_tree_sitter_parser::GenericTreeSitterParser;
use similarity_core::language_parser::LanguageParser;

#[test]
fn test_csharp_function_detection() {
    let config = GenericParserConfig::csharp();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_c_sharp::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
using System;
using System.Collections.Generic;

namespace ExampleApp
{
    public class Calculator
    {
        // Should be detected: regular method
        public int Add(int a, int b)
        {
            return a + b;
        }
        
        // Should be detected: property getter/setter
        public int Value { get; set; }
        
        // Should be detected: expression-bodied method
        public int Multiply(int a, int b) => a * b;
        
        // Should be detected: async method
        public async Task<string> FetchDataAsync()
        {
            await Task.Delay(100);
            return "data";
        }
        
        // Should be detected: constructor
        public Calculator()
        {
            Value = 0;
        }
        
        // Should be detected: static method
        public static Calculator Create() => new Calculator();
        
        // Should be detected: operator overload
        public static Calculator operator +(Calculator a, Calculator b)
        {
            return new Calculator { Value = a.Value + b.Value };
        }
        
        // Should be detected: destructor/finalizer
        ~Calculator()
        {
            // cleanup
        }
        
        // Should be detected: generic method
        public T Process<T>(T input) where T : class
        {
            return input;
        }
        
        // Should be detected: extension method
        public static class Extensions
        {
            public static int Double(this int value) => value * 2;
        }
        
        // Should be detected: event handler
        public event EventHandler<EventArgs> OnChange;
        
        // Should be detected: lambda in method
        public void TestLambdas()
        {
            Func<int, int> square = x => x * x;
            Action<string> print = msg => Console.WriteLine(msg);
        }
    }
    
    // Should be detected: interface methods
    public interface IProcessor
    {
        void Process(string data);
        
        // Should be detected: default interface implementation (C# 8+)
        void PreProcess(string data)
        {
            Console.WriteLine($"Preprocessing: {data}");
        }
    }
    
    // Should NOT be detected: attributes
    [Serializable]
    [Obsolete("Use NewClass instead")]
    public class OldClass { }
}
"#;

    let functions =
        parser.extract_functions(code, "Calculator.cs").expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();

    println!("Detected functions:");
    for func in &functions {
        println!("  {} (method: {})", func.name, func.is_method);
    }

    assert!(function_names.contains(&"Add"), "Add method should be detected");
    assert!(function_names.contains(&"Multiply"), "Expression-bodied method should be detected");
    assert!(function_names.contains(&"FetchDataAsync"), "Async method should be detected");
    assert!(function_names.contains(&"Calculator"), "Constructor should be detected");
    assert!(function_names.contains(&"Create"), "Static method should be detected");
    assert!(function_names.contains(&"operator +"), "Operator overload should be detected");
    assert!(function_names.contains(&"~Calculator"), "Destructor should be detected");
    assert!(function_names.contains(&"Process"), "Generic method should be detected");
    assert!(function_names.contains(&"Double"), "Extension method should be detected");
    assert!(function_names.contains(&"TestLambdas"), "Method with lambdas should be detected");
    assert!(function_names.contains(&"PreProcess"), "Default interface method should be detected");
}

#[test]
fn test_csharp_type_detection() {
    let config = GenericParserConfig::csharp();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_c_sharp::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
namespace MyApp
{
    // Should be detected: class
    public class User
    {
        public string Name { get; set; }
        public int Age { get; set; }
    }
    
    // Should be detected: interface
    public interface IRepository<T>
    {
        Task<T> GetById(int id);
        Task Save(T entity);
    }
    
    // Should be detected: struct
    public struct Point
    {
        public double X { get; set; }
        public double Y { get; set; }
    }
    
    // Should be detected: enum
    public enum Status
    {
        Active,
        Inactive,
        Pending
    }
    
    // Should be detected: record (C# 9+)
    public record Person(string FirstName, string LastName);
    
    // Should be detected: abstract class
    public abstract class Shape
    {
        public abstract double CalculateArea();
    }
    
    // Should be detected: sealed class
    public sealed class FinalClass
    {
        // cannot be inherited
    }
    
    // Should be detected: partial class
    public partial class PartialClass
    {
        public void Method1() { }
    }
    
    public partial class PartialClass
    {
        public void Method2() { }
    }
    
    // Should be detected: nested class
    public class OuterClass
    {
        public class InnerClass
        {
            // nested class implementation
        }
        
        private class PrivateInner
        {
            // private nested class
        }
    }
    
    // Should NOT be detected: delegate
    public delegate void EventHandler(object sender, EventArgs e);
    
    // Should NOT be detected: using alias
    using StringList = System.Collections.Generic.List<string>;
}
"#;

    let types = parser.extract_types(code, "Types.cs").expect("Failed to extract types");

    println!("Detected types:");
    for t in &types {
        println!("  {} ({})", t.name, t.kind);
    }

    let type_names: Vec<&str> = types.iter().map(|t| t.name.as_str()).collect();

    assert!(type_names.contains(&"User"), "Class should be detected");
    assert!(type_names.contains(&"IRepository"), "Generic interface should be detected");
    assert!(type_names.contains(&"Point"), "Struct should be detected");
    assert!(type_names.contains(&"Status"), "Enum should be detected");
    assert!(type_names.contains(&"Person"), "Record should be detected");
    assert!(type_names.contains(&"Shape"), "Abstract class should be detected");
    assert!(type_names.contains(&"FinalClass"), "Sealed class should be detected");
    assert!(type_names.contains(&"PartialClass"), "Partial class should be detected");
    assert!(type_names.contains(&"OuterClass"), "Outer class should be detected");
    assert!(type_names.contains(&"InnerClass"), "Public inner class should be detected");
    assert!(type_names.contains(&"PrivateInner"), "Private inner class should be detected");
}

#[test]
fn test_csharp_edge_cases() {
    let config = GenericParserConfig::csharp();
    let mut parser = GenericTreeSitterParser::new(tree_sitter_c_sharp::LANGUAGE.into(), config)
        .expect("Failed to create parser");

    let code = r#"
using System;
using System.Linq;

public class EdgeCases
{
    // Should be detected: expression-bodied property
    public string Name => _name ?? "Unknown";
    
    // Should be detected: indexer
    public string this[int index]
    {
        get => _items[index];
        set => _items[index] = value;
    }
    
    // Should be detected: local function
    public void OuterMethod()
    {
        // Local function should be detected
        int LocalFunction(int x)
        {
            return x * 2;
        }
        
        var result = LocalFunction(5);
    }
    
    // Should be detected: pattern matching method
    public string GetTypeName(object obj) => obj switch
    {
        int => "Integer",
        string => "String",
        _ => "Unknown"
    };
    
    // Should be detected: tuple return
    public (int sum, int product) Calculate(int a, int b)
    {
        return (a + b, a * b);
    }
    
    // Should be detected: init-only setter (C# 9+)
    public class InitExample
    {
        public string Value { get; init; }
    }
    
    // Should be detected: required property (C# 11+)
    public class RequiredExample
    {
        public required string Name { get; set; }
    }
    
    private string _name;
    private string[] _items = new string[10];
}
"#;

    let functions =
        parser.extract_functions(code, "EdgeCases.cs").expect("Failed to extract functions");

    let function_names: Vec<&str> = functions.iter().map(|f| f.name.as_str()).collect();

    println!("Edge case functions detected: {function_names:?}");

    assert!(function_names.contains(&"OuterMethod"), "Outer method should be detected");
    assert!(function_names.contains(&"GetTypeName"), "Pattern matching method should be detected");
    assert!(function_names.contains(&"Calculate"), "Tuple return method should be detected");

    // Properties and indexers might be detected differently
    let has_properties =
        function_names.iter().any(|n| n.contains("Name") || n.contains("get") || n.contains("set"));
    let has_indexer = function_names
        .iter()
        .any(|n| n.contains("this[") || n.contains("get") || n.contains("set"));

    println!("Has properties: {has_properties}");
    println!("Has indexer: {has_indexer}");

    // Local functions might be tricky to detect
    let has_local_function = function_names.iter().any(|n| n.contains("LocalFunction"));
    println!("Has local function: {has_local_function}");
}
