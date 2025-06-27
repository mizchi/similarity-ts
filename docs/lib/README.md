# Library Documentation

This directory contains documentation about the library design, architecture, and features.

## Contents

- [AI Documentation](ai-documentation.md) - Comprehensive technical documentation for AI developers
- [Multi-file Similarity](multi_file_similarity.md) - Implementation details for cross-file similarity detection
- [Type Similarity Design](type-similarity-design.md) - Design document for TypeScript type similarity detection
- [Visitor Implementation Example](visitor-implementation-example.md) - Example of visitor pattern implementation
- [Python Support](python-support.md) - Documentation for Python language support

## Architecture Overview

The similarity detection library is organized as a Rust workspace with:
- **similarity-core**: Language-agnostic core algorithms and utilities
- **similarity-ts**: TypeScript/JavaScript specific implementation
- **similarity-py**: Python specific implementation  
- **similarity-rs**: Rust specific implementation

Each language-specific crate implements the `LanguageParser` trait from the core library.