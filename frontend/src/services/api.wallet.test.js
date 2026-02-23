import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walletAPI, api } from './api';

describe('walletAPI balance normalization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getBalance() coerces wallet.balance to Number and sets top-level balance', async () => {
    const mockResp = { data: { wallet: { credits: 0, balance: '123.45', total_purchased: 0, total_spent: 0 } } };
    vi.spyOn(api, 'get').mockResolvedValueOnce(mockResp);

    const resp = await walletAPI.getBalance();

    // wallet.balance should be a Number and equal to parsed value
    expect(typeof resp.data.wallet.balance).toBe('number');
    expect(resp.data.wallet.balance).toBeCloseTo(123.45);

    // top-level `balance` should also exist for getBalance()
    expect(typeof resp.data.balance).toBe('number');
    expect(resp.data.balance).toBeCloseTo(123.45);
  });

  it('getSummary() coerces wallet.balance to Number (no top-level balance)', async () => {
    const mockResp = { data: { wallet: { credits: 0, balance: '200', total_purchased: 0, total_spent: 0 } } };
    vi.spyOn(api, 'get').mockResolvedValueOnce(mockResp);

    const resp = await walletAPI.getSummary();

    expect(typeof resp.data.wallet.balance).toBe('number');
    expect(resp.data.wallet.balance).toBe(200);

    // getSummary() should not add a top-level `balance`
    expect(resp.data.balance).toBeUndefined();
  });
});