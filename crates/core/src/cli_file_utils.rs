use ignore::WalkBuilder;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

/// Collect files from paths with given extensions
pub fn collect_files(paths: &[String], extensions: &[&str]) -> anyhow::Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    let mut visited = HashSet::new();

    // Process each path
    for path_str in paths {
        let path = Path::new(path_str);

        if path.is_file() {
            // If it's a file, check extension and add it
            if let Some(ext) = path.extension() {
                if let Some(ext_str) = ext.to_str() {
                    if extensions.contains(&ext_str) {
                        if let Ok(canonical) = path.canonicalize() {
                            if visited.insert(canonical.clone()) {
                                files.push(path.to_path_buf());
                            }
                        }
                    }
                }
            }
        } else if path.is_dir() {
            // If it's a directory, walk it respecting .gitignore
            let walker = WalkBuilder::new(path).follow_links(false).build();

            for entry in walker {
                let entry = entry?;
                let entry_path = entry.path();

                // Skip if not a file
                if !entry_path.is_file() {
                    continue;
                }

                // Check extension
                if let Some(ext) = entry_path.extension() {
                    if let Some(ext_str) = ext.to_str() {
                        if extensions.contains(&ext_str) {
                            if let Ok(canonical) = entry_path.canonicalize() {
                                if visited.insert(canonical.clone()) {
                                    files.push(entry_path.to_path_buf());
                                }
                            }
                        }
                    }
                }
            }
        } else {
            eprintln!("Path does not exist or is not accessible: {}", path_str);
        }
    }

    // Sort files for consistent output
    files.sort();

    Ok(files)
}
