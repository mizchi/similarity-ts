# similarity-md (Experimental)

**⚠️ This is an experimental tool for Markdown content similarity analysis.**

Markdown content similarity analyzer that detects similar sections across markdown documents using Levenshtein distance and natural language processing techniques.

## Features

- **Section-based Analysis**: Analyzes markdown documents by extracting and comparing individual sections (headings and their content)
- **Levenshtein Distance**: Uses both character-level and word-level Levenshtein distance for natural language similarity detection
- **Hierarchical Awareness**: Considers document structure and heading hierarchy in similarity calculations
- **Flexible Configuration**: Customizable similarity weights, thresholds, and filtering options
- **Multiple Output Formats**: Supports both human-readable text and JSON output
- **Cross-file and Same-file Analysis**: Can analyze similarities within files or across different files

## Installation

```bash
cargo install similarity-md
```

Or build from source:

```bash
git clone https://github.com/mizchi/similarity
cd similarity/crates/similarity-md
cargo build --release
```

## Usage

### Basic Usage

Analyze all markdown files in the current directory:

```bash
similarity-md
```

Analyze specific files or directories:

```bash
similarity-md docs/ README.md
```

### Options

```bash
similarity-md [OPTIONS] [PATHS]...

Arguments:
  [PATHS]...  Paths to analyze (files or directories) [default: .]

Options:
  -p, --print                    Print section content in output
  -t, --threshold <THRESHOLD>    Similarity threshold (0.0-1.0) [default: 0.75]
  -m, --min-words <MIN_WORDS>    Minimum word count for sections [default: 10]
      --max-level <MAX_LEVEL>    Maximum heading level to consider (1-6) [default: 6]
      --include-empty            Include empty sections
      --char-weight <WEIGHT>     Weight for character-level Levenshtein similarity [default: 0.4]
      --word-weight <WEIGHT>     Weight for word-level Levenshtein similarity [default: 0.3]
      --title-weight <WEIGHT>    Weight for title similarity [default: 0.2]
      --length-weight <WEIGHT>   Weight for content length similarity [default: 0.1]
      --no-normalize             Disable text normalization
      --no-hierarchy             Disable hierarchy consideration
      --max-level-diff <DIFF>    Maximum level difference for hierarchy comparison [default: 2]
      --same-file-only           Only compare sections within the same file
      --cross-file-only          Only compare sections across different files
  -e, --extensions <EXTS>        File extensions to check [default: md,markdown]
      --exclude <PATTERNS>       Exclude directories matching the given patterns
      --format <FORMAT>          Output format (text, json) [default: text]
  -h, --help                     Print help
  -V, --version                  Print version
```

### Examples

#### Find highly similar sections with detailed output:

```bash
similarity-md --threshold 0.9 --print docs/
```

#### Analyze only within individual files:

```bash
similarity-md --same-file-only --threshold 0.8
```

#### Find duplicated content across different files:

```bash
similarity-md --cross-file-only --threshold 0.85
```

#### Custom similarity weights (emphasize word-level similarity):

```bash
similarity-md --char-weight 0.2 --word-weight 0.6 --title-weight 0.1 --length-weight 0.1
```

#### JSON output for programmatic processing:

```bash
similarity-md --format json --threshold 0.8 > similarities.json
```

#### Exclude specific directories:

```bash
similarity-md --exclude "node_modules" --exclude "target" --exclude ".git"
```

## How It Works

### Section Extraction

The tool parses markdown documents and extracts sections based on headings (# ## ### etc.). Each section includes:

- Title (heading text)
- Content (everything under the heading until the next heading of same or higher level)
- Hierarchical path (e.g., "Chapter 1 > Section 1.1 > Subsection 1.1.1")
- Line numbers and word count

### Similarity Calculation

Similarity is calculated using a weighted combination of multiple factors:

1. **Character-level Levenshtein Distance** (default weight: 0.4)

   - Measures character-by-character differences
   - Good for detecting minor edits and typos

2. **Word-level Levenshtein Distance** (default weight: 0.3)

   - Measures word-by-word differences
   - Better for natural language content with reordered phrases

3. **Title Similarity** (default weight: 0.2)

   - Compares section headings
   - Helps identify sections with similar purposes

4. **Length Similarity** (default weight: 0.1)
   - Considers content length differences
   - Prevents matching very short sections with very long ones

### Text Normalization

By default, text is normalized before comparison:

- Converted to lowercase
- Punctuation removed
- Extra whitespace normalized

This can be disabled with `--no-normalize` for exact matching.

### Hierarchy Consideration

The tool considers document structure:

- Sections at very different hierarchy levels are penalized
- Configurable with `--max-level-diff`
- Can be disabled with `--no-hierarchy`

## Output Format

### Text Output

```
Similar sections found:
--------------------------------------------------------------------------------

1. Similarity: 87.50%
   Character-level: 85.20%, Word-level: 90.30%, Title: 95.00%, Length: 80.00%
   docs/guide.md:15 | L15-25 | Getting Started (Level 2)
   docs/tutorial.md:8 | L8-18 | Getting Started (Level 2)
```

### JSON Output

```json
[
  {
    "section1": {
      "title": "Getting Started",
      "level": 2,
      "content": "...",
      "plain_content": "...",
      "word_count": 45,
      "line_start": 15,
      "line_end": 25,
      "path": ["Introduction", "Getting Started"],
      "file_path": "docs/guide.md"
    },
    "section2": { ... },
    "result": {
      "similarity": 0.875,
      "char_levenshtein_similarity": 0.852,
      "word_levenshtein_similarity": 0.903,
      "title_similarity": 0.95,
      "length_similarity": 0.8,
      "same_level": true,
      "level_diff": 0
    }
  }
]
```

## Use Cases

- **Documentation Maintenance**: Find duplicated content across documentation files
- **Content Review**: Identify sections that might need consolidation
- **Quality Assurance**: Detect inconsistent explanations of the same topic
- **Refactoring**: Find opportunities to extract common content into shared sections
- **Translation Review**: Compare translated documents for consistency

## Performance

The tool is optimized for natural language processing:

- Efficient Levenshtein distance implementation
- Configurable filtering to reduce unnecessary comparisons
- Parallel processing for multiple files
- Memory-efficient section extraction

Run benchmarks:

```bash
cargo bench
```

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## License

MIT License - see LICENSE file for details.
