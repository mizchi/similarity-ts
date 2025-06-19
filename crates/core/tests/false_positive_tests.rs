use similarity_ts_core::{compare_functions, extract_functions, TSEDOptions};

#[test]
fn test_different_functions_should_not_have_high_similarity() {
    // Case 1: extractTokensFromAST vs getNodeLabel - reported 83.48% similarity
    let code1 = r#"
export function extractTokensFromAST(ast: any): string[] {
    const tokens: string[] = [];
    
    function traverse(node: any) {
        if (!node) return;
        
        if (node.type) {
            tokens.push(node.type);
        }
        
        if (Array.isArray(node)) {
            for (const child of node) {
                traverse(child);
            }
        } else if (typeof node === 'object') {
            for (const key in node) {
                if (key !== 'type' && node[key]) {
                    traverse(node[key]);
                }
            }
        }
    }
    
    traverse(ast);
    return tokens;
}
"#;

    let code2 = r#"
function getNodeLabel(node: TreeNode): string {
    switch (node.type) {
        case 'Identifier':
            return `ID:${node.name}`;
        case 'StringLiteral':
            return `STR:${node.value}`;
        case 'NumericLiteral':
            return `NUM:${node.value}`;
        case 'BooleanLiteral':
            return `BOOL:${node.value}`;
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunction':
            return 'FUNC';
        case 'MethodDefinition':
            return 'METHOD';
        case 'CallExpression':
            return 'CALL';
        case 'MemberExpression':
            return 'MEMBER';
        default:
            return node.type || 'UNKNOWN';
    }
}
"#;

    let options = TSEDOptions {
        size_penalty: true, // Enable size penalty
        ..Default::default()
    };

    let funcs1 = extract_functions("test1.ts", code1).unwrap();
    let funcs2 = extract_functions("test2.ts", code2).unwrap();

    assert!(!funcs1.is_empty(), "Should extract extractTokensFromAST");
    assert!(!funcs2.is_empty(), "Should extract getNodeLabel");

    let similarity = compare_functions(&funcs1[0], &funcs2[0], code1, code2, &options).unwrap();

    // These are completely different functions - one traverses AST, another returns labels
    // Similarity should be much lower than 83.48%
    assert!(
        similarity < 0.50,
        "extractTokensFromAST vs getNodeLabel similarity is {:.2}%, expected < 50%",
        similarity * 100.0
    );
}

#[test]
fn test_different_purpose_functions_should_have_low_similarity() {
    // Case 2: main CLI function vs computeChildrenAlignment - reported 88.75% similarity
    let code1 = r#"
async function main() {
    const args = parseArgs();
    const config = loadConfig();
    
    try {
        if (args.command === 'check') {
            const files = await findFiles(args.path);
            const results = await analyzeFiles(files);
            displayResults(results);
        } else if (args.command === 'compare') {
            const result = await compareFiles(args.file1, args.file2);
            console.log(result);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
"#;

    let code2 = r#"
function computeChildrenAlignment(node1: TreeNode, node2: TreeNode): AlignmentResult {
    const children1 = node1.children || [];
    const children2 = node2.children || [];
    
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= children1.length; i++) {
        matrix[i] = [];
        for (let j = 0; j <= children2.length; j++) {
            if (i === 0 || j === 0) {
                matrix[i][j] = 0;
            }
        }
    }
    
    // Fill matrix using dynamic programming
    for (let i = 1; i <= children1.length; i++) {
        for (let j = 1; j <= children2.length; j++) {
            const similarity = computeSimilarity(children1[i-1], children2[j-1]);
            matrix[i][j] = Math.max(
                matrix[i-1][j],
                matrix[i][j-1],
                matrix[i-1][j-1] + similarity
            );
        }
    }
    
    return { score: matrix[children1.length][children2.length], alignment: matrix };
}
"#;

    let options = TSEDOptions { size_penalty: true, ..Default::default() };

    let funcs1 = extract_functions("test1.ts", code1).unwrap();
    let funcs2 = extract_functions("test2.ts", code2).unwrap();

    assert!(!funcs1.is_empty(), "Should extract main function");
    assert!(!funcs2.is_empty(), "Should extract computeChildrenAlignment");

    let similarity = compare_functions(&funcs1[0], &funcs2[0], code1, code2, &options).unwrap();

    // These serve completely different purposes - CLI main vs algorithm implementation
    // Similarity should be much lower than 88.75%
    assert!(
        similarity < 0.40,
        "main vs computeChildrenAlignment similarity is {:.2}%, expected < 40%",
        similarity * 100.0
    );
}

#[test]
fn test_generic_traversal_patterns_should_not_match_everything() {
    // Case 3: Generic traversal pattern matching too many things
    let traversal_code = r#"
function traverse(node: any) {
    if (!node) return;
    
    if (Array.isArray(node)) {
        for (const item of node) {
            traverse(item);
        }
    } else if (typeof node === 'object') {
        for (const key in node) {
            traverse(node[key]);
        }
    }
}
"#;

    let specific_code = r#"
function calculateTotal(items: Item[]): number {
    let total = 0;
    
    for (const item of items) {
        if (item.price && item.quantity) {
            total += item.price * item.quantity;
        }
    }
    
    return total;
}
"#;

    let options = TSEDOptions { size_penalty: true, ..Default::default() };

    let funcs1 = extract_functions("test1.ts", traversal_code).unwrap();
    let funcs2 = extract_functions("test2.ts", specific_code).unwrap();

    assert!(!funcs1.is_empty() && !funcs2.is_empty());

    let similarity =
        compare_functions(&funcs1[0], &funcs2[0], traversal_code, specific_code, &options).unwrap();

    // Generic traversal vs specific calculation - should have low similarity
    assert!(
        similarity < 0.50,
        "Generic traverse vs calculateTotal similarity is {:.2}%, expected < 50%",
        similarity * 100.0
    );
}

#[test]
fn test_similar_structure_different_purpose() {
    // Case 4: Similar structure but different purpose
    let code1 = r#"
function findMax(numbers: number[]): number {
    let max = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] > max) {
            max = numbers[i];
        }
    }
    return max;
}
"#;

    let code2 = r#"
function countOccurrences(text: string, char: string): number {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === char) {
            count++;
        }
    }
    return count;
}
"#;

    let options = TSEDOptions { size_penalty: true, ..Default::default() };

    let funcs1 = extract_functions("test1.ts", code1).unwrap();
    let funcs2 = extract_functions("test2.ts", code2).unwrap();

    let similarity = compare_functions(&funcs1[0], &funcs2[0], code1, code2, &options).unwrap();

    // Similar loop structure but different data types and operations
    // Should have moderate similarity, not high
    assert!(
        similarity < 0.60,
        "findMax vs countOccurrences similarity is {:.2}%, expected < 60%",
        similarity * 100.0
    );
}
