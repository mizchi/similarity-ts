// Small test file 5

import { Component } from '@angular/core';
import { Observable } from 'rxjs';

export function calculate5(a: number, b: number): number {
  const result = a + b;
  console.log('Result:', result);
  return result;
}

interface Data5 {
  id: number;
  name: string;
  value: number;
}

