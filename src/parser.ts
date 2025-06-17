// TypeScript parser wrapper
import * as oxc from "oxc-parser";

/**
 * Parse TypeScript code into AST
 */
export const parseTypeScript = oxc.parseSync;
