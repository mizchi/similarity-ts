// Repository pattern as a class with internal state
// This is a real-world pattern from the codebase

export interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Repository<T extends Entity> {
  private items: Map<string, T> = new Map();
  private entityName: string;
  
  constructor(entityName: string) {
    this.entityName = entityName;
  }
  
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
    const id = this.generateId();
    const now = new Date();
    
    const entity = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    } as T;
    
    this.items.set(id, entity);
    this.log('created', id);
    
    return entity;
  }
  
  findById(id: string): T | null {
    const item = this.items.get(id);
    
    if (!item) {
      this.log('not found', id);
      return null;
    }
    
    return item;
  }
  
  update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): T | null {
    const existing = this.findById(id);
    
    if (!existing) {
      return null;
    }
    
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date()
    } as T;
    
    this.items.set(id, updated);
    this.log('updated', id);
    
    return updated;
  }
  
  delete(id: string): boolean {
    const exists = this.items.has(id);
    
    if (exists) {
      this.items.delete(id);
      this.log('deleted', id);
    }
    
    return exists;
  }
  
  findAll(): T[] {
    return Array.from(this.items.values());
  }
  
  findByPredicate(predicate: (item: T) => boolean): T[] {
    return this.findAll().filter(predicate);
  }
  
  count(): number {
    return this.items.size;
  }
  
  clear(): void {
    this.items.clear();
    this.log('cleared', 'all');
  }
  
  private generateId(): string {
    return `${this.entityName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private log(action: string, id: string): void {
    console.log(`[${this.entityName}] ${action}: ${id}`);
  }
}