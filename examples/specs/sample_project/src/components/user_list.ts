import { User } from "../models/user.ts";

export class UserList {
  private container: HTMLElement;
  private users: User[] = [];

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id ${containerId} not found`);
    }
    this.container = element;
  }

  setUsers(users: User[]): void {
    this.users = users;
    this.render();
  }

  addUser(user: User): void {
    this.users.push(user);
    this.render();
  }

  removeUser(userId: string): void {
    this.users = this.users.filter((u) => u.id !== userId);
    this.render();
  }

  private render(): void {
    this.container.innerHTML = "";

    if (this.users.length === 0) {
      this.container.innerHTML = "<p>No users found</p>";
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "user-list";

    this.users.forEach((user) => {
      const li = document.createElement("li");
      li.className = "user-item";
      li.innerHTML = `
        <span class="user-name">${this.escapeHtml(user.name)}</span>
        <span class="user-email">${this.escapeHtml(user.email)}</span>
        <span class="user-role">${user.role}</span>
      `;
      ul.appendChild(li);
    });

    this.container.appendChild(ul);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
