use similarity_md::{SectionExtractor, SimilarityCalculator, SimilarityOptions};
use std::fs;
use tempfile::TempDir;

#[test]
fn test_end_to_end_similarity_detection() {
    // Create temporary directory with test markdown files
    let temp_dir = TempDir::new().unwrap();

    let file1_content = r#"# Introduction

This is a comprehensive guide to getting started with the project.
It covers all the basic concepts you need to know.

## Installation

To install the software, follow these steps:
1. Download the package
2. Run the installer
3. Configure your environment

## Usage

Once installed, you can start using the software by running the main command.
The basic usage is straightforward and intuitive.

# Advanced Topics

This section covers more advanced usage patterns and configurations.
Expert users will find detailed information here.
"#;

    let file2_content = r#"# Overview

This is a thorough guide to beginning with the project.
It explains all the fundamental concepts you should understand.

## Setup

To set up the software, follow these instructions:
1. Download the package
2. Execute the installer
3. Configure your system

## Basic Usage

After setup, you can begin using the software by executing the main command.
The fundamental usage is simple and user-friendly.

# Expert Topics

This section addresses more sophisticated usage patterns and settings.
Advanced users will discover comprehensive information here.
"#;

    // Write test files
    let file1_path = temp_dir.path().join("guide1.md");
    let file2_path = temp_dir.path().join("guide2.md");

    fs::write(&file1_path, file1_content).unwrap();
    fs::write(&file2_path, file2_content).unwrap();

    // Extract sections
    let extractor = SectionExtractor::default();
    let mut all_sections = extractor.extract_from_file(&file1_path).unwrap();
    all_sections.extend(extractor.extract_from_file(&file2_path).unwrap());

    // Calculate similarities
    let calculator = SimilarityCalculator::new();
    let similar_pairs = calculator.find_similar_sections(&all_sections, 0.7);

    // Verify results
    assert!(!similar_pairs.is_empty(), "Should find similar sections");

    // Check that we found the expected similar pairs
    let mut found_intro_pair = false;
    let mut found_install_pair = false;
    let mut found_usage_pair = false;
    let mut found_advanced_pair = false;

    for pair in &similar_pairs {
        let title1 = &pair.section1.title;
        let title2 = &pair.section2.title;

        if (title1 == "Introduction" && title2 == "Overview")
            || (title1 == "Overview" && title2 == "Introduction")
        {
            found_intro_pair = true;
            assert!(pair.result.similarity > 0.7);
        }

        if (title1 == "Installation" && title2 == "Setup")
            || (title1 == "Setup" && title2 == "Installation")
        {
            found_install_pair = true;
            assert!(pair.result.similarity > 0.7);
        }

        if (title1 == "Usage" && title2 == "Basic Usage")
            || (title1 == "Basic Usage" && title2 == "Usage")
        {
            found_usage_pair = true;
            assert!(pair.result.similarity > 0.7);
        }

        if (title1 == "Advanced Topics" && title2 == "Expert Topics")
            || (title1 == "Expert Topics" && title2 == "Advanced Topics")
        {
            found_advanced_pair = true;
            assert!(pair.result.similarity > 0.7);
        }
    }

    assert!(found_intro_pair, "Should find Introduction/Overview pair");
    assert!(found_install_pair, "Should find Installation/Setup pair");
    assert!(found_usage_pair, "Should find Usage/Basic Usage pair");
    assert!(found_advanced_pair, "Should find Advanced/Expert Topics pair");
}

#[test]
fn test_same_file_similarity_detection() {
    let temp_dir = TempDir::new().unwrap();

    let content = r#"# Chapter 1: Introduction

This chapter introduces the basic concepts of the subject.
It provides a foundation for understanding the material.

# Chapter 2: Getting Started

This chapter shows you how to get started with the project.
It covers the initial setup and basic configuration.

# Chapter 3: Introduction to Advanced Topics

This chapter introduces more complex concepts of the subject.
It builds upon the foundation established in earlier chapters.

# Chapter 4: Advanced Getting Started

This chapter demonstrates advanced setup procedures.
It covers complex configuration and optimization techniques.
"#;

    let file_path = temp_dir.path().join("document.md");
    fs::write(&file_path, content).unwrap();

    let extractor = SectionExtractor::default();
    let sections = extractor.extract_from_file(&file_path).unwrap();

    let calculator = SimilarityCalculator::new();
    let similar_pairs =
        calculator.find_similar_sections_in_file(&sections, &file_path.to_string_lossy(), 0.6);

    assert!(!similar_pairs.is_empty(), "Should find similar sections within the same file");

    // Should find similarities between chapters with similar themes
    let mut found_intro_similarity = false;
    let mut found_getting_started_similarity = false;

    for pair in &similar_pairs {
        let title1 = &pair.section1.title;
        let title2 = &pair.section2.title;

        if title1.contains("Introduction") && title2.contains("Introduction") {
            found_intro_similarity = true;
        }

        if title1.contains("Getting Started") && title2.contains("Getting Started") {
            found_getting_started_similarity = true;
        }
    }

    assert!(
        found_intro_similarity || found_getting_started_similarity,
        "Should find at least one thematic similarity"
    );
}

#[test]
fn test_custom_similarity_options() {
    let temp_dir = TempDir::new().unwrap();

    let content1 = r#"# Test Section
This is a test section with some content for similarity testing.
"#;

    let content2 = r#"# Test Section  
This is a test section with some content for similarity evaluation.
"#;

    let file1_path = temp_dir.path().join("test1.md");
    let file2_path = temp_dir.path().join("test2.md");

    fs::write(&file1_path, content1).unwrap();
    fs::write(&file2_path, content2).unwrap();

    let extractor = SectionExtractor::new(1, 6, false); // Lower word count threshold
    let mut sections = extractor.extract_from_file(&file1_path).unwrap();
    sections.extend(extractor.extract_from_file(&file2_path).unwrap());

    // Test with custom options emphasizing character-level similarity
    let options = SimilarityOptions {
        char_levenshtein_weight: 0.7,
        word_levenshtein_weight: 0.1,
        title_weight: 0.1,
        length_weight: 0.1,
        ..Default::default()
    };

    let calculator = SimilarityCalculator::with_options(options).unwrap();
    let similar_pairs = calculator.find_similar_sections(&sections, 0.8);

    assert!(!similar_pairs.is_empty(), "Should find similar sections with custom options");
    assert!(similar_pairs[0].result.similarity > 0.8, "Should have high similarity");
}

#[test]
fn test_hierarchy_consideration() {
    let temp_dir = TempDir::new().unwrap();

    let content = r#"# Main Topic

This is the main topic section.

## Subtopic

This is a subtopic under the main topic.

### Sub-subtopic

This is a sub-subtopic with similar content to the main topic.

#### Deep subtopic

This is a very deep subtopic that also has similar content to the main topic.
"#;

    let file_path = temp_dir.path().join("hierarchy.md");
    fs::write(&file_path, content).unwrap();

    let extractor = SectionExtractor::new(5, 6, false);
    let sections = extractor.extract_from_file(&file_path).unwrap();

    // Test with hierarchy consideration enabled
    let options_with_hierarchy = SimilarityOptions {
        consider_hierarchy: true,
        max_level_diff: 1, // Only allow 1 level difference
        ..Default::default()
    };

    let calculator_with_hierarchy =
        SimilarityCalculator::with_options(options_with_hierarchy).unwrap();
    let pairs_with_hierarchy = calculator_with_hierarchy.find_similar_sections(&sections, 0.5);

    // Test with hierarchy consideration disabled
    let options_without_hierarchy =
        SimilarityOptions { consider_hierarchy: false, ..Default::default() };

    let calculator_without_hierarchy =
        SimilarityCalculator::with_options(options_without_hierarchy).unwrap();
    let pairs_without_hierarchy =
        calculator_without_hierarchy.find_similar_sections(&sections, 0.5);

    // With hierarchy consideration, we should have fewer or lower-scored pairs
    // due to level differences being penalized
    if !pairs_with_hierarchy.is_empty() && !pairs_without_hierarchy.is_empty() {
        let max_similarity_with =
            pairs_with_hierarchy.iter().map(|p| p.result.similarity).fold(0.0, f64::max);
        let max_similarity_without =
            pairs_without_hierarchy.iter().map(|p| p.result.similarity).fold(0.0, f64::max);

        assert!(
            max_similarity_with <= max_similarity_without,
            "Hierarchy consideration should reduce similarity scores for different levels"
        );
    }
}
