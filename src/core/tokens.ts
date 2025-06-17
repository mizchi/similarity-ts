// Token extraction functions from code_index.ts
import { parseTypeScript } from '../parser.ts';

/**
 * Extract tokens from TypeScript AST
 */
export function extractTokens(code: string): Set<string> {
  const tokens = new Set<string>();

  try {
    const ast = parseTypeScript("file.ts", code);

    const visit = (node: any) => {
      if (!node || typeof node !== "object") return;

      // Add node type as token
      if (node.type) {
        tokens.add(node.type);
      }

      // Extract identifiers
      if (node.type === "Identifier" && node.name) {
        tokens.add(node.name);
      }

      // Extract string literals
      if (node.type === "StringLiteral" && node.value) {
        tokens.add(`"${node.value}"`);
      }

      // Extract number literals
      if (node.type === "NumericLiteral" && node.value !== undefined) {
        tokens.add(String(node.value));
      }

      // Extract function names
      if (
        (node.type === "FunctionDeclaration" ||
          node.type === "FunctionExpression") &&
        node.id?.name
      ) {
        tokens.add(`fn:${node.id.name}`);
      }

      // Extract class names
      if (node.type === "ClassDeclaration" && node.id?.name) {
        tokens.add(`class:${node.id.name}`);
      }

      // Extract keywords
      if (node.type === "ReturnStatement") {
        tokens.add("return");
      }
      if (node.type === "IfStatement") {
        tokens.add("if");
      }
      if (node.type === "ForStatement") {
        tokens.add("for");
      }
      if (node.type === "WhileStatement") {
        tokens.add("while");
      }

      // Recursively visit children
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(visit);
        } else if (typeof value === "object" && value !== null) {
          visit(value);
        }
      }
    };

    visit(ast.program);
  } catch (error) {
    // If parsing fails, fall back to simple tokenization
    const simpleTokens = code.match(/\b\w+\b/g) || [];
    simpleTokens.forEach((token) => tokens.add(token));
  }

  return tokens;
}

/**
 * Extract weighted features for SimHash
 */
export function extractFeatures(code: string): Map<string, number> {
  const features = new Map<string, number>();

  try {
    const ast = parseTypeScript("file.ts", code);

    const visit = (node: any, depth: number = 0) => {
      if (!node || typeof node !== "object") return;

      // Weight based on node type and depth
      const baseWeight = Math.max(1, 10 - depth);

      // Important structural elements get higher weight
      if (node.type === "FunctionDeclaration" && node.id?.name) {
        features.set(`func:${node.id.name}`, baseWeight * 3);
      }

      if (node.type === "ClassDeclaration" && node.id?.name) {
        features.set(`class:${node.id.name}`, baseWeight * 3);
      }

      if (node.type === "MethodDefinition" && node.key?.name) {
        features.set(`method:${node.key.name}`, baseWeight * 2);
      }

      if (node.type === "Identifier" && node.name) {
        const currentWeight = features.get(node.name) || 0;
        features.set(node.name, currentWeight + baseWeight);
      }

      // Extract import statements
      if (node.type === "ImportDeclaration" && node.source?.value) {
        features.set(`import:${node.source.value}`, baseWeight * 2);
      }

      // Recursively visit children
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach((child) => visit(child, depth + 1));
        } else if (typeof value === "object" && value !== null) {
          visit(value, depth + 1);
        }
      }
    };

    visit(ast.program);
  } catch (error) {
    // Fallback to simple feature extraction
    const words = code.match(/\b\w+\b/g) || [];
    for (const word of words) {
      features.set(word, (features.get(word) || 0) + 1);
    }
  }

  return features;
}
