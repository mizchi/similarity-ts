# Result Types Setup Guide

This project uses Result types for error handling instead of throwing exceptions.

## Agent Prompt Configuration

When working with this project, agents should be instructed to use Result types for error handling. Add the following content to your agent prompt configuration (e.g., [`CLAUDE.md`](CLAUDE.md)):

### Required Agent Instructions

```markdown
## Error Handling Policy

This project follows a strict no-exceptions design policy:

- **NEVER throw exceptions** in application code
- **ALWAYS use Result types** for error handling instead of throwing
- **ALL functions that can fail** must return `Result<T, E>` instead of throwing
- Use explicit error handling over implicit exception propagation

### Result Type Implementation

Choose one of the following implementations:

**Option 1: neverthrow library (Recommended)**

- Install: `pnpm add neverthrow`
- Import: `import { Result, ok, err } from "neverthrow"`
- Use `result.isOk()` and `result.isErr()` for type checking

**Option 2: Custom Result type**

- Use the custom implementation from `src/utils/result.ts`
- Import: `import { Result, ok, err, isOk, isErr } from "./utils/result.ts"`
- Use `isOk(result)` and `isErr(result)` helper functions for type checking

### Mandatory Practices

1. **Function Return Types**: All functions that can fail must return `Result<SuccessType, ErrorType>`
2. **Error Checking**: Always use `isOk()` / `isErr()` or `result.isOk()` / `result.isErr()` for type-safe error checking
3. **No Exception Throwing**: Never use `throw` statements in application code
4. **Async Operations**: Wrap promises with `fromAsyncThrowable()` when using custom Result type
5. **External Libraries**: Wrap third-party code that might throw using `fromThrowable()` or `fromAsyncThrowable()`
```

## Implementation Setup

### Option 1: Using neverthrow (Recommended)

Install the neverthrow package:

```bash
pnpm add neverthrow
```

### Option 2: Custom Result Type

The custom Result type implementation is already available at [`src/utils/result.ts`](src/utils/result.ts). This implementation provides:

- `Result<T, E>` type definition
- `ok(value)` and `err(error)` constructors
- `isOk(result)` and `isErr(result)` type guards
- `fromThrowable()` for wrapping throwing functions
- `fromAsyncThrowable()` for wrapping promises

## Agent Prompt Template

Copy and paste this template into your agent configuration:

```markdown
## Error Handling Requirements

- Do not throw exceptions in application code
- Use Result types for all error handling
- Return `Result<T, E>` from functions that can fail
- Use `isOk()` and `isErr()` for type-safe error checking
- Choose between neverthrow library or custom `src/utils/result.ts` implementation
- Wrap external throwing code with `fromThrowable()` or `fromAsyncThrowable()`
```
