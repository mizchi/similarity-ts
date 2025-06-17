// Small test file 4

import { Component } from '@angular/core';
import { Observable } from 'rxjs';

export function calculate4(a: number, b: number): number {
  const result = a + b;
  console.log('Result:', result);
  return result;
}

interface Data4 {
  id: number;
  name: string;
  value: number;
}

