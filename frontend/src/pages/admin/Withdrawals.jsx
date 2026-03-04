import { useState, useEffect } from 'react';
import { walletAPI } from '@/services/api';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Filter,
  Loader2,
  Calendar,
  DollarSign,
  User,
  Check,
  X
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

const AdminWithdrawals = () => {
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', dateFrom: '', dateTo: '' });
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, withdrawals]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await walletAPI.getWithdrawals();
      setWithdrawals(res.data.withdrawals || []);
    } catch (err) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...withdrawals];
    if (filters.status !== 'all') {
      result = result.filter(w => w.status === filters.status);
    }
    if (filters.dateFrom) {
      result = result.filter(w => new Date(w.created_at) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      result = result.filter(w => new Date(w.created_at) <= new Date(filters.dateTo));
    }
    setFiltered(result);
  };

  const handleApprove = async (withdrawalId) => {
    try {
      setProcessing(prev => ({ ...prev, [withdrawalId]: 'approving' }));
      await walletAPI.approveWithdrawal(withdrawalId);
      toast.success('Withdrawal approved');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve withdrawal');
    } finally {
      setProcessing(prev => ({ ...prev, [withdrawalId]: null }));
    }
  };

  const handleReject = async (withdrawalId) => {
    try {
      setProcessing(prev => ({ ...prev, [withdrawalId]: 'rejecting' }));
      await walletAPI.rejectWithdrawal(withdrawalId);
      toast.success('Withdrawal rejected');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject withdrawal');
    } finally {
      setProcessing(prev => ({ ...prev, [withdrawalId]: null }));
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

  const totalAmount = filtered.reduce((sum, w) => sum + (w.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-dark-50">Withdrawal Requests</h1>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-dark-50">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-dark-300 text-sm mb-2">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-dark-300 text-sm mb-2">From Date</label>
            <input
              type="date"
              className="input"
              value={filters.dateFrom}
              onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-dark-300 text-sm mb-2">To Date</label>
            <input
              type="date"
              className="input"
              value={filters.dateTo}
              onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">User</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Bank Account</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Amount</th>
                  <th className="text-center py-3 px-4 text-dark-400 font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-dark-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(withdrawal => {
                  const StatusIcon = getStatusIcon(withdrawal.status);
                  return (
                    <tr key={withdrawal.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-dark-300 text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(withdrawal.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-dark-500" />
                          <span className="text-dark-50">{withdrawal.user_name || 'User'}</span>
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
                      <td className="py-4 px-4 text-center">
                        {withdrawal.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(withdrawal.id)}
                              disabled={processing[withdrawal.id]}
                              className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Approve withdrawal"
                              aria-label="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(withdrawal.id)}
                              disabled={processing[withdrawal.id]}
                              className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Reject withdrawal"
                              aria-label="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-dark-500 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6 pt-4 border-t border-dark-800 flex justify-between items-center">
            <div className="text-sm text-dark-400">
              Showing {filtered.length} withdrawal{filtered.length !== 1 ? 's' : ''}
            </div>
            <div className="card px-4 py-2 bg-dark-800">
              <span className="text-dark-400 text-sm mr-2">Total:</span>
              <span className="text-red-500 font-bold text-lg">{formatCurrency(totalAmount, 'USD')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <DollarSign className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-dark-50 mb-2">No withdrawals found</h3>
          <p className="text-dark-400">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;
