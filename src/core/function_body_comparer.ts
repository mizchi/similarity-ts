// Function body comparison using APTED algorithm
import { parseTypeScript } from '../parser.ts';
import { calculateAPTEDSimilarity } from './apted.ts';
import { normalizeSemantics } from './semantic_normalizer.ts';
import { traverseAST, createVisitor } from './ast_traversal.ts';
import type { Program, Function, Statement } from './oxc_types.ts';

export interface FunctionBodyComparisonResult {
  similarity: number;
  normalizedSimilarity: number;
  hasThisDifference: boolean;
  hasParameterDifference: boolean;
  structuralSimilarity: number;
}

/**
 * Extract function body as code string
 */
export function extractFunctionBody(code: string, functionName: string, isMethod: boolean = false): string | null {
  const ast = parseTypeScript('temp.ts', code);
  
  function findFunction(node: any): any {
    interface FindState {
      found: any | null;
    }
    
    const state: FindState = { found: null };
    
    traverseAST(node, createVisitor<FindState>({
      FunctionDeclaration(node, state) {
        if (node.id?.name === functionName && !state.found) {
          state.found = node;
        }
      },
      
      MethodDefinition(node, state) {
        if (node.key?.name === functionName && !state.found) {
          state.found = node.value;
        }
      },
      
      VariableDeclarator(node, state) {
        if (node.id?.name === functionName && !state.found) {
          if (node.init?.type === 'FunctionExpression' || 
              node.init?.type === 'ArrowFunctionExpression') {
            state.found = node.init;
          }
        }
      }
    }), state);
    
    return state.found;
  }
  
  const funcNode = findFunction(ast.program);
  if (!funcNode || !funcNode.body) return null;
  
  // Extract body code (start/end プロパティを直接使用)
  const bodyStart = funcNode.body.start ?? funcNode.body.span?.start;
  const bodyEnd = funcNode.body.end ?? funcNode.body.span?.end;
  
  if (bodyStart !== undefined && bodyEnd !== undefined) {
    // For block statements, extract content inside braces
    let bodyCode = code.substring(bodyStart, bodyEnd);
    
    // Remove outer braces if it's a block statement
    if (funcNode.body.type === 'BlockStatement') {
      bodyCode = bodyCode.replace(/^\s*{\s*/, '').replace(/\s*}\s*$/, '');
    }
    
    return bodyCode.trim();
  }
  
  return null;
}

/**
 * Compare two function bodies
 */
export function compareFunctionBodies(
  body1: string,
  body2: string,
  type1: 'method' | 'function',
  type2: 'method' | 'function',
  params1: string[] = [],
  params2: string[] = []
): FunctionBodyComparisonResult {
  // Direct similarity
  const directSimilarity = calculateAPTEDSimilarity(body1, body2);
  
  // Check for this usage
  const hasThis1 = /\bthis\s*\./.test(body1);
  const hasThis2 = /\bthis\s*\./.test(body2);
  const hasThisDifference = hasThis1 !== hasThis2;
  
  // Normalize and compare
  const normalized1 = normalizeSemantics(body1, type1, params1, {
    normalizeThis: true,
    normalizeParams: true,
    normalizeLocalVars: true
  });
  
  const normalized2 = normalizeSemantics(body2, type2, params2, {
    normalizeThis: true,
    normalizeParams: true,
    normalizeLocalVars: true
  });
  
  const normalizedSimilarity = calculateAPTEDSimilarity(normalized1, normalized2);
  
  // Structural similarity (ignoring variable names)
  const structuralSimilarity = calculateStructuralSimilarity(body1, body2);
  
  return {
    similarity: directSimilarity,
    normalizedSimilarity,
    hasThisDifference,
    hasParameterDifference: params1.length !== params2.length,
    structuralSimilarity
  };
}

/**
 * Calculate structural similarity ignoring identifiers
 */
function calculateStructuralSimilarity(body1: string, body2: string): number {
  // Replace all identifiers with generic placeholder
  const normalize = (code: string): string => {
    return code
      // Replace identifiers (but not keywords)
      .replace(/\b(?!if|else|for|while|return|function|class|const|let|var|this|new|typeof|instanceof)\w+/g, '_ID_')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const norm1 = normalize(body1);
  const norm2 = normalize(body2);
  
  if (norm1 === norm2) return 1.0;
  
  // Character-level similarity
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 1.0;
  
  let matches = 0;
  const minLen = Math.min(norm1.length, norm2.length);
  
  for (let i = 0; i < minLen; i++) {
    if (norm1[i] === norm2[i]) matches++;
  }
  
  return matches / maxLen;
}

/**
 * Find duplicate function bodies in code
 */
export function findDuplicateFunctionBodies(
  code: string,
  similarityThreshold: number = 0.8
): Array<{
  func1: string;
  func2: string;
  comparison: FunctionBodyComparisonResult;
}> {
  const duplicates: Array<{
    func1: string;
    func2: string;
    comparison: FunctionBodyComparisonResult;
  }> = [];
  
  // Extract all functions from code
  const functionNames = extractAllFunctionNames(code);
  
  // Compare all pairs
  for (let i = 0; i < functionNames.length; i++) {
    for (let j = i + 1; j < functionNames.length; j++) {
      const func1 = functionNames[i];
      const func2 = functionNames[j];
      
      const body1 = extractFunctionBody(code, func1.name, func1.isMethod);
      const body2 = extractFunctionBody(code, func2.name, func2.isMethod);
      
      if (body1 && body2) {
        const comparison = compareFunctionBodies(
          body1,
          body2,
          func1.isMethod ? 'method' : 'function',
          func2.isMethod ? 'method' : 'function'
        );
        
        if (comparison.normalizedSimilarity >= similarityThreshold) {
          duplicates.push({
            func1: func1.name,
            func2: func2.name,
            comparison
          });
        }
      }
    }
  }
  
  return duplicates;
}

/**
 * Extract all function names from code using ast_traversal
 */
function extractAllFunctionNames(code: string): Array<{ name: string; isMethod: boolean }> {
  const ast = parseTypeScript('temp.ts', code);
  
  interface ExtractState {
    functions: Array<{ name: string; isMethod: boolean }>;
    inClass: boolean;
  }
  
  const state: ExtractState = {
    functions: [],
    inClass: false
  };
  
  traverseAST(ast.program, createVisitor<ExtractState>({
    enter(node, state) {
      if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
        state.inClass = true;
      }
    },
    
    leave(node, state) {
      if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
        state.inClass = false;
      }
    },
    
    FunctionDeclaration(node, state) {
      if (node.id?.name) {
        state.functions.push({ name: node.id.name, isMethod: false });
      }
    },
    
    MethodDefinition(node, state) {
      if (node.key?.name) {
        state.functions.push({ name: node.key.name, isMethod: true });
      }
    },
    
    VariableDeclarator(node, state) {
      if (node.id?.name) {
        if (node.init?.type === 'FunctionExpression' || 
            node.init?.type === 'ArrowFunctionExpression') {
          state.functions.push({ name: node.id.name, isMethod: false });
        }
      }
    }
  }), state);
  
  return state.functions;
}