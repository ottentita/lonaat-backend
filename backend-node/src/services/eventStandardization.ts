// Define a standardized event schema and validation logic

export interface StandardizedEvent {
  event_type: string;
  network: string;
  product_id: string;
  transaction_id: string;
  commission: number;
  currency: string;
  timestamp: string;
}

export function validateEvent(event: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.event_type || typeof event.event_type !== 'string') {
    errors.push('Invalid or missing event_type');
  }
  if (!event.network || typeof event.network !== 'string') {
    errors.push('Invalid or missing network');
  }
  if (!event.product_id || typeof event.product_id !== 'string') {
    errors.push('Invalid or missing product_id');
  }
  if (!event.transaction_id || typeof event.transaction_id !== 'string') {
    errors.push('Invalid or missing transaction_id');
  }
  if (event.commission === undefined || typeof event.commission !== 'number') {
    errors.push('Invalid or missing commission');
  }
  if (!event.currency || typeof event.currency !== 'string') {
    errors.push('Invalid or missing currency');
  }
  if (!event.timestamp || typeof event.timestamp !== 'string') {
    errors.push('Invalid or missing timestamp');
  }

  return { valid: errors.length === 0, errors };
}