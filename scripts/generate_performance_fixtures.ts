// Script to generate performance test fixtures of various sizes
import { writeFileSync } from "fs";
import { join } from "path";

// Small file generator (10-50 lines)
function generateSmallFile(index: number): string {
  const lines = 20 + Math.floor(Math.random() * 30);
  let code = `// Small test file ${index}\n\n`;

  // Add some imports
  code += `import { Component } from '@angular/core';\n`;
  code += `import { Observable } from 'rxjs';\n\n`;

  // Add a simple function
  code += `export function calculate${index}(a: number, b: number): number {\n`;
  code += `  const result = a + b;\n`;
  code += `  console.log('Result:', result);\n`;
  code += `  return result;\n`;
  code += `}\n\n`;

  // Add an interface
  code += `interface Data${index} {\n`;
  code += `  id: number;\n`;
  code += `  name: string;\n`;
  code += `  value: number;\n`;
  code += `}\n\n`;

  // Add a class if we have room
  if (lines > 25) {
    code += `class Service${index} {\n`;
    code += `  private data: Data${index}[] = [];\n\n`;
    code += `  add(item: Data${index}): void {\n`;
    code += `    this.data.push(item);\n`;
    code += `  }\n\n`;
    code += `  get(id: number): Data${index} | undefined {\n`;
    code += `    return this.data.find(d => d.id === id);\n`;
    code += `  }\n`;
    code += `}\n`;
  }

  return code;
}

// Medium file generator (100-500 lines)
function generateMediumFile(index: number): string {
  let code = `// Medium test file ${index}\n\n`;

  // Add imports
  code += `import { Injectable } from '@angular/core';\n`;
  code += `import { HttpClient } from '@angular/common/http';\n`;
  code += `import { Observable, map, catchError } from 'rxjs';\n\n`;

  // Add multiple interfaces
  for (let i = 0; i < 5; i++) {
    code += `export interface Entity${i} {\n`;
    code += `  id: string;\n`;
    code += `  name: string;\n`;
    code += `  description?: string;\n`;
    code += `  metadata: Record<string, any>;\n`;
    code += `  createdAt: Date;\n`;
    code += `  updatedAt: Date;\n`;
    code += `}\n\n`;
  }

  // Add a service class with multiple methods
  code += `@Injectable()\n`;
  code += `export class DataService${index} {\n`;
  code += `  private baseUrl = '/api/v1';\n\n`;
  code += `  constructor(private http: HttpClient) {}\n\n`;

  // Add CRUD methods
  const entities = ["User", "Product", "Order", "Category", "Review"];
  for (const entity of entities) {
    code += `  // ${entity} methods\n`;
    code += `  get${entity}s(): Observable<${entity}[]> {\n`;
    code += `    return this.http.get<${entity}[]>(\`\${this.baseUrl}/${entity.toLowerCase()}s\`)\n`;
    code += `      .pipe(\n`;
    code += `        map(data => data.map(this.transform${entity})),\n`;
    code += `        catchError(this.handleError)\n`;
    code += `      );\n`;
    code += `  }\n\n`;

    code += `  get${entity}(id: string): Observable<${entity}> {\n`;
    code += `    return this.http.get<${entity}>(\`\${this.baseUrl}/${entity.toLowerCase()}s/\${id}\`)\n`;
    code += `      .pipe(\n`;
    code += `        map(this.transform${entity}),\n`;
    code += `        catchError(this.handleError)\n`;
    code += `      );\n`;
    code += `  }\n\n`;

    code += `  create${entity}(data: Partial<${entity}>): Observable<${entity}> {\n`;
    code += `    return this.http.post<${entity}>(\`\${this.baseUrl}/${entity.toLowerCase()}s\`, data)\n`;
    code += `      .pipe(\n`;
    code += `        map(this.transform${entity}),\n`;
    code += `        catchError(this.handleError)\n`;
    code += `      );\n`;
    code += `  }\n\n`;

    code += `  private transform${entity}(data: any): ${entity} {\n`;
    code += `    return {\n`;
    code += `      ...data,\n`;
    code += `      createdAt: new Date(data.createdAt),\n`;
    code += `      updatedAt: new Date(data.updatedAt)\n`;
    code += `    };\n`;
    code += `  }\n\n`;
  }

  code += `  private handleError(error: any): Observable<never> {\n`;
  code += `    console.error('API Error:', error);\n`;
  code += `    throw error;\n`;
  code += `  }\n`;
  code += `}\n`;

  return code;
}

// Large file generator (1000+ lines)
function generateLargeFile(index: number): string {
  let code = `// Large test file ${index}\n`;
  code += `// This file simulates a complex module with many components\n\n`;

  // Add many imports
  const imports = [
    "@angular/core",
    "@angular/common",
    "@angular/forms",
    "@angular/router",
    "@angular/http",
    "rxjs",
    "lodash",
  ];

  for (const imp of imports) {
    code += `import * as ${imp.replace(/[@/-]/g, "_")} from '${imp}';\n`;
  }
  code += "\n";

  // Add a large enum
  code += `export enum ActionType {\n`;
  for (let i = 0; i < 50; i++) {
    code += `  ACTION_${i} = 'ACTION_${i}',\n`;
  }
  code += `}\n\n`;

  // Add multiple complex classes
  for (let classIndex = 0; classIndex < 10; classIndex++) {
    code += `export class Component${classIndex} {\n`;
    code += `  private state: any = {};\n`;
    code += `  private subscriptions: any[] = [];\n\n`;

    // Add lifecycle methods
    const lifecycles = ["OnInit", "OnDestroy", "OnChanges", "AfterViewInit"];
    for (const lifecycle of lifecycles) {
      code += `  ng${lifecycle}(): void {\n`;
      code += `    console.log('${lifecycle} called');\n`;
      code += `    // Implementation details...\n`;
      code += `  }\n\n`;
    }

    // Add many methods
    for (let methodIndex = 0; methodIndex < 20; methodIndex++) {
      code += `  method${methodIndex}(param${methodIndex}: any): any {\n`;
      code += `    try {\n`;
      code += `      const result = this.process${methodIndex}(param${methodIndex});\n`;
      code += `      this.state['result${methodIndex}'] = result;\n`;
      code += `      return result;\n`;
      code += `    } catch (error) {\n`;
      code += `      console.error('Error in method${methodIndex}:', error);\n`;
      code += `      throw error;\n`;
      code += `    }\n`;
      code += `  }\n\n`;

      code += `  private process${methodIndex}(data: any): any {\n`;
      code += `    // Complex processing logic\n`;
      code += `    if (typeof data === 'string') {\n`;
      code += `      return data.toUpperCase();\n`;
      code += `    } else if (Array.isArray(data)) {\n`;
      code += `      return data.map(item => this.transform(item));\n`;
      code += `    } else if (typeof data === 'object') {\n`;
      code += `      return Object.keys(data).reduce((acc, key) => {\n`;
      code += `        acc[key] = this.transform(data[key]);\n`;
      code += `        return acc;\n`;
      code += `      }, {} as any);\n`;
      code += `    }\n`;
      code += `    return data;\n`;
      code += `  }\n\n`;
    }

    code += `  private transform(value: any): any {\n`;
    code += `    return value;\n`;
    code += `  }\n`;
    code += `}\n\n`;
  }

  return code;
}

// Generate fixtures
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixtureDir = join(__dirname, "../test/__fixtures__/performance");

// Generate small files
for (let i = 1; i <= 5; i++) {
  const content = generateSmallFile(i);
  const path = join(fixtureDir, "small", `small_${i}.ts`);
  writeFileSync(path, content);
  console.log(`Generated ${path}`);
}

// Generate medium files
for (let i = 1; i <= 3; i++) {
  const content = generateMediumFile(i);
  const path = join(fixtureDir, "medium", `medium_${i}.ts`);
  writeFileSync(path, content);
  console.log(`Generated ${path}`);
}

// Generate large files
for (let i = 1; i <= 2; i++) {
  const content = generateLargeFile(i);
  const path = join(fixtureDir, "large", `large_${i}.ts`);
  writeFileSync(path, content);
  console.log(`Generated ${path}`);
}

// Generate metadata
const metadata = {
  description: "Performance test fixtures of various sizes",
  categories: {
    small: {
      description: "Small files (10-50 lines)",
      averageSize: "~30 lines",
      files: 5,
    },
    medium: {
      description: "Medium files (100-500 lines)",
      averageSize: "~300 lines",
      files: 3,
    },
    large: {
      description: "Large files (1000+ lines)",
      averageSize: "~1500 lines",
      files: 2,
    },
  },
};

writeFileSync(join(fixtureDir, "metadata.json"), JSON.stringify(metadata, null, 2));
console.log("Generated metadata.json");
