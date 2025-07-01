use std::io::Write;
use std::path::PathBuf;
use tempfile::TempDir;

pub fn create_elixir_file(content: &str) -> (TempDir, PathBuf) {
    let dir = TempDir::new().unwrap();
    let file_path = dir.path().join("test.ex");
    let mut file = std::fs::File::create(&file_path).unwrap();
    writeln!(file, "{content}").unwrap();
    file.flush().unwrap();
    (dir, file_path)
}
