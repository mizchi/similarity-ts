// JavaScript utility functions

function processData(data) {
    const result = [];
    for (const item of data) {
        if (item > 0) {
            result.push(item * 2);
        }
    }
    return result;
}

function transformData(data) {
    const output = [];
    for (const element of data) {
        if (element > 0) {
            output.push(element * 2);
        }
    }
    return output;
}

export class DataProcessor {
    constructor() {
        this.cache = {};
    }
    
    process(data) {
        const result = [];
        for (const item of data) {
            if (item > 0) {
                result.push(item * 2);
            }
        }
        return result;
    }
}