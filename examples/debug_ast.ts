import { parseTypeScript } from "../src/parser.ts";

const code = `
function addUser(user: User): void {
  console.log('hello');
}
`;

const ast = parseTypeScript("test.ts", code);

function inspect(node: any, depth = 0): void {
  const indent = "  ".repeat(depth);
  if (!node || typeof node !== "object") {
    console.log(indent + node);
    return;
  }

  console.log(indent + node.type + " {");

  for (const key in node) {
    if (key === "parent" || key === "scope") continue;
    const value = node[key];

    if (key === "span" && value) {
      console.log(indent + "  " + key + ": { start: " + value.start + ", end: " + value.end + " }");
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        console.log(indent + "  " + key + ": [");
        value.forEach((item) => inspect(item, depth + 2));
        console.log(indent + "  ]");
      }
    } else if (value && typeof value === "object" && value.type) {
      console.log(indent + "  " + key + ":");
      inspect(value, depth + 2);
    } else if (value !== undefined && value !== null && key !== "raw" && key !== "regex") {
      console.log(indent + "  " + key + ": " + JSON.stringify(value));
    }
  }

  console.log(indent + "}");
}

// Find the function
function findFunction(node: any): any {
  if (!node) return null;

  if (node.type === "FunctionDeclaration") {
    return node;
  }

  for (const key in node) {
    if (key === "parent" || key === "scope") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = findFunction(item);
        if (result) return result;
      }
    } else if (value && typeof value === "object") {
      const result = findFunction(value);
      if (result) return result;
    }
  }

  return null;
}

const func = findFunction(ast.program);
if (func) {
  console.log("Found function:");
  inspect(func, 0);

  console.log("\n\nCode snippet:");
  if (func.body) {
    console.log("func.body exists:", !!func.body);
    console.log("func.body.span:", func.body.span);
    console.log("func.body.start:", func.body.start);
    console.log("func.body.end:", func.body.end);

    if (func.body.start !== undefined && func.body.end !== undefined) {
      const bodyCode = code.substring(func.body.start, func.body.end);
      console.log("Body code (using start/end):", bodyCode);
    }
  }
}
