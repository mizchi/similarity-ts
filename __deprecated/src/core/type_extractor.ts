// Type definition extraction for TypeScript interfaces and type aliases
import { parseTypeScript } from "../parser.ts";
import { traverseAST, createVisitor } from "./ast_traversal.ts";

export interface TypeDefinition {
  name: string;
  kind: "interface" | "type";
  properties: PropertyDefinition[];
  generics?: string[];
  extends?: string[];
  ast: any;
  startLine: number;
  endLine: number;
  filePath: string;
}

export interface PropertyDefinition {
  name: string;
  type: string;
  optional: boolean;
  readonly?: boolean;
}

interface ExtractorState {
  types: TypeDefinition[];
  code: string;
  lines: string[];
  filePath: string;
}

export function extractTypes(
  code: string,
  filePath: string = "temp.ts"
): TypeDefinition[] {
  const ast = parseTypeScript(filePath, code);
  const state: ExtractorState = {
    types: [],
    code,
    lines: code.split("\n"),
    filePath,
  };

  // Helper function to get line number from offset
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

  // Helper function to extract type string from AST node
  function extractTypeString(typeNode: any): string {
    if (!typeNode) return "unknown";

    switch (typeNode.type) {
      case "TSStringKeyword":
        return "string";
      case "TSNumberKeyword":
        return "number";
      case "TSBooleanKeyword":
        return "boolean";
      case "TSAnyKeyword":
        return "any";
      case "TSUnknownKeyword":
        return "unknown";
      case "TSVoidKeyword":
        return "void";
      case "TSNullKeyword":
        return "null";
      case "TSUndefinedKeyword":
        return "undefined";
      case "TSTypeReference":
        if (typeNode.typeName?.name) {
          return typeNode.typeName.name;
        }
        return "unknown";
      case "TSArrayType":
        const elementType = extractTypeString(typeNode.elementType);
        return `${elementType}[]`;
      case "TSUnionType":
        const unionTypes =
          typeNode.types?.map((t: any) => extractTypeString(t)) || [];
        return unionTypes.join(" | ");
      case "TSIntersectionType":
        const intersectionTypes =
          typeNode.types?.map((t: any) => extractTypeString(t)) || [];
        return intersectionTypes.join(" & ");
      case "TSLiteralType":
        if (typeNode.literal?.type === "StringLiteral") {
          return `"${typeNode.literal.value}"`;
        }
        if (typeNode.literal?.type === "NumericLiteral") {
          return String(typeNode.literal.value);
        }
        if (typeNode.literal?.type === "BooleanLiteral") {
          return String(typeNode.literal.value);
        }
        return "unknown";
      case "TSFunctionType":
        return "Function";
      case "TSTypeLiteral":
        // For object types, we'll extract properties separately
        return "object";
      default:
        return typeNode.type || "unknown";
    }
  }

  // Helper function to extract properties from interface or type literal
  function extractProperties(members: any[]): PropertyDefinition[] {
    if (!Array.isArray(members)) return [];

    return members
      .filter((member: any) => member.type === "TSPropertySignature")
      .map((member: any) => {
        const name = member.key?.name || member.key?.value || "unknown";
        const type = extractTypeString(member.typeAnnotation?.typeAnnotation);
        const optional = member.optional || false;
        const readonly = member.readonly || false;

        return {
          name,
          type,
          optional,
          readonly,
        };
      });
  }

  // Helper function to extract generic parameters
  function extractGenerics(typeParameters: any): string[] {
    if (!typeParameters?.params) return [];

    return typeParameters.params.map((param: any) => param.name?.name || "T");
  }

  // Helper function to extract extends clause
  function extractExtends(extendsClause: any): string[] {
    if (!extendsClause) return [];

    if (Array.isArray(extendsClause)) {
      return extendsClause.map((ext: any) => ext.expression?.name || "unknown");
    }

    return [extendsClause.expression?.name || "unknown"];
  }

  // Use AST traversal to find type definitions
  traverseAST(
    ast.program,
    createVisitor<ExtractorState>({
      // Interface declarations
      TSInterfaceDeclaration(node, state) {
        if (node.id?.name) {
          const startLine = getLineNumber(node.start ?? node.span?.start ?? 0);
          const endLine = getLineNumber(node.end ?? node.span?.end ?? 0);

          const properties = extractProperties(node.body?.body || []);
          const generics = extractGenerics(node.typeParameters);
          const extendsTypes = extractExtends(node.extends);

          state.types.push({
            name: node.id.name,
            kind: "interface",
            properties,
            generics: generics.length > 0 ? generics : undefined,
            extends: extendsTypes.length > 0 ? extendsTypes : undefined,
            ast: node,
            startLine,
            endLine,
            filePath: state.filePath,
          });
        }
      },

      // Type alias declarations
      TSTypeAliasDeclaration(node, state) {
        if (node.id?.name) {
          const startLine = getLineNumber(node.start ?? node.span?.start ?? 0);
          const endLine = getLineNumber(node.end ?? node.span?.end ?? 0);

          let properties: PropertyDefinition[] = [];

          // Extract properties if it's an object type
          if (node.typeAnnotation?.type === "TSTypeLiteral") {
            properties = extractProperties(node.typeAnnotation.members || []);
          }

          const generics = extractGenerics(node.typeParameters);

          state.types.push({
            name: node.id.name,
            kind: "type",
            properties,
            generics: generics.length > 0 ? generics : undefined,
            ast: node,
            startLine,
            endLine,
            filePath: state.filePath,
          });
        }
      },
    }),
    state
  );

  return state.types;
}

/**
 * Extract types from multiple files
 */
export async function extractTypesFromFiles(
  files: Array<{ path: string; content: string }>
): Promise<TypeDefinition[]> {
  const allTypes: TypeDefinition[] = [];

  for (const file of files) {
    try {
      const types = extractTypes(file.content, file.path);
      allTypes.push(...types);
    } catch (error) {
      console.warn(`Failed to extract types from ${file.path}:`, error);
    }
  }

  return allTypes;
}

/**
 * Find types by name
 */
export function findTypeByName(
  types: TypeDefinition[],
  name: string
): TypeDefinition[] {
  return types.filter((type) => type.name === name);
}

/**
 * Group types by kind
 */
export function groupTypesByKind(types: TypeDefinition[]): {
  interfaces: TypeDefinition[];
  types: TypeDefinition[];
} {
  return {
    interfaces: types.filter((type) => type.kind === "interface"),
    types: types.filter((type) => type.kind === "type"),
  };
}
