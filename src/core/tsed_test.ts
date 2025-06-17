import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseTypeScript } from "../parser.ts";
import { calculateTSED, calculateTSEDWithMetrics, DEFAULT_TSED_OPTIONS, REFACTORING_TSED_OPTIONS } from "./tsed.ts";

test("TSED: identical code should return 1.0", () => {
  const code = `
    function add(a: number, b: number): number {
      return a + b;
    }
  `;

  const ast1 = parseTypeScript("test.ts", code);
  const ast2 = parseTypeScript("test.ts", code);

  const tsed = calculateTSED(ast1, ast2);
  assert.equal(tsed, 1.0, "Identical code should have TSED = 1.0");
});

test("TSED: completely different code should return low value", () => {
  const code1 = `
    function add(a: number, b: number): number {
      return a + b;
    }
  `;

  const code2 = `
    class User {
      name: string;
      email: string;
      constructor(name: string, email: string) {
        this.name = name;
        this.email = email;
      }
    }
  `;

  const ast1 = parseTypeScript("test1.ts", code1);
  const ast2 = parseTypeScript("test2.ts", code2);

  const tsed = calculateTSED(ast1, ast2);
  assert(tsed < 0.7, `Completely different code should have TSED < 0.7, got ${tsed}`);
});

test("TSED: formula verification with metrics", () => {
  const code1 = `const x = 1;`;
  const code2 = `const y = 2;`;

  const ast1 = parseTypeScript("test1.ts", code1);
  const ast2 = parseTypeScript("test2.ts", code2);

  const metrics = calculateTSEDWithMetrics(ast1, ast2);

  // Verify TSED formula: TSED = max{1 - δ/MaxNodes(G1,G2), 0}
  const expectedTSED = Math.max(1 - metrics.editDistance / metrics.maxNodes, 0);
  assert.equal(metrics.tsed, expectedTSED, "TSED should match the formula calculation");

  // Verify metrics are reasonable
  assert(metrics.tree1Nodes > 0, "Tree 1 should have nodes");
  assert(metrics.tree2Nodes > 0, "Tree 2 should have nodes");
  assert(metrics.editDistance >= 0, "Edit distance should be non-negative");
  assert.equal(
    metrics.maxNodes,
    Math.max(metrics.tree1Nodes, metrics.tree2Nodes),
    "MaxNodes should be the maximum of both tree sizes",
  );
});

test("TSED: renamed variables should have high similarity with refactoring options", () => {
  const code1 = `
    function calculate(x: number, y: number): number {
      const result = x + y;
      return result;
    }
  `;

  const code2 = `
    function calculate(a: number, b: number): number {
      const sum = a + b;
      return sum;
    }
  `;

  const ast1 = parseTypeScript("test1.ts", code1);
  const ast2 = parseTypeScript("test2.ts", code2);

  // With default options (rename cost = 1.0)
  const tsedDefault = calculateTSED(ast1, ast2, DEFAULT_TSED_OPTIONS);

  // With refactoring options (rename cost = 0.3)
  const tsedRefactoring = calculateTSED(ast1, ast2, REFACTORING_TSED_OPTIONS);

  assert(
    tsedRefactoring > tsedDefault,
    `Refactoring options should give higher similarity for renamed code: ${tsedRefactoring} > ${tsedDefault}`,
  );
  assert(
    tsedRefactoring > 0.8,
    `Renamed variables should have high similarity with refactoring options: ${tsedRefactoring}`,
  );
});

test("TSED: operation costs affect similarity", () => {
  const code1 = `
    function process(data: string[]): void {
      for (const item of data) {
        console.log(item);
      }
    }
  `;

  const code2 = `
    function process(data: string[]): void {
      for (const item of data) {
        console.log(item);
        console.log("---");
      }
    }
  `;

  const ast1 = parseTypeScript("test1.ts", code1);
  const ast2 = parseTypeScript("test2.ts", code2);

  // Test with different insert costs
  const highInsertCost = calculateTSED(ast1, ast2, { insertCost: 2.0 });
  const lowInsertCost = calculateTSED(ast1, ast2, { insertCost: 0.5 });

  assert(
    lowInsertCost > highInsertCost,
    `Lower insert cost should result in higher similarity: ${lowInsertCost} > ${highInsertCost}`,
  );
});

test("TSED: structural similarity for loops", () => {
  const forLoop = `
    for (let i = 0; i < 10; i++) {
      console.log(i);
    }
  `;

  const whileLoop = `
    let i = 0;
    while (i < 10) {
      console.log(i);
      i++;
    }
  `;

  const forOfLoop = `
    for (const i of [0,1,2,3,4,5,6,7,8,9]) {
      console.log(i);
    }
  `;

  const ast1 = parseTypeScript("for.ts", forLoop);
  const ast2 = parseTypeScript("while.ts", whileLoop);
  const ast3 = parseTypeScript("forof.ts", forOfLoop);

  const tsed12 = calculateTSED(ast1, ast2);
  const tsed13 = calculateTSED(ast1, ast3);
  const tsed23 = calculateTSED(ast2, ast3);

  // All should have some similarity as they do similar things
  assert(tsed12 > 0.2, `For vs While should have some similarity: ${tsed12}`);
  assert(tsed13 > 0.2, `For vs ForOf should have some similarity: ${tsed13}`);
  assert(tsed23 > 0.2, `While vs ForOf should have some similarity: ${tsed23}`);
});

test("TSED: empty code edge cases", () => {
  const emptyCode = "";
  const simpleCode = "const x = 1;";

  const astEmpty = parseTypeScript("empty.ts", emptyCode);
  const astSimple = parseTypeScript("simple.ts", simpleCode);

  // Empty vs empty should be 1.0
  const emptyVsEmpty = calculateTSED(astEmpty, astEmpty);
  assert.equal(emptyVsEmpty, 1.0, "Empty code compared to itself should be 1.0");

  // Empty vs non-empty should be relatively high (simple code is small)
  const emptyVsSimple = calculateTSED(astEmpty, astSimple);
  assert(emptyVsSimple > 0.5, `Empty vs simple should have moderate similarity: ${emptyVsSimple}`);
});

test("TSED: parameter optimization from paper (section 5.3)", () => {
  // Based on paper's findings: Insert weight of 0.8 is optimal for Java
  const code1 = `
    class Calculator {
      add(a: number, b: number): number {
        return a + b;
      }
    }
  `;

  const code2 = `
    class Calculator {
      add(a: number, b: number): number {
        const result = a + b;
        console.log("Result:", result);
        return result;
      }
    }
  `;

  const ast1 = parseTypeScript("test1.ts", code1);
  const ast2 = parseTypeScript("test2.ts", code2);

  // Test with paper's recommended insert weight
  const tsedOptimal = calculateTSED(ast1, ast2, { insertCost: 0.8 });
  const tsedDefault = calculateTSED(ast1, ast2, { insertCost: 1.0 });

  assert(
    tsedOptimal >= tsedDefault,
    `Optimized insert cost should not decrease similarity: ${tsedOptimal} >= ${tsedDefault}`,
  );
});

test("TSED: class to function refactoring detection", () => {
  const classCode = `
    class Calculator {
      add(a: number, b: number): number {
        return a + b;
      }
      
      subtract(a: number, b: number): number {
        return a - b;
      }
    }
  `;

  const functionCode = `
    function add(a: number, b: number): number {
      return a + b;
    }
    
    function subtract(a: number, b: number): number {
      return a - b;
    }
  `;

  const ast1 = parseTypeScript("class.ts", classCode);
  const ast2 = parseTypeScript("function.ts", functionCode);

  // With refactoring options, structural difference between class and function is still significant
  const tsed = calculateTSED(ast1, ast2, REFACTORING_TSED_OPTIONS);
  // Class and function structures are fundamentally different, so even with low rename cost
  // the similarity is expected to be low
  assert(tsed < 0.5, `Class to function refactoring has different structure: ${tsed}`);
});

test("TSED: value bounds validation", () => {
  const codes = [
    "const a = 1;",
    "function f() { return 42; }",
    "class C { x = 1; }",
    'if (true) { console.log("hello"); }',
    "for (let i = 0; i < 10; i++) { }",
  ];

  // Test all combinations
  for (let i = 0; i < codes.length; i++) {
    for (let j = 0; j < codes.length; j++) {
      const ast1 = parseTypeScript(`test${i}.ts`, codes[i]);
      const ast2 = parseTypeScript(`test${j}.ts`, codes[j]);
      const tsed = calculateTSED(ast1, ast2);

      assert(tsed >= 0 && tsed <= 1, `TSED should be between 0 and 1, got ${tsed} for codes[${i}] vs codes[${j}]`);

      if (i === j) {
        assert.equal(tsed, 1.0, `Same code should have TSED = 1.0, got ${tsed}`);
      }
    }
  }
});
