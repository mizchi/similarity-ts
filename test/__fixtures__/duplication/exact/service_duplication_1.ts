// Example of exact duplication: UserService
// This is a common pattern where a service is copied and slightly modified
export class UserService {
  private users: Map<string, User> = new Map();
  
  addUser(user: User): void {
    if (!user.id) {
      throw new Error('User must have an ID');
    }
    if (this.users.has(user.id)) {
      throw new Error('User already exists');
    }
    this.users.set(user.id, user);
  }
  
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }
  
  updateUser(id: string, updates: Partial<User>): User {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }
  
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}