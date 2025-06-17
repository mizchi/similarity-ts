// Small test file 1

import { Component } from '@angular/core';
import { Observable } from 'rxjs';

export function calculate1(a: number, b: number): number {
  const result = a + b;
  console.log('Result:', result);
  return result;
}

interface Data1 {
  id: number;
  name: string;
  value: number;
}

class Service1 {
  private data: Data1[] = [];

  add(item: Data1): void {
    this.data.push(item);
  }

  get(id: number): Data1 | undefined {
    return this.data.find(d => d.id === id);
  }
}
