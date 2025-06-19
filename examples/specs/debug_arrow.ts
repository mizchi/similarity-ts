import { parseTypeScript } from "../src/parser.ts";

const code = `
const addUserToMap = (userMap: Map<string, User>, newUser: User): void => {
  if (!newUser.id) {
    throw new Error('User must have an ID');
  }
  userMap.set(newUser.id, newUser);
  console.log(\`User \${newUser.name} added\`);
};
`;

const ast = parseTypeScript("test.ts", code);

function findArrowFunction(node: any, depth = 0): void {
  if (!node || typeof node !== "object") return;

  const indent = "  ".repeat(depth);

  if (node.type === "VariableDeclarator") {
    console.log(indent + "VariableDeclarator:", node.id?.name);
    console.log(indent + "  init type:", node.init?.type);
  }

  if (node.type === "ArrowFunctionExpression") {
    console.log(indent + "Found ArrowFunctionExpression!");
    console.log(indent + "  has body:", !!node.body);
    console.log(indent + "  body type:", node.body?.type);
    console.log(indent + "  expression:", node.expression);
  }

  for (const key in node) {
    if (key === "parent" || key === "scope") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach((v) => findArrowFunction(v, depth + 1));
    } else if (value && typeof value === "object") {
      findArrowFunction(value, depth + 1);
    }
  }
}

findArrowFunction(ast.program);
