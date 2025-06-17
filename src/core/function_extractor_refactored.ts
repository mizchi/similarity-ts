// Function extraction and comparison utilities (refactored to use ast_visitor)
import { parseTypeScript } from '../parser.ts';
import { calculateAPTEDSimilarity } from './apted.ts';
import { visitAST, type VisitorContext } from './ast_visitor.ts';

export interface FunctionDefinition {
  name: string;
  type: 'function' | 'method' | 'arrow' | 'constructor';
  parameters: string[];
  body: string;
  ast: any;
  startLine: number;
  endLine: number;
  className?: string; // For methods
}

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
 * Extract all function definitions from code using the new visitor pattern
 */
export function extractFunctions(code: string): FunctionDefinition[] {
  const ast = parseTypeScript('temp.ts', code);
  const functions: FunctionDefinition[] = [];
  const lines = code.split('\n');
  
  function getLineNumber(offset: number): number {
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1;
      if (charCount > offset) {
        return i + 1;
      }
    }
    return lines.length;
  }
  
  function extractBodyCode(bodyNode: any): string {
    if (!bodyNode) {
      return '';
    }
    
    // start/end プロパティを直接使用（span プロパティがない場合がある）
    const start = bodyNode.start ?? bodyNode.span?.start;
    const end = bodyNode.end ?? bodyNode.span?.end;
    
    if (start === undefined || end === undefined || start >= end || start < 0 || end > code.length) {
      return '';
    }
    
    // BlockStatementの場合は中括弧の内側のコンテンツを取得
    if (bodyNode.type === 'BlockStatement') {
      // 中括弧を含む全体を取得してから、中身だけを抽出
      const fullBody = code.substring(start, end);
      const match = fullBody.match(/^\s*{\s*([\s\S]*?)\s*}\s*$/);
      if (match) {
        return match[1].trim();
      }
    }
    
    // ArrowFunctionの式本体の場合
    return code.substring(start, end).trim();
  }
  
  function extractParameters(params: any): string[] {
    if (!params) return [];
    
    // paramsは直接配列の場合が多い
    const paramList = Array.isArray(params) ? params : 
                     (params.items || params.parameters || []);
    
    if (!Array.isArray(paramList)) return [];
    
    return paramList.map((param: any) => {
      // Identifier with typeAnnotation の場合
      if (param.type === 'Identifier') {
        return param.name;
      }
      // FormalParameter の場合
      if (param.type === 'FormalParameter' && param.pattern?.type === 'BindingIdentifier') {
        return param.pattern.name;
      }
      // BindingIdentifier の場合
      if (param.type === 'BindingIdentifier') {
        return param.name;
      }
      // pattern を持つ場合
      if (param.pattern?.type === 'BindingIdentifier') {
        return param.pattern.name;
      }
      return 'unknown';
    }).filter(p => p !== 'unknown');
  }
  
  // Context to track class names
  const context: VisitorContext = {
    className: undefined
  };
  
  // Use the new visitor pattern
  visitAST(ast.program, {
    onFunctionDeclaration: (node) => {
      if (node.id) {
        functions.push({
          name: node.id.name,
          type: 'function',
          parameters: extractParameters(node.params),
          body: node.body ? extractBodyCode(node.body) : '',
          ast: node,
          startLine: getLineNumber(node.start ?? node.span?.start ?? 0),
          endLine: getLineNumber(node.end ?? node.span?.end ?? 0)
        });
      }
    },
    
    onVariableDeclaration: (node) => {
      // Handle variable declarations that might contain functions
      // Don't need to manually visit - the visitor will handle it
    },
    
    onVariableDeclarator: (node, ctx) => {
      // Arrow functions
      if (node.init?.type === 'ArrowFunctionExpression' &&
          (node.id?.type === 'BindingIdentifier' || node.id?.type === 'Identifier')) {
        let bodyContent = '';
        if (node.init.body) {
          bodyContent = extractBodyCode(node.init.body);
        } else {
          // 式本体の場合
          const funcStart = node.init.start ?? node.init.span?.start ?? 0;
          const funcEnd = node.init.end ?? node.init.span?.end ?? 0;
          const funcCode = code.substring(funcStart, funcEnd);
          const arrowPos = funcCode.indexOf('=>');
          if (arrowPos !== -1) {
            bodyContent = funcCode.substring(arrowPos + 2).trim();
          }
        }
        
        functions.push({
          name: node.id.name,
          type: 'arrow',
          parameters: extractParameters(node.init.params),
          body: bodyContent,
          ast: node.init,
          startLine: getLineNumber(node.start ?? node.span?.start ?? 0),
          endLine: getLineNumber(node.end ?? node.span?.end ?? 0)
        });
      }
      
      // Function expressions
      if (node.init?.type === 'FunctionExpression' &&
          (node.id?.type === 'BindingIdentifier' || node.id?.type === 'Identifier')) {
        functions.push({
          name: node.id.name,
          type: 'function',
          parameters: extractParameters(node.init.params),
          body: node.init.body ? extractBodyCode(node.init.body) : '',
          ast: node.init,
          startLine: getLineNumber(node.start ?? node.span?.start ?? 0),
          endLine: getLineNumber(node.end ?? node.span?.end ?? 0)
        });
      }
    },
    
    onClassDeclaration: (node, ctx) => {
      if (node.id) {
        // Update context with class name
        const oldClassName = ctx.className;
        ctx.className = node.id.name;
        
        // The visitor will automatically traverse the class body
        // We just need to track the class name in context
        
        // Note: We need to restore className after visiting children
        // This is a limitation of the current visitor pattern
      }
    },
    
    onMethodDefinition: (node, ctx) => {
      if (node.key) {
        const methodName = node.key.name || 'unknown';
        const isConstructor = node.kind === 'constructor';
        
        functions.push({
          name: isConstructor ? 'constructor' : methodName,
          type: isConstructor ? 'constructor' : 'method',
          parameters: extractParameters(node.value?.params),
          body: node.value?.body ? extractBodyCode(node.value.body) : '',
          ast: node.value,
          startLine: getLineNumber(node.start ?? node.span?.start ?? 0),
          endLine: getLineNumber(node.end ?? node.span?.end ?? 0),
          className: ctx.className
        });
      }
    }
  }, context);
  
  return functions;
}

// Export the rest of the functions unchanged
export { normalizeFunctionBody } from './function_extractor.ts';
export { compareFunctions } from './function_extractor.ts';
export { findDuplicateFunctions } from './function_extractor.ts';