// Dissimilar: Interface declaration
interface DatabaseConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
}