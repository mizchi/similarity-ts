import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { CodeSimilarity } from '../src/index.ts';

const FIXTURES_DIR = join(import.meta.dirname, '__fixtures__');
const SIMILAR_DIR = join(FIXTURES_DIR, 'similar');
const DISSIMILAR_DIR = join(FIXTURES_DIR, 'dissimilar');
const EDGE_CASES_DIR = join(FIXTURES_DIR, 'edge_cases');

// Thresholds for similarity
const SIMILAR_THRESHOLD = 0.7;  // Similar files should score >= 70%
const DISSIMILAR_THRESHOLD = 0.5;  // Dissimilar files should score < 50%

interface TestResult {
  name: string;
  file1: string;
  file2: string;
  levenshtein: number;
  apted: number;
  aptedCustom: number;
  passed: boolean;
  reason?: string;
}

function runFixtureTests() {
  const levenshteinSim = new CodeSimilarity();
  const aptedSim = new CodeSimilarity({ useAPTED: true });
  const aptedCustomSim = new CodeSimilarity({ 
    useAPTED: true,
    config: { renameCost: 0.3 }
  });

  const results: TestResult[] = [];
  
  console.log('=== Fixture-based Similarity Tests ===\n');

  // Test similar code pairs
  console.log('--- Testing Similar Code Pairs ---');
  const similarFiles = readdirSync(SIMILAR_DIR)
    .filter(f => f.endsWith('.ts'))
    .sort();
  
  for (let i = 0; i < similarFiles.length; i += 2) {
    if (i + 1 >= similarFiles.length) break;
    
    const file1 = similarFiles[i];
    const file2 = similarFiles[i + 1];
    const testName = file1.replace(/_1\.ts$/, '');
    
    const code1 = readFileSync(join(SIMILAR_DIR, file1), 'utf-8');
    const code2 = readFileSync(join(SIMILAR_DIR, file2), 'utf-8');
    
    const levScore = levenshteinSim.calculateSimilarity(code1, code2);
    const aptedScore = aptedSim.calculateSimilarity(code1, code2);
    const aptedCustomScore = aptedCustomSim.calculateSimilarity(code1, code2);
    
    const passed = levScore >= SIMILAR_THRESHOLD || 
                   aptedScore >= SIMILAR_THRESHOLD || 
                   aptedCustomScore >= SIMILAR_THRESHOLD;
    
    results.push({
      name: testName,
      file1,
      file2,
      levenshtein: levScore,
      apted: aptedScore,
      aptedCustom: aptedCustomScore,
      passed,
      reason: passed ? undefined : 'All algorithms scored below similarity threshold'
    });
    
    console.log(`\n${testName}:`);
    console.log(`  Files: ${file1} <-> ${file2}`);
    console.log(`  Levenshtein:        ${(levScore * 100).toFixed(1)}% ${levScore >= SIMILAR_THRESHOLD ? '✓' : '✗'}`);
    console.log(`  APTED:              ${(aptedScore * 100).toFixed(1)}% ${aptedScore >= SIMILAR_THRESHOLD ? '✓' : '✗'}`);
    console.log(`  APTED (rename=0.3): ${(aptedCustomScore * 100).toFixed(1)}% ${aptedCustomScore >= SIMILAR_THRESHOLD ? '✓' : '✗'}`);
    console.log(`  Result: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test dissimilar code pairs
  console.log('\n\n--- Testing Dissimilar Code Pairs ---');
  const dissimilarFiles = readdirSync(DISSIMILAR_DIR)
    .filter(f => f.endsWith('.ts'))
    .sort();
  
  for (let i = 0; i < dissimilarFiles.length; i += 2) {
    if (i + 1 >= dissimilarFiles.length) break;
    
    const file1 = dissimilarFiles[i];
    const file2 = dissimilarFiles[i + 1];
    const testName = file1.replace(/_1\.ts$/, '');
    
    const code1 = readFileSync(join(DISSIMILAR_DIR, file1), 'utf-8');
    const code2 = readFileSync(join(DISSIMILAR_DIR, file2), 'utf-8');
    
    const levScore = levenshteinSim.calculateSimilarity(code1, code2);
    const aptedScore = aptedSim.calculateSimilarity(code1, code2);
    const aptedCustomScore = aptedCustomSim.calculateSimilarity(code1, code2);
    
    const passed = levScore < DISSIMILAR_THRESHOLD || 
                   aptedScore < DISSIMILAR_THRESHOLD || 
                   aptedCustomScore < DISSIMILAR_THRESHOLD;
    
    results.push({
      name: testName,
      file1,
      file2,
      levenshtein: levScore,
      apted: aptedScore,
      aptedCustom: aptedCustomScore,
      passed,
      reason: passed ? undefined : 'All algorithms scored above dissimilarity threshold'
    });
    
    console.log(`\n${testName}:`);
    console.log(`  Files: ${file1} <-> ${file2}`);
    console.log(`  Levenshtein:        ${(levScore * 100).toFixed(1)}% ${levScore < DISSIMILAR_THRESHOLD ? '✓' : '✗'}`);
    console.log(`  APTED:              ${(aptedScore * 100).toFixed(1)}% ${aptedScore < DISSIMILAR_THRESHOLD ? '✓' : '✗'}`);
    console.log(`  APTED (rename=0.3): ${(aptedCustomScore * 100).toFixed(1)}% ${aptedCustomScore < DISSIMILAR_THRESHOLD ? '✓' : '✗'}`);
    console.log(`  Result: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Test edge cases
  console.log('\n\n--- Testing Edge Cases ---');
  const edgeCaseFiles = readdirSync(EDGE_CASES_DIR)
    .filter(f => f.endsWith('.ts'))
    .sort();
  
  for (let i = 0; i < edgeCaseFiles.length; i += 2) {
    if (i + 1 >= edgeCaseFiles.length) break;
    
    const file1 = edgeCaseFiles[i];
    const file2 = edgeCaseFiles[i + 1];
    const testName = file1.replace(/_1\.ts$/, '');
    
    const code1 = readFileSync(join(EDGE_CASES_DIR, file1), 'utf-8');
    const code2 = readFileSync(join(EDGE_CASES_DIR, file2), 'utf-8');
    
    let levScore = 0, aptedScore = 0, aptedCustomScore = 0;
    let error = null;
    
    try {
      levScore = levenshteinSim.calculateSimilarity(code1, code2);
      aptedScore = aptedSim.calculateSimilarity(code1, code2);
      aptedCustomScore = aptedCustomSim.calculateSimilarity(code1, code2);
    } catch (e) {
      error = e;
    }
    
    // Edge cases pass if they don't crash and return valid scores
    const passed = !error && 
                   levScore >= 0 && levScore <= 1 &&
                   aptedScore >= 0 && aptedScore <= 1 &&
                   aptedCustomScore >= 0 && aptedCustomScore <= 1;
    
    // Special case: identical files should have 100% similarity
    const isIdenticalTest = testName === 'identical';
    if (isIdenticalTest && passed) {
      const identicalPassed = levScore === 1.0 && aptedScore === 1.0 && aptedCustomScore === 1.0;
      results.push({
        name: testName,
        file1,
        file2,
        levenshtein: levScore,
        apted: aptedScore,
        aptedCustom: aptedCustomScore,
        passed: identicalPassed,
        reason: identicalPassed ? undefined : 'Identical files should have 100% similarity'
      });
    } else {
      results.push({
        name: testName,
        file1,
        file2,
        levenshtein: levScore,
        apted: aptedScore,
        aptedCustom: aptedCustomScore,
        passed,
        reason: error ? `Error: ${error.message}` : undefined
      });
    }
    
    console.log(`\n${testName}:`);
    console.log(`  Files: ${file1} <-> ${file2}`);
    if (error) {
      console.log(`  Error: ${error.message}`);
    } else {
      console.log(`  Levenshtein:        ${(levScore * 100).toFixed(1)}%`);
      console.log(`  APTED:              ${(aptedScore * 100).toFixed(1)}%`);
      console.log(`  APTED (rename=0.3): ${(aptedCustomScore * 100).toFixed(1)}%`);
    }
    console.log(`  Result: ${passed ? 'PASS' : 'FAIL'}`);
  }

  // Summary
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log('\n\n=== Test Summary ===');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  if (failedTests > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.reason}`);
    });
  }

  // Algorithm performance comparison
  console.log('\n=== Algorithm Performance ===');
  
  const similarResults = results.filter(r => r.name.startsWith('similar') || r.file1.startsWith('function_rename') || r.file1.startsWith('class_rename'));
  const dissimilarResults = results.filter(r => !similarResults.includes(r));
  
  // For similar code, which algorithm performs best?
  let levBestSimilar = 0, aptedBestSimilar = 0, aptedCustomBestSimilar = 0;
  similarResults.forEach(r => {
    const scores = [
      { algo: 'lev', score: r.levenshtein },
      { algo: 'apted', score: r.apted },
      { algo: 'aptedCustom', score: r.aptedCustom }
    ];
    const best = scores.reduce((a, b) => a.score > b.score ? a : b);
    if (best.algo === 'lev') levBestSimilar++;
    else if (best.algo === 'apted') aptedBestSimilar++;
    else aptedCustomBestSimilar++;
  });
  
  console.log('\nBest algorithm for similar code:');
  console.log(`  Levenshtein:        ${levBestSimilar} times`);
  console.log(`  APTED:              ${aptedBestSimilar} times`);
  console.log(`  APTED (rename=0.3): ${aptedCustomBestSimilar} times`);
  
  // For dissimilar code, which algorithm performs best?
  let levBestDissimilar = 0, aptedBestDissimilar = 0, aptedCustomBestDissimilar = 0;
  dissimilarResults.forEach(r => {
    const scores = [
      { algo: 'lev', score: r.levenshtein },
      { algo: 'apted', score: r.apted },
      { algo: 'aptedCustom', score: r.aptedCustom }
    ];
    const best = scores.reduce((a, b) => a.score < b.score ? a : b);
    if (best.algo === 'lev') levBestDissimilar++;
    else if (best.algo === 'apted') aptedBestDissimilar++;
    else aptedCustomBestDissimilar++;
  });
  
  console.log('\nBest algorithm for dissimilar code:');
  console.log(`  Levenshtein:        ${levBestDissimilar} times`);
  console.log(`  APTED:              ${aptedBestDissimilar} times`);
  console.log(`  APTED (rename=0.3): ${aptedCustomBestDissimilar} times`);
  
  return failedTests === 0;
}

// Run tests
const success = runFixtureTests();
process.exit(success ? 0 : 1);