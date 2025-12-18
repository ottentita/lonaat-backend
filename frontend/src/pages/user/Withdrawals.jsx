import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { withdrawalAPI, walletAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Wallet, 
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  Loader2
} from 'lucide-react';

const Withdrawals = () => {
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [balance, setBalance] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    method: 'bank_transfer',
    account_details: {
      account_number: '',
      account_name: '',
      bank_name: ''
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [withdrawalsRes, walletRes] = await Promise.all([
        withdrawalAPI.getMy(),
        walletAPI.getBalance()
      ]);
      setWithdrawals(withdrawalsRes.data.withdrawals || []);
      setBalance(walletRes.data.balance || 0);
    } catch (error) {
      
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (parseFloat(formData.amount) > balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (parseFloat(formData.amount) < 10) {
      toast.error('Minimum withdrawal amount is $10');
      return;
    }

    try {
      await withdrawalAPI.create(formData);
      toast.success('Withdrawal request submitted successfully');
      setShowRequestModal(false);
      setFormData({
        amount: '',
        method: 'bank_transfer',
        account_details: {
          account_number: '',
          account_name: '',
          bank_name: ''
        }
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit withdrawal request');
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      completed: CheckCircle
    };
    return icons[status] || Clock;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-500 bg-yellow-500/10',
      approved: 'text-blue-500 bg-blue-500/10',
      rejected: 'text-red-500 bg-red-500/10',
      completed: 'text-green-500 bg-green-500/10'
    };
    return colors[status] || 'text-dark-400 bg-dark-800';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark-50">Withdrawals</h1>
            <p className="text-dark-400 mt-1">Manage your withdrawal requests</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="card px-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-green-500" />
                <span className="text-dark-400">Available:</span>
                <span className="text-dark-50 font-semibold">${balance.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => setShowRequestModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Request Withdrawal
            </button>
          </div>
        </div>

        {withdrawals.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {withdrawals.map((withdrawal) => {
              const StatusIcon = getStatusIcon(withdrawal.status);
              return (
                <div key={withdrawal.id} className="card-hover">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${getStatusColor(withdrawal.status)}`}>
                        <StatusIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-dark-50">
                            ${withdrawal.amount.toLocaleString()}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                            {withdrawal.status}
                          </span>
                        </div>
                        <p className="text-dark-400 text-sm mt-1">
                          {withdrawal.method.replace('_', ' ')} • {new Date(withdrawal.created_at).toLocaleDateString()}
                        </p>
                        {withdrawal.status === 'rejected' && withdrawal.admin_notes && (
                          <p className="text-red-400 text-sm mt-2">
                            Reason: {withdrawal.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    {withdrawal.status === 'completed' && withdrawal.processed_at && (
                      <div className="text-right text-sm text-dark-400">
                        <p>Processed on</p>
                        <p className="text-green-500 font-medium">
                          {new Date(withdrawal.processed_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <ArrowUpCircle className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark-50 mb-2">No withdrawals yet</h3>
            <p className="text-dark-400 mb-6">Request your first withdrawal to cash out your earnings</p>
            <button onClick={() => setShowRequestModal(true)} className="btn-primary">
              <Plus className="w-5 h-5 inline mr-2" />
              Request Withdrawal
            </button>
          </div>
        )}

        {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <h2 className="text-xl font-bold text-dark-50 mb-6">Request Withdrawal</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Amount</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    min="10"
                    max={balance}
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Available balance: ${balance.toLocaleString()} • Min: $10
                  </p>
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Withdrawal Method</label>
                  <select
                    className="input"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    required
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>

                {formData.method === 'bank_transfer' && (
                  <>
                    <div>
                      <label className="block text-dark-300 text-sm mb-2">Account Number</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="0123456789"
                        value={formData.account_details.account_number}
                        onChange={(e) => setFormData({
                          ...formData,
                          account_details: { ...formData.account_details, account_number: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-dark-300 text-sm mb-2">Account Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="John Doe"
                        value={formData.account_details.account_name}
                        onChange={(e) => setFormData({
                          ...formData,
                          account_details: { ...formData.account_details, account_name: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-dark-300 text-sm mb-2">Bank Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="First Bank"
                        value={formData.account_details.bank_name}
                        onChange={(e) => setFormData({
                          ...formData,
                          account_details: { ...formData.account_details, bank_name: e.target.value }
                        })}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    Submit Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Withdrawals;
