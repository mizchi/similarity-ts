// Dissimilar: Function implementation
function processData(data: string[]): string {
  return data.filter(item => item.length > 0).join(', ');
}