// Original class implementation
class UserService {
  private users: Map<string, User> = new Map();
  
  addUser(user: User): void {
    if (!user.id) {
      throw new Error('User must have an ID');
    }
    this.users.set(user.id, user);
    console.log(`Added user: ${user.name}`);
  }
  
  removeUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }
    this.users.delete(userId);
    console.log(`Removed user: ${user.name}`);
    return true;
  }
  
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }
  
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}

interface User {
  id: string;
  name: string;
  email: string;
}