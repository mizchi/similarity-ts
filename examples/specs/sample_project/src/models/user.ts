export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  GUEST = "guest",
}

export interface UserProfile extends User {
  bio?: string;
  avatar?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark";
  language: string;
  notifications: boolean;
}
