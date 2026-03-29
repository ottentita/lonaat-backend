# 💰 FRONTEND WITHDRAWAL SYSTEM INTEGRATION

## Overview

This guide provides complete frontend implementation examples for the withdrawal system. The backend API is ready - you just need to integrate these components into your frontend application.

---

## 📋 API ENDPOINTS AVAILABLE

### **User Endpoints:**
- `GET /api/wallet` - Get user wallet (balance, locked_balance)
- `POST /api/withdrawals` - Create withdrawal request
- `GET /api/withdrawals` - Get user's withdrawal history

### **Admin Endpoints:**
- `GET /api/admin/withdrawals` - Get all withdrawals (with status filter)
- `PATCH /api/admin/withdrawals/:id` - Approve/reject withdrawal
- `PATCH /api/admin/withdrawals/:id/pay` - Mark as paid

---

## 🔧 STEP 1: API SERVICE

Create a service file to handle all withdrawal-related API calls.

**File:** `services/withdrawalService.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

// Get auth token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Get user wallet
export const getWallet = async () => {
  const response = await axios.get(`${API_BASE_URL}/wallet`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  return response.data;
};

// Create withdrawal request
export const createWithdrawal = async (data: {
  amount: number;
  method: string;
  account_details: any;
}) => {
  const response = await axios.post(`${API_BASE_URL}/withdrawals`, data, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
};

// Get user's withdrawal history
export const getWithdrawalHistory = async (page = 1, limit = 20, status?: string) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(status && { status })
  });

  const response = await axios.get(`${API_BASE_URL}/withdrawals?${params}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  return response.data;
};
```

---

## 💳 STEP 2: WALLET BALANCE DISPLAY

Show available balance and locked balance.

**Component:** `components/WalletBalance.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { getWallet } from '../services/withdrawalService';

interface Wallet {
  balance: number;
  locked_balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  currency: string;
}

const WalletBalance: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const data = await getWallet();
      setWallet(data.wallet);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading wallet...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  if (!wallet) {
    return <div className="text-gray-500 py-4">No wallet found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">My Wallet</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Available Balance */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">
            Available Balance
          </div>
          <div className="text-3xl font-bold text-green-700">
            ${wallet.balance.toFixed(2)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            Ready to withdraw
          </div>
        </div>

        {/* Locked Balance */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-600 font-medium mb-1">
            Locked Balance
          </div>
          <div className="text-3xl font-bold text-yellow-700">
            ${wallet.locked_balance.toFixed(2)}
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            Pending withdrawals
          </div>
        </div>

        {/* Total Earned */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium mb-1">
            Total Earned
          </div>
          <div className="text-2xl font-bold text-blue-700">
            ${wallet.totalEarned.toFixed(2)}
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium mb-1">
            Total Withdrawn
          </div>
          <div className="text-2xl font-bold text-purple-700">
            ${wallet.totalWithdrawn.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletBalance;
```

---

## 📝 STEP 3: WITHDRAWAL FORM

Form to create withdrawal requests.

**Component:** `components/WithdrawalForm.tsx`

```typescript
import React, { useState } from 'react';
import { createWithdrawal } from '../services/withdrawalService';

interface WithdrawalFormProps {
  onSuccess?: () => void;
  availableBalance: number;
}

const WithdrawalForm: React.FC<WithdrawalFormProps> = ({ onSuccess, availableBalance }) => {
  const [formData, setFormData] = useState({
    amount: '',
    method: 'mobile_money',
    phone: '',
    network: '',
    accountNumber: '',
    bankName: '',
    accountName: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (amount > availableBalance) {
      setError(`Insufficient balance. Available: $${availableBalance.toFixed(2)}`);
      return;
    }

    // Prepare account details based on method
    let account_details: any = {};
    
    if (formData.method === 'mobile_money') {
      if (!formData.phone || !formData.network) {
        setError('Phone number and network are required for mobile money');
        return;
      }
      account_details = {
        phone: formData.phone,
        network: formData.network
      };
    } else if (formData.method === 'bank') {
      if (!formData.accountNumber || !formData.bankName || !formData.accountName) {
        setError('All bank details are required');
        return;
      }
      account_details = {
        account_number: formData.accountNumber,
        bank_name: formData.bankName,
        account_name: formData.accountName
      };
    }

    try {
      setLoading(true);
      await createWithdrawal({
        amount,
        method: formData.method,
        account_details
      });

      setSuccess(true);
      setFormData({
        amount: '',
        method: 'mobile_money',
        phone: '',
        network: '',
        accountNumber: '',
        bankName: '',
        accountName: ''
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Request Withdrawal</h2>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          ✅ Withdrawal request created successfully! Funds have been locked.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
            required
          />
          <div className="text-xs text-gray-500 mt-1">
            Available: ${availableBalance.toFixed(2)}
          </div>
        </div>

        {/* Method */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Withdrawal Method
          </label>
          <select
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="mobile_money">Mobile Money</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>

        {/* Mobile Money Fields */}
        {formData.method === 'mobile_money' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+237123456789"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network
              </label>
              <select
                value={formData.network}
                onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Network</option>
                <option value="MTN">MTN Mobile Money</option>
                <option value="Orange">Orange Money</option>
              </select>
            </div>
          </>
        )}

        {/* Bank Transfer Fields */}
        {formData.method === 'bank' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1234567890"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Example Bank"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>
          </>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Request Withdrawal'}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-600">
        <p>⚠️ Note: Funds will be locked immediately upon request.</p>
        <p>✅ Admin will review and process your withdrawal within 24-48 hours.</p>
      </div>
    </div>
  );
};

export default WithdrawalForm;
```

---

## 📊 STEP 4: WITHDRAWAL HISTORY

Display user's withdrawal history with status badges.

**Component:** `components/WithdrawalHistory.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { getWithdrawalHistory } from '../services/withdrawalService';

interface Withdrawal {
  id: number;
  amount: number;
  status: string;
  method: string;
  account_details: string;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

const WithdrawalHistory: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    fetchWithdrawals();
  }, [filter]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const data = await getWithdrawalHistory(1, 20, filter || undefined);
      setWithdrawals(data.withdrawals);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load withdrawal history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏳ Pending' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: '✅ Approved' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: '💰 Paid' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '❌ Rejected' }
    };

    const badge = badges[status] || badges.pending;
    return (
      <span className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-xs font-medium`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseAccountDetails = (details: string) => {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading withdrawal history...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Withdrawal History</h2>
        
        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {withdrawals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No withdrawals found</p>
          <p className="text-sm mt-2">Create your first withdrawal request above</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {withdrawals.map((withdrawal) => {
                const accountDetails = parseAccountDetails(withdrawal.account_details);
                return (
                  <tr key={withdrawal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      #{withdrawal.id}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900">
                      ${withdrawal.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <div>{withdrawal.method.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-400">
                        {accountDetails.phone || accountDetails.account_number || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(withdrawal.status)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(withdrawal.created_at)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {withdrawal.reference || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WithdrawalHistory;
```

---

## 🎯 STEP 5: USER DASHBOARD PAGE

Combine all components into a complete dashboard.

**Page:** `pages/Dashboard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import WalletBalance from '../components/WalletBalance';
import WithdrawalForm from '../components/WithdrawalForm';
import WithdrawalHistory from '../components/WithdrawalHistory';
import { getWallet } from '../services/withdrawalService';

const Dashboard: React.FC = () => {
  const [availableBalance, setAvailableBalance] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchBalance();
  }, [refreshKey]);

  const fetchBalance = async () => {
    try {
      const data = await getWallet();
      setAvailableBalance(data.wallet.balance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const handleWithdrawalSuccess = () => {
    // Refresh wallet and history
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          My Dashboard
        </h1>

        {/* Wallet Balance */}
        <div className="mb-8" key={`wallet-${refreshKey}`}>
          <WalletBalance />
        </div>

        {/* Withdrawal Form */}
        <div className="mb-8">
          <WithdrawalForm 
            availableBalance={availableBalance}
            onSuccess={handleWithdrawalSuccess}
          />
        </div>

        {/* Withdrawal History */}
        <div key={`history-${refreshKey}`}>
          <WithdrawalHistory />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Create `services/withdrawalService.ts`
- [ ] Create `components/WalletBalance.tsx`
- [ ] Create `components/WithdrawalForm.tsx`
- [ ] Create `components/WithdrawalHistory.tsx`
- [ ] Create `pages/Dashboard.tsx`
- [ ] Update API_BASE_URL to match your backend
- [ ] Install dependencies: `axios`, `react`, `react-dom`
- [ ] Add Tailwind CSS for styling (or adapt to your CSS framework)
- [ ] Test with real backend API

---

## 🎨 STYLING

The components use Tailwind CSS classes. If you're using a different CSS framework:

**Bootstrap:**
- Replace `bg-green-50` with `bg-success bg-opacity-10`
- Replace `rounded-lg` with `rounded`
- Replace `shadow-md` with `shadow`

**Material-UI:**
- Use `<Card>`, `<CardContent>`, `<TextField>`, `<Button>` components
- Replace className with `sx` prop

**Plain CSS:**
- Create custom CSS classes for each component
- Use the provided class names as reference

---

## 🔐 AUTHENTICATION

Make sure your auth token is stored in localStorage:

```typescript
// After login
localStorage.setItem('token', response.data.token);

// In API calls
const token = localStorage.getItem('token');
headers: { 'Authorization': `Bearer ${token}` }
```

---

## 📱 RESPONSIVE DESIGN

All components are mobile-responsive using Tailwind's responsive classes:
- `grid-cols-1 md:grid-cols-2` - 1 column on mobile, 2 on desktop
- `px-4 sm:px-6 lg:px-8` - Responsive padding
- `overflow-x-auto` - Horizontal scroll on small screens

---

## 🎯 COMPLETE FEATURES

✅ **Wallet Display:**
- Available balance
- Locked balance
- Total earned
- Total withdrawn

✅ **Withdrawal Form:**
- Amount input with validation
- Method selection (Mobile Money / Bank)
- Dynamic fields based on method
- Account details capture
- Real-time balance check
- Success/error messages

✅ **Withdrawal History:**
- List all withdrawals
- Status badges (pending, approved, paid, rejected)
- Filter by status
- Date formatting
- Account details display
- Reference tracking

**All components are production-ready with NO MOCK DATA!** 🚀
