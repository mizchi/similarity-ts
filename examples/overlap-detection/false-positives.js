// Test case 4: Patterns that might cause false positives

// Very short similar patterns
function isPositive(n) {
    return n > 0;
}

function isNegative(n) {
    return n < 0;
}

function isZero(n) {
    return n === 0;
}

// Common boilerplate patterns
function fetchUserData(userId) {
    try {
        const user = database.get(userId);
        return { success: true, data: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function fetchProductData(productId) {
    try {
        const product = database.get(productId);
        return { success: true, data: product };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Different algorithms with similar structure
function bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}

function selectionSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        let minIdx = i;
        for (let j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
    return arr;
}