// Refactoring pattern: Generic repository with functional approach
// Same functionality as repository_class.ts but using functions and closures

export function createRepository<T extends Entity>(
  db: Database,
  tableName: string
) {
  const findById = async (id: string): Promise<T | null> => {
    const query = `SELECT * FROM ${tableName} WHERE id = ?`;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  };

  const findAll = async (): Promise<T[]> => {
    const query = `SELECT * FROM ${tableName}`;
    const result = await db.query(query);
    return result.rows;
  };

  const findBy = async (conditions: Partial<T>): Promise<T[]> => {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
    
    const query = `SELECT * FROM ${tableName} WHERE ${whereClause}`;
    const result = await db.query(query, values);
    return result.rows;
  };

  const create = async (entity: Omit<T, 'id'>): Promise<T> => {
    const id = generateId();
    const data = { ...entity, id };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    await db.query(query, values);
    
    return data as T;
  };

  const update = async (id: string, updates: Partial<T>): Promise<T | null> => {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    await db.query(query, [...values, id]);
    
    return findById(id);
  };

  const remove = async (id: string): Promise<boolean> => {
    const query = `DELETE FROM ${tableName} WHERE id = ?`;
    const result = await db.query(query, [id]);
    return result.rowsAffected > 0;
  };

  return {
    findById,
    findAll,
    findBy,
    create,
    update,
    delete: remove
  };
}

// Usage example
export function createUserRepository(db: Database) {
  const baseRepo = createRepository<User>(db, 'users');
  
  const findByEmail = async (email: string): Promise<User | null> => {
    const users = await baseRepo.findBy({ email });
    return users[0] || null;
  };

  return {
    ...baseRepo,
    findByEmail
  };
}

// Types (same as class version)
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