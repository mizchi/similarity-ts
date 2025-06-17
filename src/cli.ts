#!/usr/bin/env node
// @ts-nocheck
import { parseArgs } from 'util';
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { parseTypeScript } from './parser.ts';
import { createRepository, addFile, findAllSimilarPairs } from './code_repository.ts';
import { calculateSimilarityAPTED, oxcToTreeNode, computeEditDistance, countNodes } from './core/apted.ts';

interface FunctionInfo {
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  ast: any;
}

interface ComparisonResult {
  function1: FunctionInfo;
  function2: FunctionInfo;
  similarity: number;
}

/**
 * Extract all functions from a TypeScript file
 */
function extractFunctions(filePath: string, content: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const ast = parseTypeScript(filePath, content);
  
  if (ast.errors.length > 0) {
    console.warn(chalk.yellow(`⚠️  Parse errors in ${filePath}`));
    return functions;
  }
  
  const lines = content.split('\n');
  const visited = new WeakSet();
  
  function findFunctions(node: any, parentName?: string): void {
    if (!node || typeof node !== 'object' || visited.has(node)) return;
    visited.add(node);
    
    // Extract function declarations
    if (node.type === 'FunctionDeclaration' && node.id?.name) {
      const startLine = getLineNumber(node.span?.start || 0, lines);
      const endLine = getLineNumber(node.span?.end || 0, lines);
      const functionContent = lines.slice(startLine - 1, endLine).join('\n');
      
      functions.push({
        name: node.id.name,
        filePath,
        startLine,
        endLine,
        content: functionContent,
        ast: node
      });
    }
    
    // Extract function expressions assigned to variables
    if (node.type === 'VariableDeclarator' && 
        node.id?.name && 
        (node.init?.type === 'FunctionExpression' || 
         node.init?.type === 'ArrowFunctionExpression')) {
      const startLine = getLineNumber(node.span?.start || 0, lines);
      const endLine = getLineNumber(node.span?.end || 0, lines);
      const functionContent = lines.slice(startLine - 1, endLine).join('\n');
      
      functions.push({
        name: node.id.name,
        filePath,
        startLine,
        endLine,
        content: functionContent,
        ast: node.init
      });
    }
    
    // Extract methods in classes
    if (node.type === 'MethodDefinition' && node.key?.name) {
      const methodName = parentName ? `${parentName}.${node.key.name}` : node.key.name;
      const startLine = getLineNumber(node.span?.start || 0, lines);
      const endLine = getLineNumber(node.span?.end || 0, lines);
      const functionContent = lines.slice(startLine - 1, endLine).join('\n');
      
      functions.push({
        name: methodName,
        filePath,
        startLine,
        endLine,
        content: functionContent,
        ast: node.value
      });
    }
    
    // Handle class declarations
    if (node.type === 'ClassDeclaration' && node.id?.name) {
      const className = node.id.name;
      // Process class methods
      if (node.body?.body && Array.isArray(node.body.body)) {
        for (const member of node.body.body) {
          findFunctions(member, className);
        }
      }
    }
    
    // Traverse children
    for (const key in node) {
      if (key === 'parent' || key === 'scope') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(v => findFunctions(v, parentName));
      } else if (value && typeof value === 'object') {
        findFunctions(value, parentName);
      }
    }
  }
  
  findFunctions(ast.program);
  return functions;
}

/**
 * Get line number from character offset
 */
function getLineNumber(offset: number, lines: string[]): number {
  let charCount = 0;
  for (let i = 0; i < lines.length; i++) {
    charCount += lines[i].length + 1; // +1 for newline
    if (charCount > offset) {
      return i + 1;
    }
  }
  return lines.length;
}

/**
 * Compare two functions using APTED
 */
function compareFunctions(func1: FunctionInfo, func2: FunctionInfo, noSizePenalty: boolean = false): number {
  try {
    // Convert AST nodes to tree nodes
    const tree1 = oxcToTreeNode(func1.ast);
    const tree2 = oxcToTreeNode(func2.ast);
    
    // Calculate edit distance (default renameCost: 0.3)
    const memoizedResults = new Map<string, number>();
    const distance = computeEditDistance(tree1, tree2, 0.3, memoizedResults);
    
    // Calculate TSED similarity (normalized by node count)
    const maxNodes = Math.max(countNodes(tree1), countNodes(tree2));
    const tsedSimilarity = maxNodes === 0 ? 1.0 : Math.max(1 - distance / maxNodes, 0);
    
    // Apply size penalty for very different sizes
    const size1 = countNodes(tree1);
    const size2 = countNodes(tree2);
    const sizeRatio = Math.min(size1, size2) / Math.max(size1, size2);
    
    // Apply size penalty unless disabled
    if (!noSizePenalty) {
      // If size difference is too large (e.g., one is 10x larger), reduce similarity
      if (sizeRatio < 0.1) {
        return tsedSimilarity * sizeRatio * 10; // Scale down dramatically
      } else if (sizeRatio < 0.3) {
        return tsedSimilarity * (0.7 + sizeRatio); // Moderate penalty
      }
    }
    
    return tsedSimilarity;
  } catch (error) {
    // Fallback to content-based comparison
    return calculateSimilarityAPTED(func1.content, func2.content);
  }
}


/**
 * Main CLI function
 */
async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      pattern: {
        type: 'string',
        short: 'p',
        default: '**/*.ts'
      },
      threshold: {
        type: 'string',
        short: 't',
        default: '0.7'
      },
      output: {
        type: 'string',
        short: 'o',
        default: 'console'
      },
      json: {
        type: 'boolean',
        short: 'j',
        default: false
      },
      'no-size-penalty': {
        type: 'boolean',
        default: false
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false
      }
    },
    allowPositionals: true
  });
  
  if (values.help || positionals.length === 0) {
    console.log(`
${chalk.bold('TypeScript Function Similarity CLI')}

Usage: ts-similarity <directory> [options]

Options:
  -p, --pattern <glob>     File pattern to match (default: "**/*.ts")
  -t, --threshold <num>    Similarity threshold 0-1 (default: 0.7)
  -o, --output <file>      Output file (default: console)
  -j, --json               Output as JSON
  --no-size-penalty        Disable size-based similarity penalty
  -h, --help               Show this help

Examples:
  ts-similarity ./src
  ts-similarity ./src -p "**/*.ts" -t 0.8
  ts-similarity ./src -j -o results.json
`);
    process.exit(0);
  }
  
  const directory = positionals[0];
  const pattern = values.pattern as string;
  const threshold = parseFloat(values.threshold as string);
  const outputFile = values.output as string;
  const jsonOutput = values.json as boolean;
  const noSizePenalty = values['no-size-penalty'] as boolean;
  
  console.log(chalk.bold('\n🔍 TypeScript Function Similarity Analyzer\n'));
  console.log(chalk.gray(`Directory: ${directory}`));
  console.log(chalk.gray(`Pattern: ${pattern}`));
  console.log(chalk.gray(`Threshold: ${threshold}`));
  console.log(chalk.gray(`Output: ${outputFile === 'console' ? 'Console' : outputFile}\n`));
  
  // Find all TypeScript files
  const files = await glob(pattern, { cwd: directory });
  console.log(chalk.blue(`Found ${files.length} TypeScript files\n`));
  
  // Extract all functions
  const allFunctions: FunctionInfo[] = [];
  for (const file of files) {
    const fullPath = join(directory, file);
    const content = readFileSync(fullPath, 'utf-8');
    const functions = extractFunctions(fullPath, content);
    allFunctions.push(...functions);
  }
  
  console.log(chalk.blue(`Extracted ${allFunctions.length} functions\n`));
  
  if (allFunctions.length === 0) {
    console.log(chalk.yellow('No functions found!'));
    process.exit(0);
  }
  
  // Create repository for efficient comparison
  const repo = createRepository();
  
  // Add all functions to repository
  for (let i = 0; i < allFunctions.length; i++) {
    const func = allFunctions[i];
    const id = `${func.filePath}:${func.name}:${func.startLine}`;
    addFile(repo, id, func.filePath, func.content);
  }
  
  // Find similar functions
  console.log(chalk.bold('Finding similar functions...\n'));
  
  const results: ComparisonResult[] = [];
  const processed = new Set<string>();
  
  // Compare all function pairs
  for (let i = 0; i < allFunctions.length; i++) {
    for (let j = i + 1; j < allFunctions.length; j++) {
      const func1 = allFunctions[i];
      const func2 = allFunctions[j];
      
      // Skip if same function
      if (func1.filePath === func2.filePath && func1.name === func2.name) {
        continue;
      }
      
      const similarity = compareFunctions(func1, func2, noSizePenalty);
      
      if (similarity >= threshold) {
        results.push({
          function1: func1,
          function2: func2,
          similarity
        });
      }
    }
    
    // Progress indicator
    if ((i + 1) % 10 === 0 || i === allFunctions.length - 1) {
      process.stdout.write(`\rProgress: ${i + 1}/${allFunctions.length} functions processed`);
    }
  }
  
  console.log('\n');
  
  // Sort results by similarity
  results.sort((a, b) => b.similarity - a.similarity);
  
  // Output results
  if (jsonOutput) {
    const jsonResults = results.map(r => ({
      function1: {
        name: r.function1.name,
        file: relative(directory, r.function1.filePath),
        line: r.function1.startLine
      },
      function2: {
        name: r.function2.name,
        file: relative(directory, r.function2.filePath),
        line: r.function2.startLine
      },
      similarity: r.similarity
    }));
    
    if (outputFile === 'console') {
      console.log(JSON.stringify(jsonResults, null, 2));
    } else {
      const { writeFileSync } = await import('fs');
      writeFileSync(outputFile, JSON.stringify(jsonResults, null, 2));
      console.log(chalk.green(`✅ Results written to ${outputFile}`));
    }
  } else {
    console.log(chalk.bold(`Found ${results.length} similar function pairs:\n`));
    
    if (results.length === 0) {
      console.log(chalk.gray('No similar functions found above threshold.'));
    } else {
      // Group by similarity level
      const highSimilarity = results.filter(r => r.similarity >= 0.9);
      const mediumSimilarity = results.filter(r => r.similarity >= 0.8 && r.similarity < 0.9);
      const lowSimilarity = results.filter(r => r.similarity >= threshold && r.similarity < 0.8);
      
      if (highSimilarity.length > 0) {
        console.log(chalk.red.bold('🔴 Very High Similarity (≥90%):'));
        for (const result of highSimilarity) {
          printResult(result, directory);
        }
        console.log();
      }
      
      if (mediumSimilarity.length > 0) {
        console.log(chalk.yellow.bold('🟡 High Similarity (80-90%):'));
        for (const result of mediumSimilarity) {
          printResult(result, directory);
        }
        console.log();
      }
      
      if (lowSimilarity.length > 0) {
        console.log(chalk.green.bold('🟢 Medium Similarity (70-80%):'));
        for (const result of lowSimilarity) {
          printResult(result, directory);
        }
        console.log();
      }
    }
    
    // Summary statistics
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(chalk.gray(`  Total functions analyzed: ${allFunctions.length}`));
    console.log(chalk.gray(`  Similar pairs found: ${results.length}`));
    if (results.length > 0) {
      const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
      console.log(chalk.gray(`  Average similarity: ${(avgSimilarity * 100).toFixed(1)}%`));
    }
  }
}

/**
 * Print a single result
 */
function printResult(result: ComparisonResult, baseDir: string) {
  const file1 = relative(baseDir, result.function1.filePath);
  const file2 = relative(baseDir, result.function2.filePath);
  const similarity = (result.similarity * 100).toFixed(1);
  
  console.log(chalk.gray('  ├─'), chalk.cyan(`${result.function1.name}`), chalk.gray(`in ${file1}:${result.function1.startLine}`));
  console.log(chalk.gray('  └─'), chalk.cyan(`${result.function2.name}`), chalk.gray(`in ${file2}:${result.function2.startLine}`));
  console.log(chalk.gray('     '), chalk.bold(`${similarity}% similar`));
}

// Run main function
main().catch(error => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});