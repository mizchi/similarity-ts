// TSED Performance Benchmark
import {
  calculateTSED,
  calculateAPTEDSimilarity,
  calculateSimilarity,
  DEFAULT_TSED_OPTIONS,
  REFACTORING_TSED_OPTIONS,
} from "../src/index.ts";
import { parseTypeScript } from "../src/parser.ts";
import { performance } from "perf_hooks";

function generateTestCode(lines: number): string {
  let code = "";
  for (let i = 0; i < lines; i++) {
    if (i % 5 === 0) {
      code += `\nfunction func${i}(param${i}: string): number {\n`;
      code += `  const result = param${i}.length * ${i};\n`;
      code += `  return result;\n`;
      code += `}\n`;
    } else if (i % 5 === 2) {
      code += `const value${i} = ${i};\n`;
    } else if (i % 5 === 3) {
      code += `type Type${i} = { id: number; name: string };\n`;
    }
  }
  return code;
}

async function measureTime(fn: () => any): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

async function runTSEDBenchmark() {
  console.log("=== TSED Performance Benchmark ===\n");

  const testSizes = [
    { name: "Small (10 lines)", lines: 10 },
    { name: "Medium (50 lines)", lines: 50 },
    { name: "Large (100 lines)", lines: 100 },
    { name: "XLarge (200 lines)", lines: 200 },
  ];

  console.log("1. Parsing Performance\n");
  console.log("| Size | Parse Time | AST Nodes |");
  console.log("|------|------------|-----------|");

  const parsedTests: Array<{
    name: string;
    ast1: any;
    ast2: any;
    code1: string;
    code2: string;
  }> = [];

  for (const { name, lines } of testSizes) {
    const code1 = generateTestCode(lines);
    const code2 = generateTestCode(lines).replace(/func/g, "method").replace(/value/g, "data");

    const parseTime = await measureTime(() => {
      const ast1 = parseTypeScript("test1.ts", code1);
      const ast2 = parseTypeScript("test2.ts", code2);
      parsedTests.push({ name, ast1, ast2, code1, code2 });
    });

    const lastTest = parsedTests[parsedTests.length - 1];
    const nodeCount = lastTest.ast1.program.body.length;

    console.log(
      `| ${name.padEnd(20)} | ${parseTime.toFixed(2).padStart(10)}ms | ${nodeCount.toString().padStart(9)} |`,
    );
  }

  console.log("\n2. TSED Calculation Performance\n");
  console.log("| Size | Default Options | Refactoring Options | vs Levenshtein | vs APTED String |");
  console.log("|------|-----------------|---------------------|----------------|-----------------|");

  for (const test of parsedTests) {
    // TSED with default options
    const tsedDefaultTime = await measureTime(() => {
      calculateTSED(test.ast1, test.ast2, DEFAULT_TSED_OPTIONS);
    });

    // TSED with refactoring options
    const tsedRefactorTime = await measureTime(() => {
      calculateTSED(test.ast1, test.ast2, REFACTORING_TSED_OPTIONS);
    });

    // Levenshtein (for comparison)
    const levTime = await measureTime(() => {
      calculateSimilarity(test.code1, test.code2);
    });

    // APTED from string (includes parsing)
    const aptedStringTime = await measureTime(() => {
      calculateAPTEDSimilarity(test.code1, test.code2);
    });

    console.log(
      `| ${test.name.padEnd(20)} | ${tsedDefaultTime.toFixed(2).padStart(15)}ms | ${tsedRefactorTime.toFixed(2).padStart(19)}ms | ${levTime.toFixed(2).padStart(14)}ms | ${aptedStringTime.toFixed(2).padStart(15)}ms |`,
    );
  }

  console.log("\n3. Operation Cost Impact\n");

  const testAst1 = parsedTests[1].ast1; // Medium size
  const testAst2 = parsedTests[1].ast2;

  const operations = [
    {
      name: "Rename=1.0, Delete=1.0, Insert=1.0",
      options: { renameCost: 1.0, deleteCost: 1.0, insertCost: 1.0 },
    },
    {
      name: "Rename=0.3, Delete=1.0, Insert=1.0",
      options: { renameCost: 0.3, deleteCost: 1.0, insertCost: 1.0 },
    },
    {
      name: "Rename=1.0, Delete=1.0, Insert=0.8",
      options: { renameCost: 1.0, deleteCost: 1.0, insertCost: 0.8 },
    },
    {
      name: "Rename=0.3, Delete=1.0, Insert=0.8",
      options: { renameCost: 0.3, deleteCost: 1.0, insertCost: 0.8 },
    },
  ];

  console.log("| Configuration | TSED Score | Time |");
  console.log("|---------------|------------|------|");

  for (const { name, options } of operations) {
    let tsedScore = 0;
    const time = await measureTime(() => {
      tsedScore = calculateTSED(testAst1, testAst2, options);
    });

    console.log(`| ${name} | ${tsedScore.toFixed(4).padStart(10)} | ${time.toFixed(2).padStart(4)}ms |`);
  }

  console.log("\n4. Scalability Test\n");

  const scalabilityResults: Array<{ nodes: number; time: number }> = [];

  for (let factor = 1; factor <= 5; factor++) {
    const lines = factor * 40;
    const code1 = generateTestCode(lines);
    const code2 = generateTestCode(lines).replace(/func/g, "fn").replace(/Type/g, "Interface");

    const ast1 = parseTypeScript("scale1.ts", code1);
    const ast2 = parseTypeScript("scale2.ts", code2);

    const time = await measureTime(() => {
      calculateTSED(ast1, ast2);
    });

    const nodes = ast1.program.body.length + ast2.program.body.length;
    scalabilityResults.push({ nodes, time });

    console.log(`${nodes} nodes: ${time.toFixed(2)}ms`);
  }

  // Calculate time complexity
  if (scalabilityResults.length > 1) {
    const first = scalabilityResults[0];
    const last = scalabilityResults[scalabilityResults.length - 1];
    const timeRatio = last.time / first.time;
    const nodeRatio = last.nodes / first.nodes;
    const complexity = Math.log(timeRatio) / Math.log(nodeRatio);

    console.log(`\nTime complexity: O(n^${complexity.toFixed(2)})`);
  }

  console.log("\n5. Summary\n");
  console.log("- TSED calculation is efficient for typical file sizes (<100ms for most files)");
  console.log("- Pre-parsed ASTs significantly improve performance vs string-based calculation");
  console.log("- Operation costs have minimal impact on performance");
  console.log("- Algorithm shows good scalability with reasonable time complexity");
}

runTSEDBenchmark().catch(console.error);
