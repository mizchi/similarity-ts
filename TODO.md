# TODO

## Features to Implement

### .similarity-ignore Support
- [ ] Implement `.similarity-ignore` file parsing
- [ ] Support `:function()` syntax for ignoring specific function names
- [ ] Support wildcards (`*`) in function patterns
- [ ] Common patterns to ignore:
  - Test setup/teardown functions (setUp, tearDown, beforeEach, etc.)
  - Test helpers (test*, expect*, describe*)
  - React lifecycle methods
  - Framework hooks (useEffect, useState, etc.)
  - Generated code (*Generated, *_pb, *_grpc)
  - Build tool artifacts (__webpack*, etc.)
  - Common boilerplate (main, init, constructor)

### Other Improvements
- [ ] Add support for custom ignore patterns via CLI flags
- [ ] Implement caching for improved performance on repeated runs
- [ ] Add progress bar for large codebases
- [ ] Support for more languages (JavaScript without TypeScript types)