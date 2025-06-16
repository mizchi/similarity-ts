// Dissimilar: Imperative style
class ShoppingCart {
  private items: CartItem[] = [];
  private discount: number = 0;

  addItem(item: CartItem): void {
    const existing = this.items.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      this.items.push({ ...item });
    }
  }

  removeItem(id: string): void {
    const index = this.items.findIndex(i => i.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  setDiscount(percent: number): void {
    this.discount = Math.min(Math.max(percent, 0), 100);
  }

  calculateTotal(): number {
    let total = 0;
    for (const item of this.items) {
      total += item.price * item.quantity;
    }
    return total * (1 - this.discount / 100);
  }
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}