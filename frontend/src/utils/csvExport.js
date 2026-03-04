/**
 * Exports an array of objects to CSV format and triggers download
 * @param {Array} data - Array of objects to export
 * @param {String} filename - Name of the CSV file to download
 * @param {Array} columns - Optional: Column names to include (defaults to all object keys)
 */
export const exportToCSV = (data, filename = 'export.csv', columns = null) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Determine which columns to include
  const cols = columns || Object.keys(data[0]);
  
  // Build CSV header
  const header = cols.map(col => `"${col}"`).join(',');
  
  // Build CSV rows
  const rows = data.map(row => {
    return cols.map(col => {
      const value = row[col];
      
      // Handle different data types
      if (value === null || value === undefined) {
        return '';
      }
      
      if (typeof value === 'object') {
        return `"${JSON.stringify(value)}"`;
      }
      
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  // Combine header and rows
  const csv = [header, ...rows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  URL.revokeObjectURL(url);
};

/**
 * Exports transaction data with formatted dates and currency
 * @param {Array} transactions - Array of transaction objects
 * @param {String} filename - Name of the CSV file
 */
export const exportTransactionsToCSV = (transactions, filename = 'transactions.csv') => {
  const formattedData = transactions.map(transaction => ({
    Date: new Date(transaction.created_at).toLocaleString(),
    Type: transaction.type,
    Description: transaction.description || transaction.type,
    Reference: transaction.reference || transaction.id,
    Amount: transaction.amount,
    Currency: transaction.currency || 'USD',
  }));
  
  const columns = ['Date', 'Type', 'Description', 'Reference', 'Amount', 'Currency'];
  exportToCSV(formattedData, filename, columns);
};
