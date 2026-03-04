import { useState, useEffect } from 'react';
import { walletAPI } from '@/services/api';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Loader2,
  Calendar,
  DollarSign,
  Plus
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import RequestWithdrawalModal from '@/components/RequestWithdrawalModal';

const Withdrawals = () => {
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const [withdrawalsRes, walletRes] = await Promise.all([
        walletAPI.getMyWithdrawals(),
        walletAPI.getWallet()
      ]);
      setWithdrawals(withdrawalsRes.data.withdrawals || []);
      setBalance(walletRes.data.balance || 0);
    } catch (err) {
      toast.error('Failed to load withdrawal data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (withdrawalData) => {
    try {
      setSubmitting(true);
      await walletAPI.requestWithdrawal(withdrawalData);
      toast.success('Withdrawal request submitted successfully');
      setShowModal(false);
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit withdrawal request');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = status => {
    const icons = { completed: CheckCircle, pending: Clock, failed: XCircle };
    return icons[status] || Clock;
  };

  const getStatusColor = status => {
    const colors = {
      completed: 'text-green-500 bg-green-500/10',
      pending: 'text-yellow-500 bg-yellow-500/10',
      failed: 'text-red-500 bg-red-500/10'
    };
    return colors[status] || 'text-dark-400 bg-dark-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-dark-50">My Withdrawals</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Request Withdrawal
        </button>
      </div>

      {/* Request Withdrawal Modal */}
      <RequestWithdrawalModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        balance={balance}
      />

      {withdrawals.length > 0 ? (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Bank Account</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Amount</th>
                  <th className="text-center py-3 px-4 text-dark-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(withdrawal => {
                  const StatusIcon = getStatusIcon(withdrawal.status);
                  return (
                    <tr key={withdrawal.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-dark-300 text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(withdrawal.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-dark-300 text-sm">
                        {withdrawal.bank_account || 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                          <span className="text-red-500 font-semibold">
                            {formatCurrency(withdrawal.amount, withdrawal.currency || 'USD')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(withdrawal.status)}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{withdrawal.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <DollarSign className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-dark-50 mb-2">No withdrawals yet</h3>
          <p className="text-dark-400">Start by requesting a withdrawal above</p>
        </div>
      )}
    </div>
  );
};

export default Withdrawals;
