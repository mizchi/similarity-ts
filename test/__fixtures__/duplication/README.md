# Code Duplication Test Fixtures

This directory contains test fixtures demonstrating various types of code duplication patterns found in real-world TypeScript projects. These fixtures are designed to test and validate code similarity detection algorithms.

## Directory Structure

### `/exact/`
Contains examples of copy-paste duplication where code is duplicated with minimal changes:
- **service_duplication_1.ts & service_duplication_2.ts**: Nearly identical service classes with only entity name changes (Customer vs User)

### `/structural/`
Contains examples of structural duplication where code follows the same pattern but with different implementations:
- **array_iteration_pattern_1.ts & array_iteration_pattern_2.ts**: Array filtering/mapping using imperative vs functional styles
- **error_handling_pattern_1.ts & error_handling_pattern_2.ts**: Repeated try-catch patterns vs extracted helper function
- **loop_pattern_1.ts**: Multiple functions with identical loop structures
- **visitnode_pattern_*.ts**: AST traversal patterns with similar recursive structures

### `/semantic/`
Contains examples of semantic duplication where code achieves the same behavior through different structures:
- **validation_pattern_1.ts & validation_pattern_2.ts**: Form validation using early returns vs rule-based approach
- **state_management_pattern_1.ts & state_management_pattern_2.ts**: Redux-style reducer vs class-based state store
- **async_operations_1.ts & async_operations_2.ts**: Async/await class methods vs promise-based functional approach

## Usage Examples

### Detecting Copy-Paste Duplication
```typescript
const similarity = calculateAPTEDSimilarity(code1, code2, { renameCost: 0.1 });
// Expected: > 95% similarity for exact duplicates
```

### Detecting Structural Patterns
```typescript
const functions = extractFunctions(code);
const duplicates = findDuplicateFunctions(functions, {
  similarityThreshold: 0.8,
  ignoreParamNames: true
});
```

### Comparing Semantic Equivalents
```typescript
const comparison = compareFunctions(func1, func2, {
  ignoreThis: true,
  ignoreParamNames: true
});
```

## Real-World Patterns

These fixtures are based on actual duplication patterns found in the similarity-ts codebase and common patterns from TypeScript projects:

1. **Service Classes**: The UserService/ProductService pattern is extremely common in REST APIs
2. **Error Handling**: Repeated try-catch blocks around fetch calls
3. **Validation Logic**: Form validation with similar rules but different implementations
4. **State Management**: Different paradigms (OOP vs FP) for managing application state
5. **Array Operations**: Filter/map/reduce patterns that could be abstracted

## Testing Strategy

1. **High Similarity (>90%)**: Exact duplicates with renamed identifiers
2. **Medium Similarity (70-90%)**: Structural duplicates that could be refactored
3. **Low Similarity (50-70%)**: Semantic duplicates requiring deeper analysis
4. **Function-Level Analysis**: Comparing individual functions rather than entire files

## Contributing

When adding new fixtures:
1. Use real-world patterns, not contrived examples
2. Include comments explaining the duplication type
3. Ensure fixtures compile without errors
4. Add corresponding test cases in `duplication_detection_test.ts`