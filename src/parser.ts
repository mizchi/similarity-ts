// TypeScript parser wrapper
import * as oxc from "oxc-parser";

/**
 * Parse TypeScript code into AST synchronously
 * @deprecated Use parseTypeScriptAsync for better performance
 */
export const parseTypeScript = oxc.parseSync;

/**
 * Parse TypeScript code into AST asynchronously
 */
export const parseTypeScriptAsync = oxc.parseAsync;

/**
 * Parse multiple TypeScript files in parallel
 */
export async function parseMultipleAsync(
  files: Array<{ filename: string; code: string }>,
): Promise<Array<{ filename: string; ast: oxc.ParseResult; error?: Error }>> {
  const promises = files.map(async ({ filename, code }) => {
    try {
      const ast = await parseTypeScriptAsync(filename, code);
      return { filename, ast };
    } catch (error) {
      return { filename, ast: null as any, error: error as Error };
    }
  });

  return Promise.all(promises);
}
