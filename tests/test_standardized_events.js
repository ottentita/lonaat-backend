import request from 'supertest';
import app from '../src/app';
import { validateEvent } from '../src/services/eventStandardization';

describe('Standardized Event Tests', () => {
  it('should validate a correct Digistore24 event', async () => {
    const event = {
      event_type: 'on_payment',
      network: 'Digistore24',
      product_id: '12345',
      transaction_id: 'abc123',
      commission: 50.0,
      currency: 'USD',
      timestamp: new Date().toISOString(),
    };

    const validation = validateEvent(event);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should reject an event with missing fields', async () => {
    const event = {
      event_type: 'on_payment',
      network: 'Digistore24',
      product_id: '12345',
      // Missing transaction_id
      commission: 50.0,
      currency: 'USD',
      timestamp: new Date().toISOString(),
    };

    const validation = validateEvent(event);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Invalid or missing transaction_id');
  });

  it('should process a valid webhook event', async () => {
    const response = await request(app)
      .post('/webhooks/digistore24')
      .send({
        event: 'on_payment',
        data: {
          product_id: '12345',
          order_id: 'abc123',
          commission: '50.0',
          currency: 'USD',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});