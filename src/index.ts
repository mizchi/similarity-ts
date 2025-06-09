import { Parser, Language, Tree, Node } from "web-tree-sitter";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await Parser.init();

const parser = new Parser();
const Lang = await Language.load(
  join(
    __dirname,
    "../node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm"
  )
);
parser.setLanguage(Lang);

function parseCode(code: string): Tree {
  return parser.parse(code)!;
}

function printNode(node: Node, indent: string = ""): void {
  console.log(`${indent}${node.type} [${node.startIndex}-${node.endIndex}]`);

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      printNode(child, indent + "  ");
    }
  }
}

// Test
async function main() {
  const code = `
function hello(name: string): void {
  console.log("Hello, " + name);
}

class Example {
  constructor(private value: number) {}
  
  getValue(): number {
    return this.value;
  }
}
`;

  const tree = parseCode(code);
  console.log("=== AST ===");
  console.log(tree.rootNode.toString());

  console.log("\n=== Tree Structure ===");
  printNode(tree.rootNode);

  console.log("\n=== Extract Functions ===");
  extractFunctions(tree.rootNode);
}

function extractFunctions(node: Node, parentName?: string): void {
  if (
    node.type === "function_declaration" ||
    node.type === "function_expression"
  ) {
    const nameNode = node.childForFieldName("name");
    if (nameNode) {
      console.log(`Function: ${nameNode.text}`);
    }
  } else if (node.type === "method_definition") {
    const nameNode = node.childForFieldName("name");
    if (nameNode && parentName) {
      console.log(`Method: ${parentName}.${nameNode.text}`);
    }
  } else if (node.type === "class_declaration") {
    const nameNode = node.childForFieldName("name");
    const className = nameNode ? nameNode.text : "Anonymous";
    console.log(`Class: ${className}`);

    // Extract methods from class body
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        extractFunctions(child, className);
      }
    }
  }

  // Recursively search children
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      extractFunctions(child, parentName);
    }
  }
}

main();
