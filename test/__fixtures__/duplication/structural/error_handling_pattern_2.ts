// Same error handling pattern refactored to remove duplication
// This demonstrates how the structural duplication can be eliminated

type ApiResult<T> = { data?: T; error?: string };

async function apiCall<T>(
  url: string,
  options?: RequestInit,
  errorContext?: string
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    const context = errorContext || 'API call';
    console.error(`Error in ${context}:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export const fetchUserData = (userId: string) => 
  apiCall(`/api/users/${userId}`, undefined, 'fetching user data');

export const fetchProductData = (productId: string) => 
  apiCall(`/api/products/${productId}`, undefined, 'fetching product data');

export const fetchOrderData = (orderId: string) => 
  apiCall(`/api/orders/${orderId}`, undefined, 'fetching order data');

export const postComment = (postId: string, comment: string) => 
  apiCall(
    `/api/posts/${postId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment })
    },
    'posting comment'
  );