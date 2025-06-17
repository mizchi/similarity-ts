// Refactored to functional style
function addUser(users: Map<string, User>, user: User): void {
  if (!user.id) {
    throw new Error('User must have an ID');
  }
  users.set(user.id, user);
  console.log(`Added user: ${user.name}`);
}

function removeUser(users: Map<string, User>, userId: string): boolean {
  const user = users.get(userId);
  if (!user) {
    return false;
  }
  users.delete(userId);
  console.log(`Removed user: ${user.name}`);
  return true;
}

function getUser(users: Map<string, User>, userId: string): User | undefined {
  return users.get(userId);
}

function getAllUsers(users: Map<string, User>): User[] {
  return Array.from(users.values());
}

interface User {
  id: string;
  name: string;
  email: string;
}