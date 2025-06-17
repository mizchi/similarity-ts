// Copy-paste duplication: Error handling pattern repeated throughout codebase
// This shows typical copy-paste of try-catch blocks with slight modifications

export class FileService {
  async readUserData(userId: string): Promise<UserData | null> {
    try {
      const filePath = `./data/users/${userId}.json`;
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      console.log(`Successfully read user data for ${userId}`);
      return data;
    } catch (error) {
      console.error(`Failed to read user data for ${userId}:`, error);
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Error reading user data: ${error.message}`);
    }
  }

  async readProductData(productId: string): Promise<ProductData | null> {
    try {
      const filePath = `./data/products/${productId}.json`;
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      console.log(`Successfully read product data for ${productId}`);
      return data;
    } catch (error) {
      console.error(`Failed to read product data for ${productId}:`, error);
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Error reading product data: ${error.message}`);
    }
  }

  async readOrderData(orderId: string): Promise<OrderData | null> {
    try {
      const filePath = `./data/orders/${orderId}.json`;
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      console.log(`Successfully read order data for ${orderId}`);
      return data;
    } catch (error) {
      console.error(`Failed to read order data for ${orderId}:`, error);
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Error reading order data: ${error.message}`);
    }
  }

  async writeUserData(userId: string, data: UserData): Promise<void> {
    try {
      const filePath = `./data/users/${userId}.json`;
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`Successfully wrote user data for ${userId}`);
    } catch (error) {
      console.error(`Failed to write user data for ${userId}:`, error);
      throw new Error(`Error writing user data: ${error.message}`);
    }
  }

  async writeProductData(productId: string, data: ProductData): Promise<void> {
    try {
      const filePath = `./data/products/${productId}.json`;
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`Successfully wrote product data for ${productId}`);
    } catch (error) {
      console.error(`Failed to write product data for ${productId}:`, error);
      throw new Error(`Error writing product data: ${error.message}`);
    }
  }
}

// Mock fs for the example
const fs = {
  readFile: async (path: string, encoding: string) => '{}',
  writeFile: async (path: string, content: string, encoding: string) => {}
};

interface UserData {
  id: string;
  name: string;
  email: string;
}

interface ProductData {
  id: string;
  name: string;
  price: number;
}

interface OrderData {
  id: string;
  userId: string;
  items: any[];
}