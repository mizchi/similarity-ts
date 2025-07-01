#![allow(clippy::uninlined_format_args)]

use anyhow::Result;
use clap::Parser;
use ignore::WalkBuilder;
use similarity_md::{SectionExtractor, SimilarityCalculator, SimilarityOptions};
use std::collections::HashSet;
use std::path::Path;

#[derive(Parser)]
#[command(name = "similarity-md")]
#[command(about = "Experimental Markdown content similarity analyzer")]
#[command(version)]
struct Cli {
    /// Paths to analyze (files or directories)
    #[arg(default_value = ".")]
    paths: Vec<String>,

    /// Print section content in output
    #[arg(short, long)]
    print: bool,

    /// Similarity threshold (0.0-1.0)
    #[arg(short, long, default_value = "0.75")]
    threshold: f64,

    /// Minimum word count for sections to be considered
    #[arg(short, long, default_value = "10")]
    min_words: usize,

    /// Maximum heading level to consider (1-6)
    #[arg(long, default_value = "6")]
    max_level: u32,

    /// Include empty sections
    #[arg(long)]
    include_empty: bool,

    /// Weight for character-level Levenshtein similarity (0.0-1.0)
    #[arg(long, default_value = "0.4")]
    char_weight: f64,

    /// Weight for word-level Levenshtein similarity (0.0-1.0)
    #[arg(long, default_value = "0.3")]
    word_weight: f64,

    /// Weight for title similarity (0.0-1.0)
    #[arg(long, default_value = "0.2")]
    title_weight: f64,

    /// Weight for morphological similarity (0.0-1.0)
    #[arg(long, default_value = "0.0")]
    morphological_weight: f64,

    /// Weight for content length similarity (0.0-1.0)
    #[arg(long, default_value = "0.1")]
    length_weight: f64,

    /// Enable morphological analysis for Japanese text
    #[arg(long)]
    use_morphological: bool,

    /// Path to morphological analysis dictionary
    #[arg(long)]
    morphological_dict: Option<String>,

    /// Disable text normalization
    #[arg(long)]
    no_normalize: bool,

    /// Disable hierarchy consideration
    #[arg(long)]
    no_hierarchy: bool,

    /// Maximum level difference for hierarchy comparison
    #[arg(long, default_value = "2")]
    max_level_diff: u32,

    /// Only compare sections within the same file
    #[arg(long)]
    same_file_only: bool,

    /// Only compare sections across different files
    #[arg(long)]
    cross_file_only: bool,

    /// File extensions to check
    #[arg(short, long, value_delimiter = ',', default_value = "md,markdown")]
    extensions: Vec<String>,

    /// Exclude directories matching the given patterns
    #[arg(long)]
    exclude: Vec<String>,

    /// Output format (text, json)
    #[arg(long, default_value = "text")]
    format: String,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    // Show experimental warning
    eprintln!("╔════════════════════════════════════════════════════════════════════╗");
    eprintln!("║                      EXPERIMENTAL WARNING                          ║");
    eprintln!("║                                                                    ║");
    eprintln!("║  similarity-md is an experimental tool for analyzing Markdown      ║");
    eprintln!("║  content similarity. It may produce unexpected results and its     ║");
    eprintln!("║  API/behavior may change significantly in future versions.         ║");
    eprintln!("║                                                                    ║");
    eprintln!("║  Use with caution in production environments.                      ║");
    eprintln!("╚════════════════════════════════════════════════════════════════════╝");
    eprintln!();

    // Validate threshold
    if cli.threshold < 0.0 || cli.threshold > 1.0 {
        return Err(anyhow::anyhow!("Threshold must be between 0.0 and 1.0"));
    }

    // Validate mutually exclusive options
    if cli.same_file_only && cli.cross_file_only {
        return Err(anyhow::anyhow!("Cannot use both --same-file-only and --cross-file-only"));
    }

    // Create similarity options
    let similarity_options = SimilarityOptions {
        char_levenshtein_weight: cli.char_weight,
        word_levenshtein_weight: cli.word_weight,
        morphological_weight: cli.morphological_weight,
        title_weight: cli.title_weight,
        length_weight: cli.length_weight,
        min_length_ratio: 0.3,
        normalize_text: !cli.no_normalize,
        consider_hierarchy: !cli.no_hierarchy,
        max_level_diff: cli.max_level_diff,
        use_morphological_analysis: cli.use_morphological,
        morphological_dict_path: cli.morphological_dict,
    };

    // Validate similarity options
    if let Err(e) = similarity_options.validate() {
        return Err(anyhow::anyhow!("Invalid similarity options: {}", e));
    }

    println!("Analyzing markdown content similarity...\n");

    // Find markdown files
    let files = find_markdown_files(&cli.paths, &cli.extensions, &cli.exclude)?;

    if files.is_empty() {
        println!("No markdown files found in specified paths");
        return Ok(());
    }

    println!("Found {} markdown files", files.len());

    // Extract sections
    let extractor = SectionExtractor::new(cli.min_words, cli.max_level, cli.include_empty);
    let sections = extractor.extract_from_files(&files);

    if sections.is_empty() {
        println!("No sections found matching the criteria");
        return Ok(());
    }

    println!("Extracted {} sections\n", sections.len());

    // Calculate similarities
    let calculator = SimilarityCalculator::with_options(similarity_options)?;

    let similar_pairs = if cli.same_file_only {
        // Find similar sections within each file
        let mut all_pairs = Vec::new();
        let file_paths: HashSet<_> = sections.iter().map(|s| &s.file_path).collect();

        for file_path in file_paths {
            let mut pairs =
                calculator.find_similar_sections_in_file(&sections, file_path, cli.threshold);
            all_pairs.append(&mut pairs);
        }

        // Sort by similarity
        all_pairs.sort_by(|a, b| b.result.similarity.partial_cmp(&a.result.similarity).unwrap());
        all_pairs
    } else if cli.cross_file_only {
        calculator.find_similar_sections_across_files(&sections, cli.threshold)
    } else {
        calculator.find_similar_sections(&sections, cli.threshold)
    };

    // Output results
    match cli.format.as_str() {
        "json" => output_json(&similar_pairs)?,
        "text" => output_text(&similar_pairs, cli.print),
        _ => output_text(&similar_pairs, cli.print),
    }

    Ok(())
}

fn find_markdown_files(
    paths: &[String],
    extensions: &[String],
    exclude_patterns: &[String],
) -> Result<Vec<std::path::PathBuf>> {
    let exclude_matcher = create_exclude_matcher(exclude_patterns);
    let mut files = Vec::new();
    let mut visited = HashSet::new();

    for path_str in paths {
        let path = Path::new(path_str);

        if path.is_file() {
            if is_markdown_file(path, extensions) {
                if let Ok(canonical) = path.canonicalize() {
                    if visited.insert(canonical.clone()) {
                        files.push(path.to_path_buf());
                    }
                }
            }
        } else if path.is_dir() {
            let walker = WalkBuilder::new(path).follow_links(false).build();

            for entry in walker {
                let entry = entry?;
                let entry_path = entry.path();

                if !entry_path.is_file() {
                    continue;
                }

                // Check if path should be excluded
                if let Some(ref matcher) = exclude_matcher {
                    if matcher.is_match(entry_path) {
                        continue;
                    }
                }

                if is_markdown_file(entry_path, extensions) {
                    if let Ok(canonical) = entry_path.canonicalize() {
                        if visited.insert(canonical.clone()) {
                            files.push(entry_path.to_path_buf());
                        }
                    }
                }
            }
        } else {
            eprintln!("Warning: Path not found: {}", path_str);
        }
    }

    Ok(files)
}

fn is_markdown_file(path: &Path, extensions: &[String]) -> bool {
    if let Some(ext) = path.extension() {
        if let Some(ext_str) = ext.to_str() {
            return extensions.iter().any(|e| e == ext_str);
        }
    }
    false
}

fn create_exclude_matcher(exclude_patterns: &[String]) -> Option<globset::GlobSet> {
    if exclude_patterns.is_empty() {
        return None;
    }

    let mut builder = globset::GlobSetBuilder::new();
    for pattern in exclude_patterns {
        if let Ok(glob) = globset::Glob::new(pattern) {
            builder.add(glob);
        } else {
            eprintln!("Warning: Invalid glob pattern: {}", pattern);
        }
    }

    builder.build().ok()
}

fn output_text(similar_pairs: &[similarity_md::SimilarSectionPair], print_content: bool) {
    if similar_pairs.is_empty() {
        println!("No similar sections found!");
        return;
    }

    println!("Similar sections found:");
    println!("{}", "-".repeat(80));

    for (i, pair) in similar_pairs.iter().enumerate() {
        println!("\n{}. Similarity: {:.2}%", i + 1, pair.result.similarity * 100.0);

        // Show detailed similarity breakdown
        println!(
            "   Character-level: {:.2}%, Word-level: {:.2}%, Morphological: {:.2}%, Title: {:.2}%, Length: {:.2}%",
            pair.result.char_levenshtein_similarity * 100.0,
            pair.result.word_levenshtein_similarity * 100.0,
            pair.result.morphological_similarity * 100.0,
            pair.result.title_similarity * 100.0,
            pair.result.length_similarity * 100.0
        );

        // Show section 1
        let relative_path1 = get_relative_path(&pair.section1.file_path);
        println!(
            "   {}:{} | L{}-{} | {} (Level {})",
            relative_path1,
            pair.section1.line_start,
            pair.section1.line_start,
            pair.section1.line_end,
            pair.section1.title,
            pair.section1.level
        );

        // Show section 2
        let relative_path2 = get_relative_path(&pair.section2.file_path);
        println!(
            "   {}:{} | L{}-{} | {} (Level {})",
            relative_path2,
            pair.section2.line_start,
            pair.section2.line_start,
            pair.section2.line_end,
            pair.section2.title,
            pair.section2.level
        );

        if print_content {
            println!("\n   Section 1 content:");
            println!("   {}", format_content(&pair.section1.get_summary(50)));
            println!("\n   Section 2 content:");
            println!("   {}", format_content(&pair.section2.get_summary(50)));
        }
    }

    println!("\nTotal similar section pairs found: {}", similar_pairs.len());
}

fn output_json(similar_pairs: &[similarity_md::SimilarSectionPair]) -> Result<()> {
    let json_output = serde_json::to_string_pretty(similar_pairs)?;
    println!("{}", json_output);
    Ok(())
}

fn get_relative_path(file_path: &str) -> String {
    if let Ok(current_dir) = std::env::current_dir() {
        std::path::Path::new(file_path)
            .strip_prefix(&current_dir)
            .unwrap_or(std::path::Path::new(file_path))
            .to_string_lossy()
            .to_string()
    } else {
        file_path.to_string()
    }
}

fn format_content(content: &str) -> String {
    content.lines().map(|line| format!("     {}", line)).collect::<Vec<_>>().join("\n")
}
