// Refactoring pattern: Generic repository with class-based approach
// Typical OOP pattern with dependency injection
export class GenericRepository<T extends Entity> {
  constructor(
    private db: Database,
    private tableName: string
  ) {}

  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(): Promise<T[]> {
    const query = `SELECT * FROM ${this.tableName}`;
    const result = await this.db.query(query);
    return result.rows;
  }

  async findBy(conditions: Partial<T>): Promise<T[]> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
    
    const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await this.db.query(query, values);
    return result.rows;
  }

  async create(entity: Omit<T, 'id'>): Promise<T> {
    const id = generateId();
    const data = { ...entity, id };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    await this.db.query(query, values);
    
    return data as T;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    await this.db.query(query, [...values, id]);
    
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.db.query(query, [id]);
    return result.rowsAffected > 0;
  }
}

// Usage example
export class UserRepository extends GenericRepository<User> {
  constructor(db: Database) {
    super(db, 'users');
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findBy({ email });
    return users[0] || null;
  }
}

// Types
interface Entity {
  id: string;
}

interface User extends Entity {
  email: string;
  name: string;
}

interface Database {
  query(sql: string, params?: any[]): Promise<QueryResult>;
}

interface QueryResult {
  rows: any[];
  rowsAffected: number;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}