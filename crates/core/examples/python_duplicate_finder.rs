use similarity_ts_core::language_parser::{Language, ParserFactory};
use similarity_ts_core::apted::{compute_edit_distance, APTEDOptions};
use std::error::Error;
use std::fs;
use std::path::Path;

fn main() -> Result<(), Box<dyn Error>> {
    let python_file = "examples/duplicate_python.py";
    
    if !Path::new(python_file).exists() {
        eprintln!("File not found: {}", python_file);
        return Ok(());
    }
    
    let source = fs::read_to_string(python_file)?;
    let mut parser = ParserFactory::create_parser(Language::Python)?;
    
    println!("=== Python Duplicate Function Finder ===\n");
    println!("Analyzing: {}\n", python_file);
    
    // Extract functions
    let functions = parser.extract_functions(&source, python_file)?;
    
    println!("Found {} functions:", functions.len());
    for func in &functions {
        println!("  - {} {} (lines {}-{})", 
            if func.is_method { "Method" } else { "Function" },
            func.name,
            func.start_line,
            func.end_line
        );
    }
    
    // Parse the file to get AST
    let _tree = parser.parse(&source, python_file)?;
    
    // Find similar functions
    println!("\n=== Similarity Analysis ===\n");
    
    let mut similar_pairs = Vec::new();
    
    for i in 0..functions.len() {
        for j in i+1..functions.len() {
            let func1 = &functions[i];
            let func2 = &functions[j];
            
            // Skip if same function
            if func1.start_line == func2.start_line {
                continue;
            }
            
            // Extract the function bodies from source
            let lines: Vec<&str> = source.lines().collect();
            
            let func1_body = lines[(func1.body_start_line as usize - 1)..(func1.body_end_line as usize)]
                .join("\n");
            let func2_body = lines[(func2.body_start_line as usize - 1)..(func2.body_end_line as usize)]
                .join("\n");
            
            // Parse function bodies
            let tree1 = parser.parse(&func1_body, "func1.py")?;
            let tree2 = parser.parse(&func2_body, "func2.py")?;
            
            let options = APTEDOptions {
                insert_cost: 1.0,
                delete_cost: 1.0,
                rename_cost: 1.0,
            };
            
            let distance = compute_edit_distance(&tree1, &tree2, &options);
            let max_size = tree1.get_subtree_size().max(tree2.get_subtree_size()) as f64;
            let similarity = 1.0 - (distance / max_size);
            
            if similarity > 0.7 {
                similar_pairs.push((func1, func2, similarity));
            }
        }
    }
    
    // Sort by similarity
    similar_pairs.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap());
    
    println!("Found {} similar function pairs (>70% similarity):\n", similar_pairs.len());
    
    for (func1, func2, similarity) in &similar_pairs {
        println!("{}% similar:", (similarity * 100.0) as i32);
        println!("  - {} '{}' (lines {}-{})", 
            if func1.is_method { "Method" } else { "Function" },
            func1.name,
            func1.start_line,
            func1.end_line
        );
        println!("  - {} '{}' (lines {}-{})", 
            if func2.is_method { "Method" } else { "Function" },
            func2.name,
            func2.start_line,
            func2.end_line
        );
        if let (Some(class1), Some(class2)) = (&func1.class_name, &func2.class_name) {
            println!("    Classes: {} vs {}", class1, class2);
        }
        println!();
    }
    
    if similar_pairs.is_empty() {
        println!("No highly similar functions found.");
    } else {
        let total_lines: u32 = similar_pairs.iter()
            .map(|(f1, _, _)| f1.end_line - f1.start_line + 1)
            .sum();
        println!("Potential lines to refactor: {}", total_lines);
    }
    
    Ok(())
}