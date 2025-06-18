import { describe, it, expect } from "vitest";
import { calculateSimilarity } from "../src/index.ts";
import { parseTypeScript } from "../src/parser.ts";
import { astToString } from "../src/core/ast.ts";

describe("Basic Functionality", () => {
  describe("parseTypeScript", () => {
    it("should parse valid TypeScript code", () => {
      const code = `const x = 42;`;
      const ast = parseTypeScript("test.ts", code);

      expect(ast).toBeDefined();
      expect(ast.program).toBeDefined();
      expect(ast.program.body).toHaveLength(1);
    });

    it("should parse function declarations", () => {
      const code = `function test(a: number): number { return a * 2; }`;
      const ast = parseTypeScript("test.ts", code);

      expect(ast.program.body).toHaveLength(1);
      expect(ast.program.body[0].type).toBe("FunctionDeclaration");
    });

    it("should parse class declarations", () => {
      const code = `class MyClass { method() {} }`;
      const ast = parseTypeScript("test.ts", code);

      expect(ast.program.body).toHaveLength(1);
      expect(ast.program.body[0].type).toBe("ClassDeclaration");
    });
  });

  describe("astToString", () => {
    it("should convert AST to string representation", () => {
      const code = `const x = 1;`;
      const ast = parseTypeScript("test.ts", code);
      const str = astToString(ast.program);

      expect(str).toContain("VariableDeclaration");
      expect(str).toContain("VariableDeclarator");
    });
  });

  describe("calculateSimilarity (Levenshtein only)", () => {
    it("should work with simple examples", () => {
      const code1 = `const x = 1;`;
      const code2 = `const y = 2;`;

      const similarity = calculateSimilarity(code1, code2);
      expect(similarity).toBeGreaterThan(0.7);
      expect(similarity).toBeLessThan(1.0);
    });

    it("should handle empty code", () => {
      const similarity = calculateSimilarity("", "");
      expect(similarity).toBe(1.0);
    });

    it("should handle completely different code", () => {
      const code1 = `function add(a: number, b: number) { return a + b; }`;
      const code2 = `import { readFileSync } from "fs";`;

      const similarity = calculateSimilarity(code1, code2);
      expect(similarity).toBeLessThan(0.4);
    });
  });
});
