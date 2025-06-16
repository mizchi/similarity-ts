// Dissimilar: Functional style
type Product = {
  id: string;
  name: string;
  price: number;
};

type Order = {
  products: Product[];
  discount: number;
};

const createOrder = (products: Product[] = [], discount = 0): Order => ({
  products,
  discount: Math.min(Math.max(discount, 0), 100)
});

const addProduct = (order: Order, product: Product): Order => ({
  ...order,
  products: [...order.products, product]
});

const removeProduct = (order: Order, productId: string): Order => ({
  ...order,
  products: order.products.filter(p => p.id !== productId)
});

const calculateOrderTotal = (order: Order): number => {
  const subtotal = order.products.reduce((sum, product) => sum + product.price, 0);
  return subtotal * (1 - order.discount / 100);
};

const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduce((acc, fn) => fn(acc), value);