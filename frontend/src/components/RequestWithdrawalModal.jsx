import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

const RequestWithdrawalModal = ({ show, onClose, onSubmit, balance = 0 }) => {
  const [formData, setFormData] = useState({
    amount: '',
    bankAccount: '',
    bankCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    const amount = parseFloat(formData.amount);

    if (!formData.amount || amount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (amount > balance) {
      setError(`Insufficient balance. Available: ${formatCurrency(balance, 'USD')}`);
      return false;
    }

    if (!formData.bankAccount || formData.bankAccount.trim().length === 0) {
      setError('Bank account is required');
      return false;
    }

    if (!formData.bankCode || formData.bankCode.trim().length === 0) {
      setError('Bank code is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit({
        amount: parseFloat(formData.amount),
        bank_account: formData.bankAccount,
        bank_code: formData.bankCode
      });

      // Reset form on success
      setFormData({
        amount: '',
        bankAccount: '',
        bankCode: ''
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-dark-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700 sticky top-0 bg-dark-900">
          <h2 className="text-xl font-bold text-dark-50">Request Withdrawal</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Balance Info */}
          <div className="mb-6 p-4 bg-dark-800 rounded-lg border border-dark-700">
            <p className="text-dark-400 text-sm mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-primary-500">
              {formatCurrency(balance, 'USD')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                disabled={loading}
                step="0.01"
                min="0"
                className="input w-full"
                required
              />
            </div>

            {/* Bank Account */}
            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">
                Bank Account <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bankAccount"
                placeholder="Account number"
                value={formData.bankAccount}
                onChange={handleChange}
                disabled={loading}
                className="input w-full"
                required
              />
            </div>

            {/* Bank Code */}
            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">
                Bank Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bankCode"
                placeholder="Bank code (e.g., SWIFT code)"
                value={formData.bankCode}
                onChange={handleChange}
                disabled={loading}
                className="input w-full"
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestWithdrawalModal;
