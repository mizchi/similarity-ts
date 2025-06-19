# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-01-19

### Added
- `--filter-function <name>` option to filter results by function name (substring match)
- `--filter-function-body <text>` option to filter results by function body content (substring match)

### Changed
- Improved documentation organization and removed outdated files

### Removed
- Removed unnecessary regex dependency, improving build size and compile time

## [0.1.0] - 2025-01-19

### Added
- Initial release with core functionality
- Function similarity detection using AST-based comparison
- Type similarity detection (experimental) for interfaces, type aliases, and type literals
- Cross-file and within-file duplicate detection
- Configurable similarity thresholds
- VSCode-compatible output format
- Fast mode with bloom filter pre-filtering
- Support for TypeScript and JavaScript files (.ts, .tsx, .js, .jsx, .mjs, .cjs, .mts, .cts)
- `--min-tokens` option for filtering by AST node count
- `--print` option to display code snippets
- Parallel file processing for performance