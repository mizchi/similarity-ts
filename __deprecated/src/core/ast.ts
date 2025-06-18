// AST-related pure functions with proper oxc-parser types
import { parseTypeScript } from "../parser.ts";
import { levenshtein } from "./levenshtein.ts";
import type { ASTNode, Program } from "./oxc_types.ts";
import type { ParseResult } from "oxc-parser";

/**
 * Extract structure from AST node with proper type handling
 */
function extractStructure(node: ASTNode | any): any {
  if (!node || typeof node !== "object") {
    return node;
  }

  const skipKeys = new Set(["range", "loc", "span", "start", "end"]);
  const result: any = {};

  if (node.type) {
    result.type = node.type;
  }

  for (const [key, value] of Object.entries(node)) {
    if (skipKeys.has(key)) continue;

    if (Array.isArray(value)) {
      result[key] = value.map((item) => extractStructure(item));
    } else if (typeof value === "object" && value !== null) {
      result[key] = extractStructure(value);
    } else if (key !== "type") {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Convert AST to string representation
 */
export function astToString(ast: ParseResult | Program | ASTNode): string {
  // Handle ParseResult from oxc-parser
  if ("program" in ast && !("type" in ast)) {
    return JSON.stringify(extractStructure(ast.program), null, 2);
  }
  // Handle direct AST nodes
  return JSON.stringify(extractStructure(ast), null, 2);
}

/**
 * Calculate similarity between two code strings
 */
export function calculateSimilarity(code1: string, code2: string): number {
  try {
    const ast1 = parseTypeScript("file1.ts", code1);
    const ast2 = parseTypeScript("file2.ts", code2);

    const str1 = astToString(ast1);
    const str2 = astToString(ast2);

    const distance = levenshtein(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    return maxLength === 0 ? 1.0 : 1 - distance / maxLength;
  } catch (error) {
    // If parsing fails, fall back to simple string comparison
    return code1 === code2 ? 1.0 : 0.0;
  }
}

/**
 * Compare structures and return similarity metrics
 */
export function compareStructures(
  ast1: ParseResult,
  ast2: ParseResult,
): {
  similarity: number;
  distance: number;
  maxLength: number;
  structure1: string;
  structure2: string;
} {
  const str1 = astToString(ast1);
  const str2 = astToString(ast2);

  const distance = levenshtein(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = maxLength === 0 ? 1.0 : 1 - distance / maxLength;

  return {
    similarity,
    distance,
    maxLength,
    structure1: str1,
    structure2: str2,
  };
}
