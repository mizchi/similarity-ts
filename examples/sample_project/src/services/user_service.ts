import { User } from "../models/user.ts";
import { Logger } from "../utils/logger.ts";

export class UserService {
  private users: Map<string, User> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async createUser(data: Omit<User, "id" | "createdAt">): Promise<User> {
    const user: User = {
      id: this.generateId(),
      ...data,
      createdAt: new Date(),
    };

    this.users.set(user.id, user);
    this.logger.info(`User created: ${user.id}`);

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);

    if (!user) {
      this.logger.warn(`User not found: ${id}`);
      return null;
    }

    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUserById(id);

    if (!user) {
      return null;
    }

    const updatedUser = { ...user, ...updates, id: user.id };
    this.users.set(id, updatedUser);
    this.logger.info(`User updated: ${id}`);

    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const exists = this.users.has(id);

    if (exists) {
      this.users.delete(id);
      this.logger.info(`User deleted: ${id}`);
    }

    return exists;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
