import { describe, it, expect } from "vitest";
import { oxcToTreeNode, computeEditDistance, countNodes, calculateAPTEDSimilarityFromAST } from "../src/core/apted.ts";
import { parseTypeScript } from "../src/parser.ts";

describe("APTED Core Functions", () => {
  describe("oxcToTreeNode", () => {
    it("should convert simple AST to TreeNode", () => {
      const code = `const x = 1;`;
      const ast = parseTypeScript("test.ts", code);
      const tree = oxcToTreeNode(ast.program);

      expect(tree).toBeDefined();
      expect(tree.label).toBe("Program");
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it("should handle function declarations", () => {
      const code = `function test() { return 1; }`;
      const ast = parseTypeScript("test.ts", code);
      const tree = oxcToTreeNode(ast.program);

      const funcNode = tree.children[0];
      expect(funcNode.label).toBe("test");
    });

    it("should handle class declarations", () => {
      const code = `class MyClass { method() {} }`;
      const ast = parseTypeScript("test.ts", code);
      const tree = oxcToTreeNode(ast.program);

      const classNode = tree.children[0];
      expect(classNode.label).toBe("MyClass");
    });
  });

  describe("computeEditDistance", () => {
    it("should return 0 for identical trees", () => {
      const code = `const x = 1;`;
      const ast = parseTypeScript("test.ts", code);
      const tree = oxcToTreeNode(ast.program);

      const distance = computeEditDistance(tree, tree);
      expect(distance).toBe(0);
    });

    it("should calculate distance for different trees", () => {
      const code1 = `const x = 1;`;
      const code2 = `const y = 2;`;
      const ast1 = parseTypeScript("test1.ts", code1);
      const ast2 = parseTypeScript("test2.ts", code2);
      const tree1 = oxcToTreeNode(ast1.program);
      const tree2 = oxcToTreeNode(ast2.program);

      const distance = computeEditDistance(tree1, tree2);
      expect(distance).toBeGreaterThan(0);
    });

    it("should respect custom costs", () => {
      const code1 = `function foo() {}`;
      const code2 = `function bar() {}`;
      const ast1 = parseTypeScript("test1.ts", code1);
      const ast2 = parseTypeScript("test2.ts", code2);
      const tree1 = oxcToTreeNode(ast1.program);
      const tree2 = oxcToTreeNode(ast2.program);

      const distanceDefault = computeEditDistance(tree1, tree2);
      const distanceLowRename = computeEditDistance(tree1, tree2, { renameCost: 0.1 });

      expect(distanceLowRename).toBeLessThan(distanceDefault);
    });
  });

  describe("countNodes", () => {
    it("should count nodes correctly", () => {
      const code = `function test() { const x = 1; return x; }`;
      const ast = parseTypeScript("test.ts", code);
      const tree = oxcToTreeNode(ast.program);

      const count = countNodes(tree);
      expect(count).toBeGreaterThan(5); // At least: Program, Function, Block, Const, Return
    });
  });

  describe("calculateAPTEDSimilarityFromAST", () => {
    it("should calculate similarity from ASTs", () => {
      const code1 = `function add(a: number, b: number) { return a + b; }`;
      const code2 = `function sum(x: number, y: number) { return x + y; }`;
      const ast1 = parseTypeScript("test1.ts", code1);
      const ast2 = parseTypeScript("test2.ts", code2);

      const similarity = calculateAPTEDSimilarityFromAST(ast1, ast2, { renameCost: 0.3 });
      expect(similarity).toBeGreaterThan(0.8);
      expect(similarity).toBeLessThanOrEqual(1.0);
    });
  });
});

describe("APTED Memory Issues", () => {
  // These tests document the memory issues
  it.skip("should handle large files without OOM (currently fails)", () => {
    const largeCode = `
      class LargeClass {
        ${Array(100)
          .fill(0)
          .map(
            (_, i) => `
          method${i}() {
            const result = [];
            for (let j = 0; j < 10; j++) {
              result.push(j * ${i});
            }
            return result;
          }
        `,
          )
          .join("\n")}
      }
    `;

    const ast = parseTypeScript("large.ts", largeCode);
    const tree = oxcToTreeNode(ast.program);

    // This would cause memory issues
    const distance = computeEditDistance(tree, tree);
    expect(distance).toBe(0);
  });

  it("should handle small files without issues", () => {
    const smallCode = `function small() { return 1; }`;
    const ast = parseTypeScript("small.ts", smallCode);
    const tree = oxcToTreeNode(ast.program);

    // Small files should work fine
    const distance = computeEditDistance(tree, tree);
    expect(distance).toBe(0);
  });
});
