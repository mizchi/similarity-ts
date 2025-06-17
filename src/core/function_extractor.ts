// Function extraction - Step 1: Simple refactoring without context management
import { parseTypeScript } from "../parser.ts";
import { calculateAPTEDSimilarityFromAST } from "./apted.ts";
import { traverseAST, createVisitor } from "./ast_traversal.ts";
import { normalizeSemantics } from "./semantic_normalizer.ts";

export interface FunctionDefinition {
  name: string;
  type: "function" | "method" | "arrow" | "constructor";
  parameters: string[];
  body: string;
  ast: any;
  startLine: number;
  endLine: number;
  className?: string;
}

interface ExtractorState {
  functions: FunctionDefinition[];
  code: string;
  lines: string[];
  className?: string; // Temporary - will be replaced with context stack
}

export function extractFunctions(code: string): FunctionDefinition[] {
  const ast = parseTypeScript("temp.ts", code);
  const state: ExtractorState = {
    functions: [],
    code,
    lines: code.split("\n"),
    className: undefined,
  };

  // Helper functions remain the same
  function getLineNumber(offset: number): number {
    let charCount = 0;
    for (let i = 0; i < state.lines.length; i++) {
      charCount += state.lines[i].length + 1;
      if (charCount > offset) {
        return i + 1;
      }
    }
    return state.lines.length;
  }

  function extractBodyCode(bodyNode: any): string {
    if (!bodyNode) {
      return "";
    }

    const start = bodyNode.start ?? bodyNode.span?.start;
    const end = bodyNode.end ?? bodyNode.span?.end;

    if (start === undefined || end === undefined || start >= end || start < 0 || end > code.length) {
      return "";
    }

    if (bodyNode.type === "BlockStatement") {
      const fullBody = code.substring(start, end);
      const match = fullBody.match(/^\s*{\s*([\s\S]*?)\s*}\s*$/);
      if (match) {
        return match[1].trim();
      }
    }

    return code.substring(start, end).trim();
  }

  function extractParameters(params: any): string[] {
    if (!params) return [];

    const paramList = Array.isArray(params) ? params : params.items || params.parameters || [];

    if (!Array.isArray(paramList)) return [];

    return paramList
      .map((param: any) => {
        if (param.type === "Identifier") {
          return param.name;
        }
        if (param.type === "FormalParameter" && param.pattern?.type === "BindingIdentifier") {
          return param.pattern.name;
        }
        if (param.type === "BindingIdentifier") {
          return param.name;
        }
        if (param.pattern?.type === "BindingIdentifier") {
          return param.pattern.name;
        }
        return "unknown";
      })
      .filter((p) => p !== "unknown");
  }

  // Use ast_traversal
  traverseAST(
    ast.program,
    createVisitor<ExtractorState>({
      // Track class context manually for now
      enter(node, state) {
        if (node.type === "ClassDeclaration" && node.id) {
          state.className = node.id.name;
        }
      },

      leave(node, state) {
        if (node.type === "ClassDeclaration") {
          state.className = undefined;
        }
      },

      FunctionDeclaration(node, state) {
        if (node.id) {
          state.functions.push({
            name: node.id.name,
            type: "function",
            parameters: extractParameters(node.params),
            body: node.body ? extractBodyCode(node.body) : "",
            ast: node,
            startLine: getLineNumber(node.start ?? node.span?.start ?? 0),
            endLine: getLineNumber(node.end ?? node.span?.end ?? 0),
          });
        }
      },

      MethodDefinition(node, state) {
        if (node.key) {
          const methodName = node.key.name || "unknown";
          const isConstructor = node.kind === "constructor";

          state.functions.push({
            name: isConstructor ? "constructor" : methodName,
            type: isConstructor ? "constructor" : "method",
            parameters: extractParameters(node.value?.params),
            body: node.value?.body ? extractBodyCode(node.value.body) : "",
            ast: node.value,
            startLine: getLineNumber(node.start ?? node.span?.start ?? 0),
            endLine: getLineNumber(node.end ?? node.span?.end ?? 0),
            className: state.className,
          });
        }
      },

      VariableDeclarator(node, state) {
        if (
          node.init?.type === "ArrowFunctionExpression" &&
          (node.id?.type === "BindingIdentifier" || node.id?.type === "Identifier")
        ) {
          let bodyContent = "";
          if (node.init.body) {
            bodyContent = extractBodyCode(node.init.body);
          } else {
            const funcStart = node.init.start ?? node.init.span?.start ?? 0;
            const funcEnd = node.init.end ?? node.init.span?.end ?? 0;
            const funcCode = code.substring(funcStart, funcEnd);
            const arrowPos = funcCode.indexOf("=>");
            if (arrowPos !== -1) {
              bodyContent = funcCode.substring(arrowPos + 2).trim();
            }
          }

          state.functions.push({
            name: node.id.name,
            type: "arrow",
            parameters: extractParameters(node.init.params),
            body: bodyContent,
            ast: node.init,
            startLine: getLineNumber(node.start ?? node.span?.start ?? 0),
            endLine: getLineNumber(node.end ?? node.span?.end ?? 0),
          });
        }

        if (
          node.init?.type === "FunctionExpression" &&
          (node.id?.type === "BindingIdentifier" || node.id?.type === "Identifier")
        ) {
          state.functions.push({
            name: node.id.name,
            type: "function",
            parameters: extractParameters(node.init.params),
            body: node.init.body ? extractBodyCode(node.init.body) : "",
            ast: node.init,
            startLine: getLineNumber(node.start ?? node.span?.start ?? 0),
            endLine: getLineNumber(node.end ?? node.span?.end ?? 0),
          });
        }
      },
    }),
    state,
  );

  return state.functions;
}

// Other functions that need to be reimplemented
export interface FunctionComparisonResult {
  similarity: number;
  isStructurallyEquivalent: boolean;
  differences: {
    thisUsage: boolean;
    scopeVariables: string[];
    parameterNames: boolean;
  };
}

/**
 * Compare two function definitions
 */
export function compareFunctions(
  func1: FunctionDefinition,
  func2: FunctionDefinition,
  options: {
    ignoreThis?: boolean;
    ignoreParamNames?: boolean;
  } = {},
): FunctionComparisonResult {
  // Check if functions are defined
  if (!func1 || !func2) {
    return {
      similarity: 0,
      isStructurallyEquivalent: false,
      differences: {
        thisUsage: false,
        scopeVariables: [],
        parameterNames: true,
      },
    };
  }

  // Check if they have the same number of parameters
  const sameParamCount = (func1.parameters?.length || 0) === (func2.parameters?.length || 0);

  // Normalize bodies for comparison
  const type1 = func1.type === "constructor" ? "method" : func1.type;
  const type2 = func2.type === "constructor" ? "method" : func2.type;

  const body1 = normalizeSemantics(func1.body, type1, func1.parameters || [], {
    normalizeThis: options.ignoreThis,
    normalizeParams: options.ignoreParamNames,
  });

  const body2 = normalizeSemantics(func2.body, type2, func2.parameters || [], {
    normalizeThis: options.ignoreThis,
    normalizeParams: options.ignoreParamNames,
  });

  // Check for this usage
  const thisInFunc1 = /\bthis\s*\./.test(func1.body);
  const thisInFunc2 = /\bthis\s*\./.test(func2.body);
  const differentThisUsage = thisInFunc1 !== thisInFunc2;

  // Extract scope variables (simplified - just looks for assignments)
  const scopeVars1 = extractScopeVariables(func1.body);
  const scopeVars2 = extractScopeVariables(func2.body);

  // Calculate similarity
  const similarity = calculateBodySimilarity(body1, body2);

  // Check structural equivalence
  const isStructurallyEquivalent =
    sameParamCount && similarity > 0.9 && (!differentThisUsage || options.ignoreThis === true);

  return {
    similarity,
    isStructurallyEquivalent,
    differences: {
      thisUsage: differentThisUsage,
      scopeVariables: [...new Set([...scopeVars1, ...scopeVars2])],
      parameterNames: !arraysEqual(func1.parameters || [], func2.parameters || []),
    },
  };
}

/**
 * Extract variable declarations from function body
 */
function extractScopeVariables(body: string): string[] {
  const variables: string[] = [];

  // Match let, const, var declarations
  const varMatches = body.matchAll(/\b(?:let|const|var)\s+(\w+)/g);
  for (const match of varMatches) {
    variables.push(match[1]);
  }

  return variables;
}

/**
 * Calculate similarity between two function bodies using APTED
 */
function calculateBodySimilarity(body1: string, body2: string): number {
  // Use APTED algorithm for more accurate AST-based comparison
  try {
    const ast1 = parseTypeScript("body1.ts", body1);
    const ast2 = parseTypeScript("body2.ts", body2);
    return calculateAPTEDSimilarityFromAST(ast1, ast2);
  } catch {
    // Fallback to simple comparison
    return body1 === body2 ? 1.0 : 0.0;
  }
}

/**
 * Check if two arrays are equal
 */
function arraysEqual(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((val, index) => val === arr2[index]);
}

/**
 * Find duplicate functions across different contexts
 */
export function findDuplicateFunctions(
  functions: FunctionDefinition[],
  options: {
    ignoreThis?: boolean;
    ignoreParamNames?: boolean;
    similarityThreshold?: number;
  } = {},
): Array<[FunctionDefinition, FunctionDefinition, FunctionComparisonResult]> {
  const duplicates: Array<[FunctionDefinition, FunctionDefinition, FunctionComparisonResult]> = [];
  const threshold = options.similarityThreshold || 0.8;

  for (let i = 0; i < functions.length; i++) {
    for (let j = i + 1; j < functions.length; j++) {
      const func1 = functions[i];
      const func2 = functions[j];

      // Skip if both are from the same class
      if (func1.className && func1.className === func2.className) {
        continue;
      }

      const comparison = compareFunctions(func1, func2, options);

      if (comparison.similarity >= threshold) {
        duplicates.push([func1, func2, comparison]);
      }
    }
  }

  return duplicates;
}
