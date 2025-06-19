import { extractFunctions } from "../src/core/function_extractor.ts";

const code = `
class UserService {
  addUser(user: User): void {
    if (!user.id) {
      throw new Error('User must have an ID');
    }
    this.users.set(user.id, user);
    console.log(\`User \${user.name} added\`);
  }
}

function addUserToStore(store: Map<string, User>, user: User): void {
  if (!user.id) {
    throw new Error('User must have an ID');
  }
  store.set(user.id, user);
  console.log(\`User \${user.name} added\`);
}

const addUserToMap = (userMap: Map<string, User>, newUser: User): void => {
  if (!newUser.id) {
    throw new Error('User must have an ID');
  }
  userMap.set(newUser.id, newUser);
  console.log(\`User \${newUser.name} added\`);
};
`;

console.log("Extracting functions...\n");
const functions = extractFunctions(code);

console.log(`Found ${functions.length} functions:\n`);

functions.forEach((func) => {
  console.log(`Name: ${func.name}`);
  console.log(`Type: ${func.type}`);
  console.log(`Parameters: [${func.parameters.join(", ")}]`);
  console.log(`Body length: ${func.body.length}`);
  console.log(`Body preview: ${func.body.substring(0, 100)}...`);
  if (func.className) {
    console.log(`Class: ${func.className}`);
  }
  console.log("---\n");
});
