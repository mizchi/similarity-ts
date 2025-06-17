// Re-export oxc-parser types for easier use throughout the codebase
import type {
  Program,
  Expression,
  Statement,
  Declaration,
  IdentifierReference,
  BindingIdentifier,
  Function,
  Class,
  VariableDeclarator,
  ModuleDeclaration,
  NumericLiteral,
  StringLiteral,
  BooleanLiteral,
  Directive,
} from "@oxc-project/types";

// Re-export types
export type { Program, NumericLiteral, StringLiteral, BooleanLiteral };

// Type guards
export function isIdentifier(node: any): node is IdentifierReference | BindingIdentifier {
  return node?.type === "Identifier";
}

export function isFunctionDeclaration(node: any): node is Function {
  return node?.type === "FunctionDeclaration";
}

export function isClassDeclaration(node: any): node is Class {
  return node?.type === "ClassDeclaration";
}

export function isVariableDeclarator(node: any): node is VariableDeclarator {
  return node?.type === "VariableDeclarator";
}

// Union type for all AST nodes
export type ASTNode = Expression | Statement | Declaration | ModuleDeclaration | Directive | Program;
