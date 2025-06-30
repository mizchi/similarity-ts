// Test case 2: Similar algorithmic patterns

// Pattern 1: Array reduction
function sumValues(numbers) {
    let total = 0;
    for (let i = 0; i < numbers.length; i++) {
        total += numbers[i];
    }
    return total;
}

function calculateProduct(values) {
    let product = 1;
    for (let i = 0; i < values.length; i++) {
        product *= values[i];
    }
    return product;
}

// Pattern 2: Find maximum
function findMax(arr) {
    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}

function findMin(arr) {
    let min = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < min) {
            min = arr[i];
        }
    }
    return min;
}

// Pattern 3: Nested loops
function findDuplicates(items) {
    const duplicates = [];
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            if (items[i] === items[j]) {
                duplicates.push(items[i]);
            }
        }
    }
    return duplicates;
}

function findPairs(numbers, targetSum) {
    const pairs = [];
    for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
            if (numbers[i] + numbers[j] === targetSum) {
                pairs.push([numbers[i], numbers[j]]);
            }
        }
    }
    return pairs;
}