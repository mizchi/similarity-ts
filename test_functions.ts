// Test file with similar functions

function calculateTotal(items: Item[]): number {
    let total = 0;
    for (const item of items) {
        total += item.price * item.quantity;
    }
    return total;
}

function computeSum(products: Product[]): number {
    let sum = 0;
    for (const product of products) {
        sum += product.cost * product.amount;
    }
    return sum;
}

// Different function
function findMaxPrice(items: Item[]): number {
    return Math.max(...items.map(item => item.price));
}

// Another similar function with different implementation
const getTotalPrice = (items: Item[]) => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
};

class OrderService {
    calculateOrderTotal(order: Order): number {
        let total = 0;
        for (const item of order.items) {
            total += item.price * item.quantity;
        }
        return total;
    }
    
    applyDiscount(total: number, discount: number): number {
        return total * (1 - discount);
    }
}