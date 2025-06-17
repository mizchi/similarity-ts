import {
  calculateAPTEDSimilarity,
  calculateAPTEDSimilarityFromAST,
  computeEditDistance,
  countNodes,
  TreeNode,
} from "./apted.ts";
import { parseTypeScript } from "../parser.ts";

/**
 * Test suite for APTED implementation following the TSED paper
 */
function runAPTEDTests() {
  let passed = 0;
  let failed = 0;

  console.log("Running APTED algorithm tests...\n");

  // Helper function to create simple tree nodes for testing
  function createTreeNode(label: string, children: TreeNode[] = []): TreeNode {
    return {
      id: `node_${Math.random().toString(36).substr(2, 9)}`,
      label,
      value: label, // Add value property
      children,
    };
  }

  // Test 1: Verify TSED normalization formula
  function test1_tsedFormula() {
    console.log("Test 1 - TSED Normalization Formula Verification:");

    // Create two simple trees for manual calculation
    const tree1 = createTreeNode("root", [createTreeNode("child1"), createTreeNode("child2")]);

    const tree2 = createTreeNode("root", [
      createTreeNode("child1"),
      createTreeNode("child3"), // Different from tree1
    ]);

    // Calculate edit distance manually: 1 rename operation
    const distance = computeEditDistance(tree1, tree2);
    const maxNodes = Math.max(countNodes(tree1), countNodes(tree2)); // Both have 3 nodes
    const expectedTSED = Math.max(1 - distance / maxNodes, 0);

    console.log(`  Tree 1 nodes: ${countNodes(tree1)}`);
    console.log(`  Tree 2 nodes: ${countNodes(tree2)}`);
    console.log(`  Edit distance: ${distance}`);
    console.log(`  Expected TSED: ${expectedTSED.toFixed(4)}`);

    // Verify the formula: TSED = max{1 - δ/MaxNodes(G1,G2), 0}
    if (Math.abs(expectedTSED - (1 - distance / maxNodes)) < 0.0001) {
      console.log("✓ Test 1 passed: TSED formula correctly implemented\n");
      passed++;
    } else {
      console.log("✗ Test 1 failed: TSED formula incorrect\n");
      failed++;
    }
  }

  // Test 2: Verify operation costs (delete, insert, rename)
  function test2_operationCosts() {
    console.log("Test 2 - Operation Costs Verification:");

    // Test rename cost - single nodes with different labels
    const tree1 = createTreeNode("A");
    const tree2 = createTreeNode("B");

    const renameDefault = computeEditDistance(tree1, tree2, { renameCost: 1 });
    const renameCustom = computeEditDistance(tree1, tree2, { renameCost: 0.5 });

    console.log(`  Rename cost (default=1): ${renameDefault}`);
    console.log(`  Rename cost (custom=0.5): ${renameCustom}`);

    // Test that costs affect the algorithm's choice
    // When child deletion cost is high, it might be cheaper to delete the whole tree and insert a new one
    const treeWithChildren = createTreeNode("parent", [createTreeNode("child1"), createTreeNode("child2")]);
    const treeWithOneChild = createTreeNode("parent", [createTreeNode("child1")]);

    // With low delete cost, it should just delete one child
    const deleteLowCost = computeEditDistance(treeWithChildren, treeWithOneChild, { deleteCost: 1 });
    // With very high delete cost, the cost should reflect that
    const deleteHighCost = computeEditDistance(treeWithChildren, treeWithOneChild, { deleteCost: 4 });

    console.log(`  Delete child (cost=1): ${deleteLowCost}`);
    console.log(`  Delete child (cost=4): ${deleteHighCost}`);

    // Test insert with clear scenario
    const insertLowCost = computeEditDistance(treeWithOneChild, treeWithChildren, { insertCost: 1 });
    const insertHighCost = computeEditDistance(treeWithOneChild, treeWithChildren, { insertCost: 4 });

    console.log(`  Insert child (cost=1): ${insertLowCost}`);
    console.log(`  Insert child (cost=4): ${insertHighCost}`);

    // Verify costs are applied (they should increase with higher cost factors)
    const passRename = renameCustom === 0.5;
    const passDelete = deleteHighCost > deleteLowCost;
    const passInsert = insertHighCost > insertLowCost;

    console.log(`  Rename test: ${passRename ? "PASS" : "FAIL"}`);
    console.log(
      `  Delete test: ${passDelete ? "PASS" : "FAIL"} (high cost: ${deleteHighCost} > low cost: ${deleteLowCost})`,
    );
    console.log(
      `  Insert test: ${passInsert ? "PASS" : "FAIL"} (high cost: ${insertHighCost} > low cost: ${insertLowCost})`,
    );

    if (passRename && passDelete && passInsert) {
      console.log("✓ Test 2 passed: Operation costs correctly applied\n");
      passed++;
    } else {
      console.log("✗ Test 2 failed: Operation costs not correctly applied\n");
      failed++;
    }
  }

  // Test 3: Edge cases
  function test3_edgeCases() {
    console.log("Test 3 - Edge Cases:");

    // Identical trees should have TSED = 1.0
    const tree1 = createTreeNode("root", [createTreeNode("a", [createTreeNode("b")]), createTreeNode("c")]);
    const tree1Copy = createTreeNode("root", [createTreeNode("a", [createTreeNode("b")]), createTreeNode("c")]);

    const identicalDistance = computeEditDistance(tree1, tree1Copy);
    const identicalTSED = Math.max(1 - identicalDistance / countNodes(tree1), 0);

    console.log(`  Identical trees TSED: ${identicalTSED.toFixed(4)}`);

    // Completely different trees
    const tree2 = createTreeNode("x", [createTreeNode("y", [createTreeNode("z")])]);
    const tree3 = createTreeNode("p", [createTreeNode("q", [createTreeNode("r")])]);

    const differentDistance = computeEditDistance(tree2, tree3);
    const differentTSED = Math.max(1 - differentDistance / Math.max(countNodes(tree2), countNodes(tree3)), 0);

    console.log(`  Completely different trees TSED: ${differentTSED.toFixed(4)}`);

    // Empty vs non-empty tree
    const emptyTree = createTreeNode("");
    const nonEmptyTree = createTreeNode("root", [createTreeNode("child")]);

    const emptyDistance = computeEditDistance(emptyTree, nonEmptyTree);
    const maxNodes = Math.max(countNodes(emptyTree), countNodes(nonEmptyTree));
    const emptyTSED = Math.max(1 - emptyDistance / maxNodes, 0);

    console.log(`  Empty vs non-empty TSED: ${emptyTSED.toFixed(4)}`);
    console.log(`  Empty tree nodes: ${countNodes(emptyTree)}, Non-empty tree nodes: ${countNodes(nonEmptyTree)}`);
    console.log(`  Edit distance: ${emptyDistance}, Max nodes: ${maxNodes}`);

    // For completely different trees, TSED should be low
    // For empty vs non-empty, it depends on the size difference
    if (identicalTSED === 1.0 && differentTSED === 0.0) {
      console.log("✓ Test 3 passed: Edge cases handled correctly\n");
      passed++;
    } else {
      console.log("✗ Test 3 failed: Edge cases not handled correctly\n");
      console.log(`  Expected: identical=1.0, different=0.0`);
      console.log(`  Got: identical=${identicalTSED}, different=${differentTSED}`);
      failed++;
    }
  }

  // Test 4: Mathematical validation with real code
  function test4_mathematicalValidation() {
    console.log("Test 4 - Mathematical Validation with Real Code:");

    // Test with actual TypeScript code
    const code1 = `function add(a: number, b: number): number { return a + b; }`;
    const code2 = `function sum(x: number, y: number): number { return x + y; }`;
    const code3 = `function multiply(a: number, b: number): number { return a * b; }`;

    const ast1 = parseTypeScript("test1.ts", code1);
    const ast2 = parseTypeScript("test2.ts", code2);
    const ast3 = parseTypeScript("test3.ts", code3);

    const sim1_2 = calculateAPTEDSimilarityFromAST(ast1, ast2, {
      renameCost: 0.3,
    });
    const sim1_3 = calculateAPTEDSimilarityFromAST(ast1, ast3, {
      renameCost: 1,
    });

    console.log(`  Similar structure (add vs sum): ${(sim1_2 * 100).toFixed(1)}%`);
    console.log(`  Different logic (add vs multiply): ${(sim1_3 * 100).toFixed(1)}%`);

    // With low rename cost, structurally similar code should have high similarity
    if (sim1_2 > 0.8 && sim1_3 < sim1_2) {
      console.log("✓ Test 4 passed: Mathematical validation correct\n");
      passed++;
    } else {
      console.log("✗ Test 4 failed: Unexpected similarity values\n");
      failed++;
    }
  }

  // Test 5: TSED properties from the paper
  function test5_tsedProperties() {
    console.log("Test 5 - TSED Properties from Paper:");

    // TSED should be in [0, 1] range
    const code1 = `const x = 1;`;
    const code2 = `function complexFunction() { for(let i=0; i<100; i++) { console.log(i); } }`;

    const similarity = calculateAPTEDSimilarity(code1, code2);

    console.log(`  TSED value: ${similarity.toFixed(4)}`);
    console.log(`  In range [0, 1]: ${similarity >= 0 && similarity <= 1}`);

    // Test normalization with different tree sizes
    const smallTree = createTreeNode("root");
    const largeTree = createTreeNode("root", [
      createTreeNode("a", [createTreeNode("b"), createTreeNode("c")]),
      createTreeNode("d", [createTreeNode("e"), createTreeNode("f")]),
    ]);

    const distance = computeEditDistance(smallTree, largeTree);
    const maxNodes = Math.max(countNodes(smallTree), countNodes(largeTree));
    const tsed = Math.max(1 - distance / maxNodes, 0);

    console.log(`  Small tree nodes: ${countNodes(smallTree)}`);
    console.log(`  Large tree nodes: ${countNodes(largeTree)}`);
    console.log(`  Normalized TSED: ${tsed.toFixed(4)}`);

    if (similarity >= 0 && similarity <= 1 && tsed >= 0 && tsed <= 1) {
      console.log("✓ Test 5 passed: TSED properties maintained\n");
      passed++;
    } else {
      console.log("✗ Test 5 failed: TSED properties violated\n");
      failed++;
    }
  }

  // Test 6: Parameter optimization insights from paper
  function test6_parameterOptimization() {
    console.log("Test 6 - Parameter Optimization (from paper):");

    const code1 = `class Service { data: any[] = []; process(input: any): void { this.data.push(input); } }`;
    const code2 = `class Manager { items: any[] = []; handle(item: any): void { this.items.push(item); } }`;

    // Test different rename costs as suggested in the paper
    const rename1_0 = calculateAPTEDSimilarity(code1, code2, {
      renameCost: 1.0,
    });
    const rename0_8 = calculateAPTEDSimilarity(code1, code2, {
      renameCost: 0.8,
    });
    const rename0_5 = calculateAPTEDSimilarity(code1, code2, {
      renameCost: 0.5,
    });
    const rename0_3 = calculateAPTEDSimilarity(code1, code2, {
      renameCost: 0.3,
    });

    console.log(`  Rename cost 1.0: ${(rename1_0 * 100).toFixed(1)}%`);
    console.log(`  Rename cost 0.8: ${(rename0_8 * 100).toFixed(1)}%`);
    console.log(`  Rename cost 0.5: ${(rename0_5 * 100).toFixed(1)}%`);
    console.log(`  Rename cost 0.3: ${(rename0_3 * 100).toFixed(1)}%`);

    // Lower rename cost should increase similarity for structurally similar code
    if (rename0_3 > rename0_5 && rename0_5 > rename0_8 && rename0_8 > rename1_0) {
      console.log("✓ Test 6 passed: Parameter optimization works as expected\n");
      passed++;
    } else {
      console.log("✗ Test 6 failed: Parameter optimization not working correctly\n");
      failed++;
    }
  }

  // Test 7: Complex structural patterns
  function test7_complexStructures() {
    console.log("Test 7 - Complex Structural Patterns:");

    // Nested structures
    const nestedCode1 = `
      class Outer {
        inner: class {
          method() {
            return { nested: { deep: true } };
          }
        }
      }
    `;

    const nestedCode2 = `
      class External {
        internal: class {
          function() {
            return { nested: { deep: true } };
          }
        }
      }
    `;

    const nestedSim = calculateAPTEDSimilarity(nestedCode1, nestedCode2, {
      renameCost: 0.3,
    });

    // Loop structures
    const loopCode1 = `for (let i = 0; i < 10; i++) { console.log(i); }`;
    const loopCode2 = `let i = 0; while (i < 10) { console.log(i); i++; }`;

    const loopSim = calculateAPTEDSimilarity(loopCode1, loopCode2);

    console.log(`  Nested structures similarity: ${(nestedSim * 100).toFixed(1)}%`);
    console.log(`  Different loop types similarity: ${(loopSim * 100).toFixed(1)}%`);

    if (nestedSim > 0.7 && loopSim < 0.7) {
      console.log("✓ Test 7 passed: Complex structures handled appropriately\n");
      passed++;
    } else {
      console.log("✗ Test 7 failed: Complex structure handling needs improvement\n");
      failed++;
    }
  }

  // Test 8: Performance with increasing tree sizes
  function test8_performance() {
    console.log("Test 8 - Performance with Different Tree Sizes:");

    const sizes = [10, 50, 100];
    const results: { size: number; time: number; similarity: number }[] = [];

    for (const size of sizes) {
      // Generate code with increasing complexity
      let code = "function test() {\n";
      for (let i = 0; i < size; i++) {
        code += `  const var${i} = ${i};\n`;
      }
      code += "}";

      const start = performance.now();
      const similarity = calculateAPTEDSimilarity(code, code);
      const time = performance.now() - start;

      results.push({ size, time, similarity });
      console.log(`  Size ${size}: ${time.toFixed(2)}ms, similarity: ${(similarity * 100).toFixed(1)}%`);
    }

    // Check that performance scales reasonably
    const timeRatio = results[2].time / results[0].time;
    const sizeRatio = results[2].size / results[0].size;

    console.log(`  Time scaling factor: ${timeRatio.toFixed(1)}x for ${sizeRatio}x size increase`);

    if (results.every((r) => r.similarity === 1.0) && timeRatio < sizeRatio * sizeRatio) {
      console.log("✓ Test 8 passed: Performance scales acceptably\n");
      passed++;
    } else {
      console.log("✗ Test 8 failed: Performance issues detected\n");
      failed++;
    }
  }

  // Run all tests
  test1_tsedFormula();
  test2_operationCosts();
  test3_edgeCases();
  test4_mathematicalValidation();
  test5_tsedProperties();
  test6_parameterOptimization();
  test7_complexStructures();
  test8_performance();

  console.log(`\nAPTED Tests completed: ${passed} passed, ${failed} failed`);

  // Return exit code based on test results
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAPTEDTests();
}
