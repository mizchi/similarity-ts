// Example of exact duplication: CustomerService
// This is copied from UserService with just name changes - a typical copy-paste scenario
export class CustomerService {
  private customers: Map<string, Customer> = new Map();
  
  addCustomer(customer: Customer): void {
    if (!customer.id) {
      throw new Error('Customer must have an ID');
    }
    if (this.customers.has(customer.id)) {
      throw new Error('Customer already exists');
    }
    this.customers.set(customer.id, customer);
  }
  
  getCustomer(id: string): Customer | undefined {
    return this.customers.get(id);
  }
  
  updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const customer = this.customers.get(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    const updatedCustomer = { ...customer, ...updates };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
  
  deleteCustomer(id: string): boolean {
    return this.customers.delete(id);
  }
  
  getAllCustomers(): Customer[] {
    return Array.from(this.customers.values());
  }
}

interface Customer {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}