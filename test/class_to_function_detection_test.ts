/// <reference lib="deno.ns" />
import { extractFunctions, compareFunctions, findDuplicateFunctions } from '../src/core/function_extractor.ts';
import { assertEquals } from 'https://deno.land/std@0.200.0/testing/asserts.ts';

// Type definitions for tests
interface User {
  id: string;
  name: string;
  email: string;
}

interface Database {
  query(sql: string, params: any[]): Promise<{ rows: any[] }>;
}

Deno.test('Class to function refactoring detection', async (t: Deno.TestContext) => {
  await t.step('should detect identical logic between class method and function', () => {
    const code = `
      // Original class implementation
      class UserService {
        private users: Map<string, User> = new Map();
        
        addUser(user: User): void {
          if (!user.id) {
            throw new Error('User must have an ID');
          }
          this.users.set(user.id, user);
          console.log(\`Added user: \${user.name}\`);
        }
        
        removeUser(userId: string): boolean {
          const user = this.users.get(userId);
          if (!user) {
            return false;
          }
          this.users.delete(userId);
          console.log(\`Removed user: \${user.name}\`);
          return true;
        }
      }
      
      // Refactored to functional style
      function addUser(users: Map<string, User>, user: User): void {
        if (!user.id) {
          throw new Error('User must have an ID');
        }
        users.set(user.id, user);
        console.log(\`Added user: \${user.name}\`);
      }
      
      function removeUser(users: Map<string, User>, userId: string): boolean {
        const user = users.get(userId);
        if (!user) {
          return false;
        }
        users.delete(userId);
        console.log(\`Removed user: \${user.name}\`);
        return true;
      }
    `;
    
    const functions = extractFunctions(code);
    
    // Should extract 4 functions total
    assertEquals(functions.length, 4);
    
    const classAddUser = functions.find(f => f.name === 'addUser' && f.type === 'method');
    const funcAddUser = functions.find(f => f.name === 'addUser' && f.type === 'function');
    const classRemoveUser = functions.find(f => f.name === 'removeUser' && f.type === 'method');
    const funcRemoveUser = functions.find(f => f.name === 'removeUser' && f.type === 'function');
    
    // All should be found
    assertEquals(classAddUser !== undefined, true);
    assertEquals(funcAddUser !== undefined, true);
    assertEquals(classRemoveUser !== undefined, true);
    assertEquals(funcRemoveUser !== undefined, true);
    
    // Compare with normalization
    const addComparison = compareFunctions(classAddUser!, funcAddUser!, {
      ignoreThis: true,
      ignoreParamNames: false
    });
    
    const removeComparison = compareFunctions(classRemoveUser!, funcRemoveUser!, {
      ignoreThis: true,
      ignoreParamNames: false
    });
    
    // Should have high similarity when ignoring this
    assertEquals(addComparison.similarity > 0.9, true);
    assertEquals(removeComparison.similarity > 0.9, true);
    
    // Should detect this usage difference
    assertEquals(addComparison.differences.thisUsage, true);
    assertEquals(removeComparison.differences.thisUsage, true);
  });
  
  await t.step('should detect refactored arrow functions', () => {
    const code = `
      class Calculator {
        private value: number = 0;
        
        add(n: number): number {
          this.value += n;
          return this.value;
        }
        
        subtract(n: number): number {
          this.value -= n;
          return this.value;
        }
      }
      
      // Arrow function refactoring
      const add = (state: { value: number }, n: number): number => {
        state.value += n;
        return state.value;
      };
      
      const subtract = (state: { value: number }, n: number): number => {
        state.value -= n;
        return state.value;
      };
    `;
    
    const functions = extractFunctions(code);
    const duplicates = findDuplicateFunctions(functions, {
      ignoreThis: true,
      ignoreParamNames: true,
      similarityThreshold: 0.9
    });
    
    // Should find 2 duplicate pairs
    assertEquals(duplicates.length, 2);
    
    // Check that correct pairs are found
    const addPair = duplicates.find(([f1, f2]) => 
      (f1.name === 'add' && f2.name === 'add') ||
      (f2.name === 'add' && f1.name === 'add')
    );
    
    const subtractPair = duplicates.find(([f1, f2]) => 
      (f1.name === 'subtract' && f2.name === 'subtract') ||
      (f2.name === 'subtract' && f1.name === 'subtract')
    );
    
    assertEquals(addPair !== undefined, true);
    assertEquals(subtractPair !== undefined, true);
  });
  
  await t.step('should handle complex refactoring patterns', () => {
    const code = `
      // Original: Repository pattern with class
      class UserRepository {
        private db: Database;
        
        constructor(db: Database) {
          this.db = db;
        }
        
        async findById(id: string): Promise<User | null> {
          const result = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
          if (result.rows.length === 0) {
            return null;
          }
          return this.mapRowToUser(result.rows[0]);
        }
        
        private mapRowToUser(row: any): User {
          return {
            id: row.id,
            name: row.name,
            email: row.email
          };
        }
      }
      
      // Refactored: Functional approach
      async function findUserById(db: Database, id: string): Promise<User | null> {
        const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        if (result.rows.length === 0) {
          return null;
        }
        return mapRowToUser(result.rows[0]);
      }
      
      function mapRowToUser(row: any): User {
        return {
          id: row.id,
          name: row.name,
          email: row.email
        };
      }
    `;
    
    const functions = extractFunctions(code);
    
    // Find the corresponding methods/functions
    const classFindById = functions.find(f => f.name === 'findById' && f.type === 'method');
    const funcFindUserById = functions.find(f => f.name === 'findUserById' && f.type === 'function');
    const classMapRow = functions.find(f => f.name === 'mapRowToUser' && f.type === 'method');
    const funcMapRow = functions.find(f => f.name === 'mapRowToUser' && f.type === 'function');
    
    // Compare findById implementations
    if (classFindById && funcFindUserById) {
      const comparison = compareFunctions(classFindById, funcFindUserById, {
        ignoreThis: true,
        ignoreParamNames: true
      });
      
      // Should have high similarity despite name difference
      assertEquals(comparison.similarity > 0.85, true);
      assertEquals(comparison.differences.thisUsage, true);
    }
    
    // Compare mapRowToUser implementations
    if (classMapRow && funcMapRow) {
      const comparison = compareFunctions(classMapRow, funcMapRow, {
        ignoreThis: true,
        ignoreParamNames: true
      });
      
      // Should be nearly identical
      assertEquals(comparison.similarity > 0.95, true);
    }
  });
  
  await t.step('should detect state management refactoring', () => {
    const code = `
      // Class with state
      class Counter {
        private count: number = 0;
        
        increment(): void {
          this.count++;
          this.notify();
        }
        
        decrement(): void {
          this.count--;
          this.notify();
        }
        
        private notify(): void {
          console.log(\`Count is now: \${this.count}\`);
        }
      }
      
      // Functional state management
      interface CounterState {
        count: number;
      }
      
      function increment(state: CounterState): CounterState {
        state.count++;
        notify(state);
        return state;
      }
      
      function decrement(state: CounterState): CounterState {
        state.count--;
        notify(state);
        return state;
      }
      
      function notify(state: CounterState): void {
        console.log(\`Count is now: \${state.count}\`);
      }
    `;
    
    const functions = extractFunctions(code);
    const duplicates = findDuplicateFunctions(functions, {
      ignoreThis: true,
      ignoreParamNames: true,
      similarityThreshold: 0.8
    });
    
    // Should find duplicates for increment, decrement, and notify
    const incrementDupe = duplicates.find(([f1, f2]) => 
      f1.name === 'increment' && f2.name === 'increment'
    );
    const decrementDupe = duplicates.find(([f1, f2]) => 
      f1.name === 'decrement' && f2.name === 'decrement'
    );
    const notifyDupe = duplicates.find(([f1, f2]) => 
      f1.name === 'notify' && f2.name === 'notify'
    );
    
    assertEquals(incrementDupe !== undefined, true);
    assertEquals(decrementDupe !== undefined, true);
    assertEquals(notifyDupe !== undefined, true);
    
    // Check similarity scores
    if (incrementDupe) {
      assertEquals(incrementDupe[2].similarity > 0.8, true);
    }
  });
});