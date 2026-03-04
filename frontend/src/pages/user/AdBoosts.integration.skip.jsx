/** @vitest-environment jsdom */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReactDOM from 'react-dom/client';

// Render the real component but stub networked layout and API calls
vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>
}));

import AdBoosts from './AdBoosts';
import { api } from '../../services/api';

describe('AdBoosts integration — formatted balance', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows formatted USD balance when wallet API returns a string balance', async () => {
    // Mock API responses used by AdBoosts.fetchData()
    vi.spyOn(api, 'get').mockImplementation((path) => {
      if (path === '/ads/status') return Promise.resolve({ data: { campaigns: [] } });
      if (path === '/products') return Promise.resolve({ data: { products: [] } });
      if (path === '/wallet') {
        // simulate Prisma Decimal serialized as string
        return Promise.resolve({ data: { wallet: { credits: 0, balance: '1234.56' } } });
      }
      return Promise.resolve({ data: {} });
    });

    // mount component using ReactDOM (avoids adding @testing-library/react)
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    root.render(<AdBoosts />);

    // wait until the formatted USD amount appears in the DOM
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout waiting for balance')), 2000);
      const iv = setInterval(() => {
        if (container.textContent.includes('$1,234.56')) {
          clearTimeout(timeout);
          clearInterval(iv);
          resolve(undefined);
        }
      }, 50);
    });

    expect(container.textContent).toContain('$1,234.56');

    root.unmount();
    container.remove();
  });
});