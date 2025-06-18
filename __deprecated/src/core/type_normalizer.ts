// Type normalization for consistent comparison
import { TypeDefinition } from "./type_extractor.ts";
import { levenshtein } from "./levenshtein.ts";

export interface NormalizedType {
  properties: Map<string, string>; // プロパティ名 -> 型
  optionalProperties: Set<string>;
  readonlyProperties: Set<string>;
  signature: string; // 正規化された型シグネチャ
  originalName: string;
  kind: "interface" | "type";
}

export interface NormalizationOptions {
  ignorePropertyOrder?: boolean;
  ignoreOptionalModifiers?: boolean;
  ignoreReadonlyModifiers?: boolean;
  normalizeTypeNames?: boolean;
}

/**
 * Normalize a type definition for comparison
 */
export function normalizeType(
  typeDef: TypeDefinition,
  options: NormalizationOptions = {}
): NormalizedType {
  const {
    ignorePropertyOrder = true,
    ignoreOptionalModifiers = false,
    ignoreReadonlyModifiers = true,
    normalizeTypeNames = true,
  } = options;

  const properties = new Map<string, string>();
  const optionalProperties = new Set<string>();
  const readonlyProperties = new Set<string>();

  // Process each property
  for (const prop of typeDef.properties) {
    const normalizedPropName = prop.name.toLowerCase().trim();
    const normalizedType = normalizeTypeNames
      ? normalizeTypeName(prop.type)
      : prop.type;

    properties.set(normalizedPropName, normalizedType);

    if (prop.optional && !ignoreOptionalModifiers) {
      optionalProperties.add(normalizedPropName);
    }

    if (prop.readonly && !ignoreReadonlyModifiers) {
      readonlyProperties.add(normalizedPropName);
    }
  }

  // Generate normalized signature
  const signature = generateTypeSignature(
    properties,
    optionalProperties,
    readonlyProperties,
    ignorePropertyOrder
  );

  return {
    properties,
    optionalProperties,
    readonlyProperties,
    signature,
    originalName: typeDef.name,
    kind: typeDef.kind,
  };
}

/**
 * Normalize type names for consistent comparison
 */
function normalizeTypeName(typeName: string): string {
  // Remove extra whitespace
  let normalized = typeName.trim();

  // Normalize primitive types
  const typeMap: Record<string, string> = {
    String: "string",
    Number: "number",
    Boolean: "boolean",
    Object: "object",
    Array: "array",
    Function: "function",
  };

  // Replace known type aliases
  for (const [original, replacement] of Object.entries(typeMap)) {
    normalized = normalized.replace(
      new RegExp(`\\b${original}\\b`, "g"),
      replacement
    );
  }

  // Normalize array syntax: T[] vs Array<T>
  normalized = normalized.replace(/Array<([^>]+)>/g, "$1[]");

  // Sort union types for consistent comparison
  if (normalized.includes(" | ")) {
    const unionTypes = normalized
      .split(" | ")
      .map((t) => t.trim())
      .sort();
    normalized = unionTypes.join(" | ");
  }

  // Sort intersection types for consistent comparison
  if (normalized.includes(" & ")) {
    const intersectionTypes = normalized
      .split(" & ")
      .map((t) => t.trim())
      .sort();
    normalized = intersectionTypes.join(" & ");
  }

  return normalized;
}

/**
 * Generate a normalized signature for the type
 */
function generateTypeSignature(
  properties: Map<string, string>,
  optionalProperties: Set<string>,
  readonlyProperties: Set<string>,
  ignoreOrder: boolean = true
): string {
  const propEntries = Array.from(properties.entries());

  if (ignoreOrder) {
    propEntries.sort(([a], [b]) => a.localeCompare(b));
  }

  const propStrings = propEntries.map(([name, type]) => {
    let propStr = name;

    if (readonlyProperties.has(name)) {
      propStr = `readonly ${propStr}`;
    }

    if (optionalProperties.has(name)) {
      propStr += "?";
    }

    propStr += `: ${type}`;
    return propStr;
  });

  return `{ ${propStrings.join("; ")} }`;
}

/**
 * Calculate similarity between two property names using Levenshtein distance
 */
export function calculatePropertySimilarity(
  prop1: string,
  prop2: string
): number {
  if (prop1 === prop2) return 1.0;

  const normalized1 = prop1.toLowerCase().trim();
  const normalized2 = prop2.toLowerCase().trim();

  if (normalized1 === normalized2) return 0.95;

  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshtein(normalized1, normalized2);
  return Math.max(0, 1 - distance / maxLength);
}

/**
 * Calculate similarity between two type strings
 */
export function calculateTypeSimilarity(type1: string, type2: string): number {
  const normalized1 = normalizeTypeName(type1);
  const normalized2 = normalizeTypeName(type2);

  if (normalized1 === normalized2) return 1.0;

  // Handle union types specially
  if (normalized1.includes(" | ") || normalized2.includes(" | ")) {
    return calculateUnionTypeSimilarity(normalized1, normalized2);
  }

  // Handle intersection types specially
  if (normalized1.includes(" & ") || normalized2.includes(" & ")) {
    return calculateIntersectionTypeSimilarity(normalized1, normalized2);
  }

  // For other types, use string similarity
  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshtein(normalized1, normalized2);
  return Math.max(0, 1 - distance / maxLength);
}

/**
 * Calculate similarity between union types
 */
function calculateUnionTypeSimilarity(type1: string, type2: string): number {
  const union1 = type1.includes(" | ")
    ? type1.split(" | ").map((t) => t.trim())
    : [type1];
  const union2 = type2.includes(" | ")
    ? type2.split(" | ").map((t) => t.trim())
    : [type2];

  const commonTypes = union1.filter((t1) => union2.some((t2) => t1 === t2));
  const totalTypes = new Set([...union1, ...union2]).size;

  return totalTypes === 0
    ? 1.0
    : (commonTypes.length * 2) / (union1.length + union2.length);
}

/**
 * Calculate similarity between intersection types
 */
function calculateIntersectionTypeSimilarity(
  type1: string,
  type2: string
): number {
  const intersection1 = type1.includes(" & ")
    ? type1.split(" & ").map((t) => t.trim())
    : [type1];
  const intersection2 = type2.includes(" & ")
    ? type2.split(" & ").map((t) => t.trim())
    : [type2];

  const commonTypes = intersection1.filter((t1) =>
    intersection2.some((t2) => t1 === t2)
  );
  const totalTypes = new Set([...intersection1, ...intersection2]).size;

  return totalTypes === 0
    ? 1.0
    : (commonTypes.length * 2) / (intersection1.length + intersection2.length);
}

/**
 * Find the best property matches between two normalized types
 */
export function findPropertyMatches(
  type1: NormalizedType,
  type2: NormalizedType,
  threshold: number = 0.7
): Array<{
  prop1: string;
  prop2: string;
  nameSimilarity: number;
  typeSimilarity: number;
  overallSimilarity: number;
}> {
  const matches: Array<{
    prop1: string;
    prop2: string;
    nameSimilarity: number;
    typeSimilarity: number;
    overallSimilarity: number;
  }> = [];

  const props1 = Array.from(type1.properties.keys());
  const props2 = Array.from(type2.properties.keys());

  for (const prop1 of props1) {
    for (const prop2 of props2) {
      const nameSimilarity = calculatePropertySimilarity(prop1, prop2);
      const typeSimilarity = calculateTypeSimilarity(
        type1.properties.get(prop1) || "",
        type2.properties.get(prop2) || ""
      );

      // Weight name similarity more heavily than type similarity
      const overallSimilarity = nameSimilarity * 0.7 + typeSimilarity * 0.3;

      if (overallSimilarity >= threshold) {
        matches.push({
          prop1,
          prop2,
          nameSimilarity,
          typeSimilarity,
          overallSimilarity,
        });
      }
    }
  }

  // Sort by overall similarity (descending)
  matches.sort((a, b) => b.overallSimilarity - a.overallSimilarity);

  return matches;
}
