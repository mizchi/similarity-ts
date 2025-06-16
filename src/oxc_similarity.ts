import oxc from "oxc-parser";
import { levenshtein } from "./levenshtein.ts";
import { APTED, oxcToTreeNode } from "./oxc_apted.ts";
import type { APTEDConfig } from "./oxc_apted.ts";

export type { APTEDConfig };

export interface OxcNode {
  type: string;
  [key: string]: any;
}

export interface OxcParseResult {
  program: {
    type: string;
    body: OxcNode[];
  };
  errors: any[];
  comments: any[];
}

export function parseTypeScript(filename: string, code: string): OxcParseResult {
  return oxc.parseSync(filename, code);
}

export function extractStructure(node: OxcNode): string {
  const parts: string[] = [node.type];
  
  switch (node.type) {
    case "FunctionDeclaration":
    case "FunctionExpression":
      if (node.id?.name) parts.push(node.id.name);
      if (node.params) parts.push(`(${node.params.length})`);
      break;
      
    case "ClassDeclaration":
    case "ClassExpression":
      if (node.id?.name) parts.push(node.id.name);
      break;
      
    case "VariableDeclaration":
      parts.push(node.kind);
      if (node.declarations?.[0]?.id?.name) {
        parts.push(node.declarations[0].id.name);
      }
      break;
      
    case "TSInterfaceDeclaration":
      if (node.id?.name) parts.push(node.id.name);
      break;
      
    case "TSTypeAliasDeclaration":
      if (node.id?.name) parts.push(node.id.name);
      break;
      
    case "TSEnumDeclaration":
      if (node.id?.name) parts.push(node.id.name);
      break;
  }
  
  return parts.join(":");
}

export function astToString(ast: OxcParseResult): string {
  const structures: string[] = [];
  const visited = new WeakSet();
  const stack: OxcNode[] = [ast.program];
  
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || visited.has(node)) continue;
    
    visited.add(node);
    
    if (node.type) {
      structures.push(extractStructure(node));
    }
    
    for (const key in node) {
      if (key === "parent" || key === "scope") continue;
      
      const value = node[key];
      if (Array.isArray(value)) {
        for (let i = value.length - 1; i >= 0; i--) {
          if (typeof value[i] === "object" && value[i] !== null) {
            stack.push(value[i]);
          }
        }
      } else if (typeof value === "object" && value !== null) {
        stack.push(value);
      }
    }
  }
  
  return structures.join("\n");
}

export function calculateSimilarity(code1: string, code2: string): number {
  try {
    const ast1 = parseTypeScript("file1.ts", code1);
    const ast2 = parseTypeScript("file2.ts", code2);
    
    if (ast1.errors.length > 0 || ast2.errors.length > 0) {
      console.warn("Parse errors detected, similarity may be inaccurate");
    }
    
    const str1 = astToString(ast1);
    const str2 = astToString(ast2);
    
    const distance = levenshtein(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  } catch (error) {
    console.error("Failed to calculate similarity:", error);
    return 0;
  }
}

export function compareStructures(code1: string, code2: string): {
  similarity: number;
  structure1: string;
  structure2: string;
} {
  const ast1 = parseTypeScript("file1.ts", code1);
  const ast2 = parseTypeScript("file2.ts", code2);
  
  const structure1 = astToString(ast1);
  const structure2 = astToString(ast2);
  const similarity = calculateSimilarity(code1, code2);
  
  return { similarity, structure1, structure2 };
}

/**
 * Calculate similarity using APTED algorithm
 */
export function calculateSimilarityAPTED(
  code1: string, 
  code2: string, 
  config?: Partial<APTEDConfig>
): number {
  try {
    const ast1 = parseTypeScript("file1.ts", code1);
    const ast2 = parseTypeScript("file2.ts", code2);
    
    if (ast1.errors.length > 0 || ast2.errors.length > 0) {
      console.warn("Parse errors detected, similarity may be inaccurate");
    }
    
    const tree1 = oxcToTreeNode(ast1.program as OxcNode);
    const tree2 = oxcToTreeNode(ast2.program as OxcNode);
    
    // Default rename cost to 0.3 for better handling of identifier changes
    const defaultConfig: Partial<APTEDConfig> = {
      renameCost: 0.3,
      ...config
    };
    
    const apted = new APTED(defaultConfig);
    return apted.calculateSimilarity(tree1, tree2);
  } catch (error) {
    console.error("Failed to calculate APTED similarity:", error);
    return 0;
  }
}

export function compareStructuresAPTED(
  code1: string, 
  code2: string,
  config?: Partial<APTEDConfig>
): {
  similarity: number;
  levenshteinSimilarity: number;
  aptedSimilarity: number;
  structure1: string;
  structure2: string;
} {
  const ast1 = parseTypeScript("file1.ts", code1);
  const ast2 = parseTypeScript("file2.ts", code2);
  
  const structure1 = astToString(ast1);
  const structure2 = astToString(ast2);
  
  const levenshteinSimilarity = calculateSimilarity(code1, code2);
  const aptedSimilarity = calculateSimilarityAPTED(code1, code2, config);
  
  return { 
    similarity: aptedSimilarity,
    levenshteinSimilarity, 
    aptedSimilarity, 
    structure1, 
    structure2 
  };
}