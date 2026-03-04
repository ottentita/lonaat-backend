import { useState, useEffect } from 'react';
import { walletAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/currency';
import { 
  DollarSign, 
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Hash,
  User,
  TrendingUp,
  Loader2
} from 'lucide-react';

const AdminPayments = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', dateFrom: '', dateTo: '' });

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, payments]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await walletAPI.getTransactions();
      const all = res.data.transactions || [];
      const paymentTx = all.filter(t => t.type === 'deposit' || t.type === 'credit');
      setPayments(paymentTx);
    } catch (err) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...payments];
    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(p => new Date(p.created_at) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filtered = filtered.filter(p => new Date(p.created_at) <= new Date(filters.dateTo));
    }
    setFilteredPayments(filtered);
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

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

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
        <h1 className="text-3xl font-bold text-dark-50">Payments</h1>
      </div>
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
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
      {filteredPayments.length > 0 ? (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">User</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Reference</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Amount</th>
                  <th className="text-center py-3 px-4 text-dark-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(payment => {
                  const StatusIcon = getStatusIcon(payment.status);
                  return (
                    <tr key={payment.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-dark-300 text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(payment.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-dark-500" />
                          <div>
                            <p className="text-dark-50">{payment.user_name || 'User'}</p>
                            <p className="text-dark-400 text-xs">ID: {payment.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-dark-500" />
                          <span className="text-dark-300 text-sm font-mono">
                            {payment.reference || payment.flutterwave_ref || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-green-500 font-semibold text-lg">
                            {formatCurrency(payment.amount, payment.currency || 'USD')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(payment.status)}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{payment.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6 pt-4 border-t border-dark-800 flex justify-between items-center">
            <div className="text-sm text-dark-400">
              Showing {filteredPayments.length} transaction{filteredPayments.length !== 1 ? 's' : ''}
            </div>
            <div className="card px-4 py-2 bg-dark-800">
              <span className="text-dark-400 text-sm mr-2">Total:</span>
              <span className="text-green-500 font-bold text-lg">{formatCurrency(totalAmount, 'USD')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <DollarSign className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-dark-50 mb-2">No payments found</h3>
          <p className="text-dark-400">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
