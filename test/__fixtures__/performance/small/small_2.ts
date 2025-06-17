// Small test file 2

import { Component } from '@angular/core';
import { Observable } from 'rxjs';

export function calculate2(a: number, b: number): number {
  const result = a + b;
  console.log('Result:', result);
  return result;
}

interface Data2 {
  id: number;
  name: string;
  value: number;
}

class Service2 {
  private data: Data2[] = [];

  add(item: Data2): void {
    this.data.push(item);
  }

  get(id: number): Data2 | undefined {
    return this.data.find(d => d.id === id);
  }
}
