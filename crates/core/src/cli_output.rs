use std::fs;

/// Format function output in VSCode-compatible format
pub fn format_function_output(
    file_path: &str,
    function_name: &str,
    start_line: u32,
    end_line: u32,
) -> String {
    format!("{file_path}:{start_line}-{end_line} {function_name}")
}

/// Extract lines from file content within the specified range
pub fn extract_lines_from_content(content: &str, start_line: u32, end_line: u32) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let start_idx = (start_line.saturating_sub(1)) as usize;
    let end_idx = std::cmp::min(end_line as usize, lines.len());

    if start_idx >= lines.len() {
        return String::new();
    }

    lines[start_idx..end_idx].join("\n")
}

/// Display code content for a function
pub fn show_function_code(file_path: &str, function_name: &str, start_line: u32, end_line: u32) {
    match fs::read_to_string(file_path) {
        Ok(content) => {
            let code = extract_lines_from_content(&content, start_line, end_line);
            println!(
                "\n\x1b[36m--- {}:{} (lines {}-{}) ---\x1b[0m",
                file_path, function_name, start_line, end_line
            );
            println!("{}", code);
        }
        Err(e) => {
            eprintln!("Error reading file {}: {}", file_path, e);
        }
    }
}

/// Generic duplicate result structure
pub struct DuplicateResult<T> {
    pub file1: String,
    pub file2: String,
    pub item1: T,
    pub item2: T,
    pub similarity: f64,
}

impl<T> DuplicateResult<T> {
    pub fn new(file1: String, file2: String, item1: T, item2: T, similarity: f64) -> Self {
        Self { file1, file2, item1, item2, similarity }
    }

    /// Calculate priority score for sorting
    pub fn priority(&self, get_size: impl Fn(&T) -> f64) -> f64 {
        let avg_size = (get_size(&self.item1) + get_size(&self.item2)) / 2.0;
        self.similarity * avg_size
    }
}
