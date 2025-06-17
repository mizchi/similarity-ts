// Re-export oxc-parser types for easier use throughout the codebase
import type {
  Program,
  Expression,
  Statement,
  Declaration,
  IdentifierName,
  IdentifierReference,
  BindingIdentifier,
  ThisExpression,
  ArrayExpression,
  ObjectExpression,
  Function,
  ArrowFunctionExpression,
  Class,
  VariableDeclaration,
  VariableDeclarator,
  MemberExpression,
  CallExpression,
  BinaryExpression,
  UnaryExpression,
  UpdateExpression,
  AssignmentExpression,
  LogicalExpression,
  ConditionalExpression,
  SpreadElement,
  TemplateLiteral,
  TaggedTemplateExpression,
  NewExpression,
  SequenceExpression,
  ImportDeclaration,
  ExportNamedDeclaration,
  ExportDefaultDeclaration,
  ExportAllDeclaration,
  IfStatement,
  SwitchStatement,
  WhileStatement,
  DoWhileStatement,
  ForStatement,
  ForInStatement,
  ForOfStatement,
  BlockStatement,
  ExpressionStatement,
  ReturnStatement,
  ThrowStatement,
  TryStatement,
  CatchClause,
  TSTypeAnnotation,
  TSInterfaceDeclaration,
  TSTypeAliasDeclaration,
  TSEnumDeclaration,
  TSModuleDeclaration,
  Span,
  ModuleDeclaration,
  NumericLiteral,
  StringLiteral,
  BooleanLiteral,
  NullLiteral,
  BigIntLiteral,
  RegExpLiteral,
  Directive,
  Hashbang,
  ModuleKind
} from '@oxc-project/types';

// Re-export types
export type {
  Program,
  Expression,
  Statement,
  Declaration,
  IdentifierName,
  IdentifierReference,
  BindingIdentifier,
  ThisExpression,
  ArrayExpression,
  ObjectExpression,
  Function,
  ArrowFunctionExpression,
  Class,
  VariableDeclaration,
  VariableDeclarator,
  MemberExpression,
  CallExpression,
  BinaryExpression,
  UnaryExpression,
  UpdateExpression,
  AssignmentExpression,
  LogicalExpression,
  ConditionalExpression,
  SpreadElement,
  TemplateLiteral,
  TaggedTemplateExpression,
  NewExpression,
  SequenceExpression,
  ImportDeclaration,
  ExportNamedDeclaration,
  ExportDefaultDeclaration,
  ExportAllDeclaration,
  IfStatement,
  SwitchStatement,
  WhileStatement,
  DoWhileStatement,
  ForStatement,
  ForInStatement,
  ForOfStatement,
  BlockStatement,
  ExpressionStatement,
  ReturnStatement,
  ThrowStatement,
  TryStatement,
  CatchClause,
  TSTypeAnnotation,
  TSInterfaceDeclaration,
  TSTypeAliasDeclaration,
  TSEnumDeclaration,
  TSModuleDeclaration,
  Span,
  ModuleDeclaration,
  NumericLiteral,
  StringLiteral,
  BooleanLiteral,
  NullLiteral,
  BigIntLiteral,
  RegExpLiteral,
  Directive,
  Hashbang,
  ModuleKind
};

// Type guards
export function isIdentifier(node: any): node is IdentifierReference | BindingIdentifier {
  return node?.type === 'Identifier';
}

export function isFunctionDeclaration(node: any): node is Function {
  return node?.type === 'FunctionDeclaration';
}

export function isClassDeclaration(node: any): node is Class {
  return node?.type === 'ClassDeclaration';
}

export function isVariableDeclarator(node: any): node is VariableDeclarator {
  return node?.type === 'VariableDeclarator';
}

// Union type for all AST nodes
export type ASTNode = Expression | Statement | Declaration | ModuleDeclaration | Directive | Program;