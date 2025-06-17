# MCP (Model Context Protocol) Setup

MCP allows Claude to use specialized tools for better code understanding and manipulation.

## TypeScript MCP

Provides TypeScript language server capabilities to Claude.

### Installation

```bash
pnpm add typescript typescript-mcp -D
```

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "typescript": {
      "command": "npx",
      "args": ["typescript-mcp"]
    }
  }
}
```

### With TypeScript Native (Optional)

For faster performance, install TypeScript native preview:

```bash
pnpm add @typescript/native-preview typescript typescript-mcp -D
```

Update `.mcp.json`:

```json
{
  "mcpServers": {
    "typescript": {
      "command": "npx",
      "env": {
        "TSGO": "true"
      },
      "args": ["typescript-mcp"]
    }
  }
}
```

### Features

- **Rename symbols**: Safe refactoring across files
- **Find references**: Locate all usages of a symbol
- **Move files/directories**: Update imports automatically
- **Type information**: Get detailed type analysis
- **Diagnostics**: Real-time TypeScript errors

### Usage in CLAUDE.md

Add this to your project's CLAUDE.md to ensure proper tool usage:

```markdown
## TypeScript Refactoring

When refactoring TypeScript code, use MCP tools instead of basic edit:

- Rename: Use `mcp__typescript__rename_symbol`
- Move files: Use `mcp__typescript__move_file`
- Find usages: Use `mcp__typescript__find_references`
```

## Readability MCP

Extract clean markdown content from web pages.

### Installation

Add to `.claude/claude.json`:

```json
{
  "mcpServers": {
    "readability": {
      "command": "npx",
      "args": ["-y", "@mizchi/readability", "--mcp"]
    }
  }
}
```

### Usage

Claude can now fetch and summarize web content:

```markdown
Given a URL, use read_url_content_as_markdown to extract and summarize the content.
```

## More Information

- [typescript-mcp](https://github.com/mizchi/typescript-mcp)
- [MCP Documentation](https://docs.anthropic.com/docs/mcp)
