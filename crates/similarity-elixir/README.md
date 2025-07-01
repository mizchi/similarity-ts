# similarity-elixir

Elixir code similarity analyzer using Tree-sitter parser.

## Installation

```bash
cargo install similarity-elixir
```

## Usage

```bash
# Analyze a single Elixir file
similarity-elixir lib/my_module.ex

# Analyze multiple files
similarity-elixir lib/

# Set similarity threshold (default: 0.85)
similarity-elixir lib/ -t 0.9

# Show all functions
similarity-elixir lib/my_module.ex --show-functions

# Print similar function pairs with code
similarity-elixir lib/ -p
```

## Options

- `-t, --threshold <THRESHOLD>` - Similarity threshold (0.0-1.0, default: 0.85)
- `-p, --print` - Print similar function pairs with source code
- `--show-functions` - Show all functions found
- `--filter-function <NAME>` - Filter results to functions containing NAME
- `--filter-function-body <PATTERN>` - Filter by function body content
- `--min-lines <N>` - Minimum function lines (default: 5)
- `--rename-cost <COST>` - Cost for renaming operations (default: 1.0)

## Features

- Detects similar functions across Elixir modules
- Supports pattern matching and guard clauses
- Handles pipe operators and anonymous functions
- Recognizes module, protocol, and implementation definitions
- Fast AST-based comparison using Tree-sitter

## Example

```elixir
# Input: lib/calculator.ex
defmodule Calculator do
  def add(a, b) do
    a + b
  end

  def sum(x, y) do
    x + y
  end
end
```

```bash
$ similarity-elixir lib/calculator.ex
Analyzing Elixir code similarity...

Found 2 functions
  - add
  - sum

Duplicates in lib/calculator.ex:
------------------------------------------------------------
  lib/calculator.ex:2-4 add <-> lib/calculator.ex:6-8 sum
  Similarity: 100.00%
```

## Algorithm

Uses Tree Structure Edit Distance (TSED) to compare function ASTs with configurable rename costs and size penalties.

## License

MIT