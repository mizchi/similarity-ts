use similarity_ts_core::AstFingerprint;

#[test]
fn test_ast_fingerprint_usage() {
    let code1 = r#"
        function processArray(arr) {
            const result = [];
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] > 0) {
                    result.push(arr[i] * 2);
                }
            }
            return result;
        }
    "#;

    let code2 = r#"
        function filterAndDouble(items) {
            const output = [];
            for (let j = 0; j < items.length; j++) {
                if (items[j] > 0) {
                    output.push(items[j] * 2);
                }
            }
            return output;
        }
    "#;

    let fp1 = AstFingerprint::from_source(code1).unwrap();
    let fp2 = AstFingerprint::from_source(code2).unwrap();

    // Print node counts for debugging
    println!("\nNode counts for function 1:");
    for (node_type, count) in fp1.node_counts() {
        if *count > 0 {
            println!("  {}: {}", node_type, count);
        }
    }

    // Test similarity
    let similarity = fp1.similarity(&fp2);
    println!("\nSimilarity: {:.2}%", similarity * 100.0);
    assert!(similarity > 0.9, "Expected high similarity for structurally identical functions");

    // Test bloom filter
    assert!(fp1.might_be_similar(&fp2, 0.5), "Bloom filter should pass for similar functions");

    // Test with different structure
    let code3 = r#"
        function processArray(arr) {
            return arr.filter(x => x > 0).map(x => x * 2);
        }
    "#;

    let fp3 = AstFingerprint::from_source(code3).unwrap();
    let similarity_different = fp1.similarity(&fp3);
    println!("Similarity with different implementation: {:.2}%", similarity_different * 100.0);
    assert!(similarity_different < 0.8, "Expected lower similarity for different implementations");
}
