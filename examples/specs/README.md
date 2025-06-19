# Specification Examples

These examples demonstrate the core functionality of similarity-ts.

## Files

- `duplicate-functions.ts` - Function similarity detection examples
- `duplicate-types.ts` - Type similarity detection examples (requires --experimental-types)

## Expected Results

### Function Detection
```bash
similarity-ts duplicate-functions.ts --threshold 0.8 --min-tokens 20
```
Should detect:
- calculateUserAge vs calculateCustomerAge (~95% similarity)
- findMaxValue vs getMaximumValue (~85% similarity)
- processUserData vs processCustomerData (~90% similarity)

### Type Detection
```bash
similarity-ts duplicate-types.ts --experimental-types --threshold 0.8
```
Should detect:
- User vs Customer (100% similarity)
- UserResponse vs CustomerResponse (~85% similarity)
- ApiResponse vs ServiceResponse (100% similarity)