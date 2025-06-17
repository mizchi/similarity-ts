// Small test file 3

import { Component } from '@angular/core';
import { Observable } from 'rxjs';

export function calculate3(a: number, b: number): number {
  const result = a + b;
  console.log('Result:', result);
  return result;
}

interface Data3 {
  id: number;
  name: string;
  value: number;
}

