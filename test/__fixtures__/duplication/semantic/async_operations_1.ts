// Async operation patterns with Promise handling
// Different approaches to the same async pattern

export class DataFetcher {
  async fetchData(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }
  
  async fetchWithRetry(url: string, maxRetries: number = 3): Promise<any> {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.fetchData(url);
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    throw lastError;
  }
}