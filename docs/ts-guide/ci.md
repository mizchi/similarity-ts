# CI/CD Setup

This project includes GitHub Actions configuration for continuous integration.

## GitHub Actions Workflow

The CI workflow runs on every push to main and on pull requests.

### Workflow Steps

1. **Format Check** - Ensures code follows formatting standards
2. **Lint** - Runs oxlint to check for code quality issues
3. **Type Check** - Validates TypeScript types
4. **Tests** - Runs the test suite

### Configuration File

Located at `.github/workflows/ci.yaml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

## Available Scripts

These scripts are run in CI and can be run locally:

- `pnpm format:check` - Check if files are properly formatted (Biome)
- `pnpm lint` - Run linter checks (oxlint)
- `pnpm typecheck` - Check TypeScript types
- `pnpm test` - Run test suite (Vitest)

## Local Development

Before pushing changes, run all CI checks locally:

```bash
# Run all checks
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test

# Or fix formatting issues
pnpm format
```

## Customization

### Adding Coverage

To add test coverage to CI:

```yaml
- run: pnpm test:cov
- uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

### Matrix Testing

To test across multiple Node.js versions:

```yaml
strategy:
  matrix:
    node-version: [20, 22]
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### Caching Dependencies

The workflow already includes pnpm caching via `cache: pnpm` in the setup-node action.

## Troubleshooting

### Format Check Failures

If CI fails on format check:

```bash
# Fix formatting locally
pnpm format

# Commit the changes
git add .
git commit -m "fix: apply formatting"
```

### Lint Failures

Check the specific lint errors and fix them:

```bash
# See detailed lint errors
pnpm lint:strict
```

### Type Check Failures

Ensure all TypeScript errors are resolved:

```bash
# Check types with detailed output
pnpm typecheck
```
