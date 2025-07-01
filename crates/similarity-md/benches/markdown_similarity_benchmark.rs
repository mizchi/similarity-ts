use criterion::{black_box, criterion_group, criterion_main, Criterion};
use similarity_md::{SectionExtractor, SimilarityCalculator, SimilarityOptions};

fn create_test_content() -> String {
    r#"# Introduction

This is a comprehensive introduction to the topic. It covers the basic concepts and provides
a foundation for understanding the more advanced topics that will be discussed later.
The introduction aims to give readers a clear overview of what they can expect to learn.

## Getting Started

To get started with this topic, you need to understand the fundamental principles.
This section will guide you through the initial setup and basic configuration.
We'll cover the essential steps needed to begin your journey.

### Prerequisites

Before you begin, make sure you have the following prerequisites installed:
- Basic understanding of the concepts
- Required software tools
- Access to the necessary resources

## Advanced Topics

Once you've mastered the basics, you can move on to more advanced topics.
This section covers complex scenarios and edge cases that you might encounter.
Advanced users will find detailed explanations and best practices here.

### Performance Optimization

Performance is crucial for any system. This subsection discusses various
optimization techniques and strategies to improve system performance.
We'll explore both theoretical concepts and practical implementations.

### Security Considerations

Security should never be an afterthought. This section covers important
security considerations and best practices to keep your system secure.
We'll discuss common vulnerabilities and how to prevent them.

# Conclusion

In conclusion, this document has covered the essential aspects of the topic.
We've explored both basic and advanced concepts, providing you with a
comprehensive understanding of the subject matter.
"#
    .to_string()
}

fn create_similar_content() -> String {
    r#"# Overview

This is a thorough overview of the subject matter. It explains the basic principles and provides
a solid foundation for understanding the more complex topics that will be covered later.
The overview is designed to give readers a clear picture of what they will learn.

## Getting Started

To begin with this subject, you need to grasp the fundamental concepts.
This section will walk you through the initial setup and basic configuration.
We'll discuss the essential steps required to start your learning process.

### Requirements

Before starting, ensure you have the following requirements met:
- Basic knowledge of the principles
- Necessary software tools
- Access to required resources

## Expert Topics

After you've learned the fundamentals, you can proceed to more expert-level topics.
This section addresses complex situations and special cases you might face.
Expert users will discover detailed explanations and recommended practices here.

### Performance Tuning

Performance is critical for any application. This subsection explains various
tuning techniques and approaches to enhance application performance.
We'll examine both theoretical foundations and practical applications.

### Security Guidelines

Security must be considered from the beginning. This section outlines important
security guidelines and recommended practices to maintain system security.
We'll review common threats and prevention methods.

# Summary

To summarize, this document has addressed the key elements of the subject.
We've examined both fundamental and expert concepts, giving you a
complete understanding of the topic.
"#
    .to_string()
}

fn benchmark_section_extraction(c: &mut Criterion) {
    let content = create_test_content();
    let extractor = SectionExtractor::default();

    c.bench_function("extract_sections", |b| {
        b.iter(|| extractor.extract_from_content(black_box(&content), "test.md"))
    });
}

fn benchmark_similarity_calculation(c: &mut Criterion) {
    let content1 = create_test_content();
    let content2 = create_similar_content();

    let extractor = SectionExtractor::default();
    let sections1 = extractor.extract_from_content(&content1, "test1.md");
    let sections2 = extractor.extract_from_content(&content2, "test2.md");

    let calculator = SimilarityCalculator::new();

    c.bench_function("calculate_similarity", |b| {
        b.iter(|| {
            calculator.calculate_similarity(black_box(&sections1[0]), black_box(&sections2[0]))
        })
    });
}

fn benchmark_find_similar_sections(c: &mut Criterion) {
    let content1 = create_test_content();
    let content2 = create_similar_content();

    let extractor = SectionExtractor::default();
    let mut all_sections = extractor.extract_from_content(&content1, "test1.md");
    all_sections.extend(extractor.extract_from_content(&content2, "test2.md"));

    let calculator = SimilarityCalculator::new();

    c.bench_function("find_similar_sections", |b| {
        b.iter(|| calculator.find_similar_sections(black_box(&all_sections), 0.7))
    });
}

fn benchmark_levenshtein_distance(c: &mut Criterion) {
    use similarity_md::levenshtein_distance;

    let text1 = "This is a sample text for testing the Levenshtein distance algorithm performance.";
    let text2 =
        "This is a sample text for evaluating the Levenshtein distance algorithm efficiency.";

    c.bench_function("levenshtein_distance", |b| {
        b.iter(|| levenshtein_distance(black_box(text1), black_box(text2)))
    });
}

fn benchmark_word_levenshtein_distance(c: &mut Criterion) {
    use similarity_md::levenshtein::word_levenshtein_distance;

    let text1 = "This is a sample text for testing the word level Levenshtein distance algorithm performance and accuracy.";
    let text2 = "This is a sample text for evaluating the word level Levenshtein distance algorithm efficiency and precision.";

    c.bench_function("word_levenshtein_distance", |b| {
        b.iter(|| word_levenshtein_distance(black_box(text1), black_box(text2)))
    });
}

criterion_group!(
    benches,
    benchmark_section_extraction,
    benchmark_similarity_calculation,
    benchmark_find_similar_sections,
    benchmark_levenshtein_distance,
    benchmark_word_levenshtein_distance
);
criterion_main!(benches);
