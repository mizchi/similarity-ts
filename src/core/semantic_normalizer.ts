// Semantic normalization for function comparison
// import { parseTypeScript } from '../parser.ts';
// import { traverseAST, createVisitor } from './ast_traversal.ts';
// import type { Program } from './oxc_types.ts';

export interface NormalizationOptions {
  normalizeThis?: boolean;
  normalizeParams?: boolean;
  normalizeLocalVars?: boolean;
  preserveSemantics?: boolean;
}

export interface SemanticPattern {
  type: "method_call" | "property_access" | "assignment" | "return";
  target: "this" | "parameter" | "local" | "external";
  identifier: string;
}

/**
 * Normalize a function body to handle this vs parameter differences
 */
export function normalizeSemantics(
  functionBody: string,
  functionType: "method" | "function" | "arrow",
  parameters: string[],
  options: NormalizationOptions = {},
): string {
  // AST-based pattern extraction could be used for more advanced normalization in the future
  // const ast = parseTypeScript('temp.ts', `function temp() { ${functionBody} }`);
  // const patterns = extractSemanticPatterns(ast.program, parameters);

  let normalized = functionBody;

  if (options.normalizeThis && functionType === "method") {
    // Convert this.property to __context__.property
    normalized = normalized.replace(/\bthis\s*\.\s*(\w+)/g, "__context__.$1");
  }

  if (options.normalizeParams) {
    // Convert parameter access to generic form
    parameters.forEach((param, index) => {
      const regex = new RegExp(`\\b${param}\\b(?!\\s*:)`, "g");
      normalized = normalized.replace(regex, `__param${index}__`);
    });
  }

  if (options.normalizeLocalVars) {
    // Extract and normalize local variable declarations
    const localVars = extractLocalVariables(functionBody);
    localVars.forEach((varName, index) => {
      const regex = new RegExp(`\\b${varName}\\b(?!\\s*:)`, "g");
      normalized = normalized.replace(regex, `__local${index}__`);
    });
  }

  return normalized;
}

// /**
//  * Extract semantic patterns from AST using ast_traversal
//  * This function could be used for more advanced semantic analysis in the future
//  */
// function extractSemanticPatterns(
//   program: Program,
//   parameters: string[]
// ): SemanticPattern[] {
//   interface PatternState {
//     patterns: SemanticPattern[];
//     paramSet: Set<string>;
//   }
//
//   const state: PatternState = {
//     patterns: [],
//     paramSet: new Set(parameters)
//   };
//
//   traverseAST(program, createVisitor<PatternState>({
//     MemberExpression(node, state) {
//       if (node.object?.type === 'ThisExpression') {
//         state.patterns.push({
//           type: 'property_access',
//           target: 'this',
//           identifier: node.property?.name || 'unknown'
//         });
//       } else if (node.object?.type === 'Identifier') {
//         const objName = node.object.name;
//         const target = state.paramSet.has(objName) ? 'parameter' : 'external';
//         state.patterns.push({
//           type: 'property_access',
//           target,
//           identifier: objName
//         });
//       }
//     },
//
//     CallExpression(node, state) {
//       if (node.callee?.type === 'MemberExpression') {
//         const memberExpr = node.callee;
//         if (memberExpr.object?.type === 'ThisExpression') {
//           state.patterns.push({
//             type: 'method_call',
//             target: 'this',
//             identifier: memberExpr.property?.name || 'unknown'
//           });
//         }
//       }
//     }
//   }), state);
//
//   return state.patterns;
// }

/**
 * Extract local variable names from function body
 */
function extractLocalVariables(body: string): string[] {
  const variables: string[] = [];

  // Match variable declarations
  const patterns = [
    /\b(?:let|const|var)\s+(\w+)(?:\s*[:=])/g,
    /\b(?:let|const|var)\s+\{([^}]+)\}/g, // destructuring
    /\b(?:let|const|var)\s+\[([^\]]+)\]/g, // array destructuring
  ];

  for (const pattern of patterns) {
    const matches = body.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        // Handle simple declarations
        variables.push(match[1]);
      }
    }
  }

  return [...new Set(variables)];
}

/**
 * Convert a class method to a standalone function
 */
export function methodToFunction(
  methodBody: string,
  methodName: string,
  parameters: string[],
  className: string,
): string {
  // Create context parameter
  const contextParam = `${className.toLowerCase()}Context`;
  const newParams = [contextParam, ...parameters];

  // Replace this with context parameter
  let functionBody = methodBody.replace(/\bthis\s*\.\s*(\w+)/g, `${contextParam}.$1`);

  // Build function declaration
  return `function ${methodName}(${newParams.join(", ")}) {
${functionBody}
}`;
}

/**
 * Convert a standalone function to a method
 */
export function functionToMethod(
  functionBody: string,
  functionName: string,
  parameters: string[],
  contextParamIndex: number = 0,
): string {
  if (parameters.length === 0) return functionBody;

  const contextParam = parameters[contextParamIndex];
  const methodParams = parameters.filter((_, i) => i !== contextParamIndex);

  // Replace context parameter with this
  let methodBody = functionBody;
  const regex = new RegExp(`\\b${contextParam}\\s*\\.\\s*(\\w+)`, "g");
  methodBody = methodBody.replace(regex, "this.$1");

  // Remove context parameter from function calls if present
  const callRegex = new RegExp(`\\b(\\w+)\\s*\\(\\s*${contextParam}\\s*,`, "g");
  methodBody = methodBody.replace(callRegex, "$1(");

  return `${functionName}(${methodParams.join(", ")}) {
${methodBody}
}`;
}

/**
 * Determine if two functions are semantically equivalent
 */
export function areSemanticallySimilar(
  func1Body: string,
  func1Type: "method" | "function" | "arrow",
  func1Params: string[],
  func2Body: string,
  func2Type: "method" | "function" | "arrow",
  func2Params: string[],
  threshold: number = 0.9,
): boolean {
  // Normalize both functions
  const normalized1 = normalizeSemantics(func1Body, func1Type, func1Params, {
    normalizeThis: true,
    normalizeParams: true,
    normalizeLocalVars: true,
  });

  const normalized2 = normalizeSemantics(func2Body, func2Type, func2Params, {
    normalizeThis: true,
    normalizeParams: true,
    normalizeLocalVars: true,
  });

  // Compare normalized versions
  const similarity = calculateNormalizedSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

/**
 * Calculate similarity between normalized function bodies
 */
function calculateNormalizedSimilarity(body1: string, body2: string): number {
  // Remove extra whitespace and normalize
  const norm1 = body1.replace(/\s+/g, " ").trim();
  const norm2 = body2.replace(/\s+/g, " ").trim();

  if (norm1 === norm2) return 1.0;

  // Token-based comparison
  const tokens1 = tokenize(norm1);
  const tokens2 = tokenize(norm2);

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Simple tokenizer for normalized code
 */
function tokenize(code: string): string[] {
  return code
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => token.toLowerCase());
}
