// Repository pattern refactored to functions with explicit state
// This shows how class methods can be converted to pure functions

export interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoryState<T extends Entity> {
  items: Map<string, T>;
  entityName: string;
}

export function createRepository<T extends Entity>(entityName: string): RepositoryState<T> {
  return {
    items: new Map(),
    entityName
  };
}

export function create<T extends Entity>(
  state: RepositoryState<T>,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): T {
  const id = generateId(state.entityName);
  const now = new Date();
  
  const entity = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now
  } as T;
  
  state.items.set(id, entity);
  log(state.entityName, 'created', id);
  
  return entity;
}

export function findById<T extends Entity>(
  state: RepositoryState<T>,
  id: string
): T | null {
  const item = state.items.get(id);
  
  if (!item) {
    log(state.entityName, 'not found', id);
    return null;
  }
  
  return item;
}

export function update<T extends Entity>(
  state: RepositoryState<T>,
  id: string,
  updates: Partial<Omit<T, 'id' | 'createdAt'>>
): T | null {
  const existing = findById(state, id);
  
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
  
  state.items.set(id, updated);
  log(state.entityName, 'updated', id);
  
  return updated;
}

export function deleteItem<T extends Entity>(
  state: RepositoryState<T>,
  id: string
): boolean {
  const exists = state.items.has(id);
  
  if (exists) {
    state.items.delete(id);
    log(state.entityName, 'deleted', id);
  }
  
  return exists;
}

export function findAll<T extends Entity>(
  state: RepositoryState<T>
): T[] {
  return Array.from(state.items.values());
}

export function findByPredicate<T extends Entity>(
  state: RepositoryState<T>,
  predicate: (item: T) => boolean
): T[] {
  return findAll(state).filter(predicate);
}

export function count<T extends Entity>(
  state: RepositoryState<T>
): number {
  return state.items.size;
}

export function clear<T extends Entity>(
  state: RepositoryState<T>
): void {
  state.items.clear();
  log(state.entityName, 'cleared', 'all');
}

function generateId(entityName: string): string {
  return `${entityName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function log(entityName: string, action: string, id: string): void {
  console.log(`[${entityName}] ${action}: ${id}`);
}