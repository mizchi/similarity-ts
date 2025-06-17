import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import { 
  extractFunctions, 
  compareFunctions,
  findDuplicateFunctions,
  type FunctionDefinition
} from '../src/index.ts';
import { 
  calculateTSED,
  REFACTORING_TSED_OPTIONS
} from '../src/core/tsed.ts';
import { parseTypeScript as parseSync } from '../src/parser.ts';
import { buildRepoAnalyzer } from '../src/index.ts';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, '__fixtures__/duplication');

test('Exact duplication detection', async () => {
  console.log('\n=== Testing Exact Duplication ===');
  
  const service1 = readFileSync(join(fixturesDir, 'exact/service_duplication_1.ts'), 'utf-8');
  const service2 = readFileSync(join(fixturesDir, 'exact/service_duplication_2.ts'), 'utf-8');
  
  // Parse and calculate TSED
  const ast1 = parseSync('service1.ts', service1);
  const ast2 = parseSync('service2.ts', service2);
  const tsed = calculateTSED(ast1, ast2);
  
  console.log(`Service duplication TSED: ${(tsed * 100).toFixed(1)}%`);
  assert(tsed > 0.75, 'Exact duplication should have TSED > 75%');
  
  // Extract and compare functions
  const functions1 = extractFunctions(service1);
  const functions2 = extractFunctions(service2);
  
  console.log(`Service1 methods: ${functions1.map(f => f.name).join(', ')}`);
  console.log(`Service2 methods: ${functions2.map(f => f.name).join(', ')}`);
  
  // Compare corresponding methods
  const addUser = functions1.find(f => f.name === 'addUser');
  const addCustomer = functions2.find(f => f.name === 'addCustomer');
  
  if (addUser && addCustomer) {
    const comparison = compareFunctions(addUser, addCustomer, {
      ignoreThis: true,
      ignoreParamNames: true
    });
    console.log(`addUser vs addCustomer: ${(comparison.similarity * 100).toFixed(1)}%`);
    assert(comparison.similarity > 0.85, 'Similar methods should have high similarity');
  }
});

test('Structural duplication detection', async () => {
  console.log('\n=== Testing Structural Duplication ===');
  
  // Array iteration patterns
  const array1 = readFileSync(join(fixturesDir, 'structural/array_iteration_pattern_1.ts'), 'utf-8');
  const array2 = readFileSync(join(fixturesDir, 'structural/array_iteration_pattern_2.ts'), 'utf-8');
  
  const arrayAst1 = parseSync('array1.ts', array1);
  const arrayAst2 = parseSync('array2.ts', array2);
  const arrayTsed = calculateTSED(arrayAst1, arrayAst2, REFACTORING_TSED_OPTIONS);
  
  console.log(`Array iteration pattern TSED: ${(arrayTsed * 100).toFixed(1)}%`);
  assert(arrayTsed > 0.6, 'Structural patterns should have TSED > 60%');
  
  // Compare functions
  const arrayFuncs1 = extractFunctions(array1);
  const arrayFuncs2 = extractFunctions(array2);
  
  const processUserData1 = arrayFuncs1.find(f => f.name === 'processUserData');
  const processUserData2 = arrayFuncs2.find(f => f.name === 'processUserData');
  
  if (processUserData1 && processUserData2) {
    const comparison = compareFunctions(processUserData1, processUserData2, {
      ignoreThis: true,
      ignoreParamNames: false
    });
    console.log(`processUserData imperative vs functional: ${(comparison.similarity * 100).toFixed(1)}%`);
  }
});

test('Semantic duplication detection', async () => {
  console.log('\n=== Testing Semantic Duplication ===');
  
  // Validation patterns
  const validation1 = readFileSync(join(fixturesDir, 'semantic/validation_pattern_1.ts'), 'utf-8');
  const validation2 = readFileSync(join(fixturesDir, 'semantic/validation_pattern_2.ts'), 'utf-8');
  
  const valAst1 = parseSync('validation1.ts', validation1);
  const valAst2 = parseSync('validation2.ts', validation2);
  const valTsed = calculateTSED(valAst1, valAst2);
  
  console.log(`Validation pattern TSED: ${(valTsed * 100).toFixed(1)}%`);
  
  // State management patterns
  const state1 = readFileSync(join(fixturesDir, 'semantic/state_management_pattern_1.ts'), 'utf-8');
  const state2 = readFileSync(join(fixturesDir, 'semantic/state_management_pattern_2.ts'), 'utf-8');
  
  const stateAst1 = parseSync('state1.ts', state1);
  const stateAst2 = parseSync('state2.ts', state2);
  const stateTsed = calculateTSED(stateAst1, stateAst2);
  
  console.log(`State management pattern TSED: ${(stateTsed * 100).toFixed(1)}%`);
  
  // Extract and analyze functions
  const stateFuncs1 = extractFunctions(state1);
  const stateFuncs2 = extractFunctions(state2);
  
  console.log(`Reducer functions: ${stateFuncs1.filter(f => f.name.includes('Reducer')).length}`);
  console.log(`Store methods: ${stateFuncs2.filter(f => f.type === 'method').length}`);
});

test('Copy-paste duplication detection', async () => {
  console.log('\n=== Testing Copy-Paste Duplication ===');
  
  // Error handling patterns
  const errorHandling = readFileSync(join(fixturesDir, 'copy_paste/error_handling_pattern.ts'), 'utf-8');
  const errorFunctions = extractFunctions(errorHandling);
  
  console.log(`\nError handling functions: ${errorFunctions.length}`);
  
  // Find duplicates within the same file
  const duplicates = findDuplicateFunctions(errorFunctions, { similarityThreshold: 0.8 });
  console.log(`Found ${duplicates.length} duplicate pairs`);
  
  // Group duplicates by function
  const groups = new Map<string, Set<FunctionDefinition>>();
  for (const [func1, func2, _result] of duplicates) {
    // Add to groups
    let foundGroup = false;
    for (const [_key, group] of groups) {
      if (group.has(func1) || group.has(func2)) {
        group.add(func1);
        group.add(func2);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      const newGroup = new Set<FunctionDefinition>();
      newGroup.add(func1);
      newGroup.add(func2);
      groups.set(`group${groups.size + 1}`, newGroup);
    }
  }
  
  console.log(`Grouped into ${groups.size} duplicate groups`);
  for (const [groupName, funcs] of groups) {
    console.log(`\n${groupName} (${funcs.size} functions):`);
    for (const func of funcs) {
      console.log(`  - ${func.name} (lines ${func.startLine}-${func.endLine})`);
    }
  }
  
  // Loop patterns
  const loopPattern = readFileSync(join(fixturesDir, 'copy_paste/loop_pattern.ts'), 'utf-8');
  const loopFunctions = extractFunctions(loopPattern);
  
  console.log(`\nLoop pattern functions: ${loopFunctions.length}`);
  
  const loopDuplicates = findDuplicateFunctions(loopFunctions, { similarityThreshold: 0.7 });
  console.log(`Found ${loopDuplicates.length} duplicate loop patterns`);
});

test('Refactoring pattern detection', async () => {
  console.log('\n=== Testing Refactoring Pattern Detection ===');
  
  // Repository pattern
  const repoClass = readFileSync(join(fixturesDir, 'refactoring/repository_class.ts'), 'utf-8');
  const repoFuncs = readFileSync(join(fixturesDir, 'refactoring/repository_functions.ts'), 'utf-8');
  
  const repoClassAst = parseSync('repo_class.ts', repoClass);
  const repoFuncsAst = parseSync('repo_funcs.ts', repoFuncs);
  const repoTsed = calculateTSED(repoClassAst, repoFuncsAst, REFACTORING_TSED_OPTIONS);
  
  console.log(`Repository pattern TSED: ${(repoTsed * 100).toFixed(1)}%`);
  assert(repoTsed > 0.5, 'Refactored code should have TSED > 50%');
  
  // Extract functions
  const classFunctions = extractFunctions(repoClass);
  const funcFunctions = extractFunctions(repoFuncs);
  
  console.log(`Class methods: ${classFunctions.filter(f => f.type === 'method').length}`);
  console.log(`Functions: ${funcFunctions.filter(f => f.type === 'function').length}`);
  
  // Compare specific methods
  const classFind = classFunctions.find(f => f.name === 'findById' && f.type === 'method');
  const funcFind = funcFunctions.find(f => f.name === 'findById');
  
  if (classFind && funcFind) {
    const comparison = compareFunctions(classFind, funcFind, {
      ignoreThis: true,
      ignoreParamNames: false
    });
    console.log(`findById method vs function: ${(comparison.similarity * 100).toFixed(1)}%`);
    assert(comparison.similarity > 0.75, 'Refactored methods should maintain high similarity');
  }
});

test('Multi-file duplication analysis', async () => {
  console.log('\n=== Testing Multi-File Duplication Analysis ===');
  
  const repo = buildRepoAnalyzer();
  
  // Load all duplication fixtures
  await repo.loadFiles('test/__fixtures__/duplication/**/*.ts');
  
  const stats = repo.getStatistics();
  console.log(`Loaded ${stats.totalFiles} files`);
  console.log(`Average tokens: ${stats.averageTokens}`);
  
  // Find all similar pairs
  const pairs = repo.findAllSimilarPairs(0.7, 'simhash');
  console.log(`\nFound ${pairs.length} similar pairs (threshold: 70%):`);
  
  // Group by category
  const categories = new Map<string, typeof pairs>();
  
  for (const pair of pairs) {
    const category = pair.file1.split('/')[4]; // Get category from path
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(pair);
  }
  
  // Display by category
  for (const [category, catPairs] of categories) {
    console.log(`\n${category}:`);
    for (const pair of catPairs.slice(0, 5)) {
      const file1Name = pair.file1.split('/').pop();
      const file2Name = pair.file2.split('/').pop();
      console.log(`  ${file1Name} <-> ${file2Name}: ${(pair.similarity * 100).toFixed(1)}%`);
    }
  }
});

// Run all tests
console.log('Running duplication detection tests...');