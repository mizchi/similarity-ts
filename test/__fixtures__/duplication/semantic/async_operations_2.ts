// Same async operations using functional approach
// Shows semantic equivalence with different structure

export const fetchData = (url: string): Promise<any> => 
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error('Fetch error:', error);
      throw error;
    });

export const fetchWithRetry = async (
  url: string, 
  maxRetries: number = 3
): Promise<any> => {
  const attempt = async (retriesLeft: number): Promise<any> => {
    try {
      return await fetchData(url);
    } catch (error) {
      if (retriesLeft === 0) throw error;
      
      await new Promise(resolve => 
        setTimeout(resolve, 1000 * (maxRetries - retriesLeft + 1))
      );
      
      return attempt(retriesLeft - 1);
    }
  };
  
  return attempt(maxRetries - 1);
};