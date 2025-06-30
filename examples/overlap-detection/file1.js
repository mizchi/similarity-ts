// File 1: Contains functions with overlapping patterns

function processItems(items) {
    const results = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].active) {
            results.push(items[i].value * 2);
        }
    }
    return results;
}