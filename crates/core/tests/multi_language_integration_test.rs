use similarity_ts_core::apted::{compute_edit_distance, APTEDOptions};
use similarity_ts_core::language_parser::{Language, ParserFactory};
use std::fs;
use std::path::PathBuf;

fn get_test_file_path(filename: &str) -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("../../examples");
    path.push(filename);
    path
}

#[test]
fn test_find_duplicates_in_python_file() {
    let path = get_test_file_path("duplicate_python.py");
    if !path.exists() {
        eprintln!("Skipping test: {:?} not found", path);
        return;
    }

    let source = fs::read_to_string(&path).unwrap();
    let mut parser = ParserFactory::create_parser(Language::Python).unwrap();
    let functions = parser.extract_functions(&source, "duplicate_python.py").unwrap();

    // Should find multiple similar functions
    let process_funcs: Vec<_> = functions
        .iter()
        .filter(|f| f.name.contains("process") || f.name.contains("transform"))
        .collect();

    assert!(
        process_funcs.len() >= 4,
        "Expected at least 4 process/transform functions, found {}",
        process_funcs.len()
    );

    // Compare the standalone functions
    let process_data = functions.iter().find(|f| f.name == "process_data" && !f.is_method).unwrap();
    let transform_data =
        functions.iter().find(|f| f.name == "transform_data" && !f.is_method).unwrap();

    // They should be on different lines
    assert_ne!(process_data.start_line, transform_data.start_line);
}

#[test]
fn test_cross_language_duplicate_detection() {
    let js_path = get_test_file_path("mixed_language_project/utils.js");
    let py_path = get_test_file_path("mixed_language_project/helpers.py");

    if !js_path.exists() || !py_path.exists() {
        eprintln!("Skipping test: test files not found");
        return;
    }

    let js_source = fs::read_to_string(&js_path).unwrap();
    let py_source = fs::read_to_string(&py_path).unwrap();

    let mut js_parser = ParserFactory::create_parser(Language::JavaScript).unwrap();
    let mut py_parser = ParserFactory::create_parser(Language::Python).unwrap();

    let js_functions = js_parser.extract_functions(&js_source, "utils.js").unwrap();
    let py_functions = py_parser.extract_functions(&py_source, "helpers.py").unwrap();

    // Both files should have a "process_data" function
    let js_process = js_functions.iter().find(|f| f.name == "processData").unwrap();
    let py_process = py_functions.iter().find(|f| f.name == "process_data").unwrap();

    // Both should be regular functions (not methods)
    assert!(!js_process.is_method);
    assert!(!py_process.is_method);

    // Both files should have a class with a process method
    let js_method = js_functions.iter().find(|f| f.name == "process" && f.is_method).unwrap();
    let py_method = py_functions.iter().find(|f| f.name == "process" && f.is_method).unwrap();

    assert_eq!(js_method.class_name, Some("DataProcessor".to_string()));
    assert_eq!(py_method.class_name, Some("DataHelper".to_string()));
}

#[test]
fn test_language_detection() {
    assert_eq!(Language::from_filename("test.js"), Some(Language::JavaScript));
    assert_eq!(Language::from_filename("test.mjs"), Some(Language::JavaScript));
    assert_eq!(Language::from_filename("test.ts"), Some(Language::TypeScript));
    assert_eq!(Language::from_filename("test.tsx"), Some(Language::TypeScript));
    assert_eq!(Language::from_filename("test.py"), Some(Language::Python));
    assert_eq!(Language::from_filename("path/to/file.py"), Some(Language::Python));
    assert_eq!(Language::from_filename("test.txt"), None);
}

#[test]
fn test_mixed_file_parsing() {
    // Test that we can parse multiple files of different types
    let files = vec![
        ("test.js", r#"function hello() { return "world"; }"#, Language::JavaScript),
        ("test.py", r#"def hello(): return "world""#, Language::Python),
        ("test.ts", r#"function hello(): string { return "world"; }"#, Language::TypeScript),
    ];

    for (filename, source, expected_lang) in files {
        let detected_lang = Language::from_filename(filename).unwrap();
        assert_eq!(detected_lang, expected_lang);

        let mut parser = ParserFactory::create_parser(detected_lang).unwrap();
        let functions = parser.extract_functions(source, filename).unwrap();

        assert_eq!(functions.len(), 1);
        assert_eq!(functions[0].name, "hello");
    }
}

#[test]
fn test_similarity_across_languages() {
    // Simple add function in different languages
    let js_add = r#"
function add(a, b) {
    return a + b;
}
"#;

    let py_add = r#"
def add(a, b):
    return a + b
"#;

    let mut js_parser = ParserFactory::create_parser(Language::JavaScript).unwrap();
    let mut py_parser = ParserFactory::create_parser(Language::Python).unwrap();

    let js_tree = js_parser.parse(js_add, "add.js").unwrap();
    let py_tree = py_parser.parse(py_add, "add.py").unwrap();

    let options = APTEDOptions {
        insert_cost: 1.0,
        delete_cost: 1.0,
        rename_cost: 0.5, // Lower rename cost since syntax differs
    };

    let distance = compute_edit_distance(&js_tree, &py_tree, &options);
    let max_size = js_tree.get_subtree_size().max(py_tree.get_subtree_size()) as f64;
    let similarity = 1.0 - (distance / max_size);

    println!("Cross-language similarity for add function: {:.2}%", similarity * 100.0);

    // Even across languages, simple functions should show some similarity
    assert!(similarity > 0.3, "Expected some similarity between simple add functions");
}
