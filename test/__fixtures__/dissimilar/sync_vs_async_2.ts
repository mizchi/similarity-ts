// Dissimilar: Asynchronous code with different purpose
async function fetchAndProcessData(url: string): Promise<ProcessedData> {
  try {
    const response = await fetch(url);
    const rawData = await response.json();
    
    const processed = await Promise.all(
      rawData.items.map(async (item: any) => {
        const details = await fetchDetails(item.id);
        return { ...item, details };
      })
    );
    
    return {
      timestamp: Date.now(),
      data: processed,
      status: 'success'
    };
  } catch (error) {
    console.error('Processing failed:', error);
    throw new Error('Failed to process data');
  }
}

async function fetchDetails(id: string): Promise<any> {
  const response = await fetch(`/api/details/${id}`);
  return response.json();
}