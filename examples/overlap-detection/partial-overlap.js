// Test case 3: Partial overlaps within larger functions

function complexDataProcessor(data) {
    // Validation phase
    if (!data || !Array.isArray(data)) {
        throw new Error('Invalid input');
    }
    
    const results = {
        processed: [],
        errors: [],
        stats: {
            total: 0,
            success: 0,
            failed: 0
        }
    };
    
    // Processing phase - similar to other functions
    for (let i = 0; i < data.length; i++) {
        try {
            if (data[i].value > 0) {
                results.processed.push({
                    id: data[i].id,
                    value: data[i].value * 2,
                    timestamp: new Date()
                });
                results.stats.success++;
            }
        } catch (error) {
            results.errors.push({
                index: i,
                error: error.message
            });
            results.stats.failed++;
        }
        results.stats.total++;
    }
    
    // Summary phase
    console.log(`Processed ${results.stats.total} items`);
    return results;
}

function simpleProcessor(items) {
    const output = [];
    // This loop is similar to part of complexDataProcessor
    for (let i = 0; i < items.length; i++) {
        if (items[i].value > 0) {
            output.push({
                id: items[i].id,
                value: items[i].value * 2,
                timestamp: new Date()
            });
        }
    }
    return output;
}

function batchProcessor(batches) {
    const allResults = [];
    
    for (let batch of batches) {
        const batchResults = [];
        // Inner loop similar to simpleProcessor
        for (let i = 0; i < batch.length; i++) {
            if (batch[i].value > 0) {
                batchResults.push({
                    id: batch[i].id,
                    value: batch[i].value * 2,
                    timestamp: new Date()
                });
            }
        }
        allResults.push(batchResults);
    }
    
    return allResults;
}