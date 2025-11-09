import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { walletAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  DollarSign, 
  ArrowUpCircle,
  ArrowDownCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar
} from 'lucide-react';

const Transactions = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await walletAPI.getTransactions();
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(t => new Date(t.created_at) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(t => new Date(t.created_at) <= new Date(filters.dateTo));
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const getTypeIcon = (type) => {
    return type === 'credit' || type === 'deposit' ? ArrowDownCircle : ArrowUpCircle;
  };

  const getTypeColor = (type) => {
    return type === 'credit' || type === 'deposit' 
      ? 'text-green-500 bg-green-500/10' 
      : 'text-red-500 bg-red-500/10';
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'text-green-500 bg-green-500/10',
      pending: 'text-yellow-500 bg-yellow-500/10',
      failed: 'text-red-500 bg-red-500/10'
    };
    return colors[status] || 'text-dark-400 bg-dark-800';
  };

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div>
          <h1 className="text-3xl font-bold text-dark-50">Transactions</h1>
          <p className="text-dark-400 mt-1">View your transaction history</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-dark-50">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-dark-300 text-sm mb-2">Type</label>
              <select
                className="input"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="all">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>
            <div>
              <label className="block text-dark-300 text-sm mb-2">Status</label>
              <select
                className="input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-dark-300 text-sm mb-2">To Date</label>
              <input
                type="date"
                className="input"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="card">
          {paginatedTransactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-800">
                      <th className="text-left py-3 px-4 text-dark-400 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-dark-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-dark-400 font-medium">Description</th>
                      <th className="text-right py-3 px-4 text-dark-400 font-medium">Amount</th>
                      <th className="text-center py-3 px-4 text-dark-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((transaction) => {
                      const TypeIcon = getTypeIcon(transaction.type);
                      return (
                        <tr key={transaction.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 text-dark-300 text-sm">
                              <Calendar className="w-4 h-4" />
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getTypeColor(transaction.type)}`}>
                              <TypeIcon className="w-4 h-4" />
                              <span className="text-sm font-medium capitalize">{transaction.type}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-dark-50">
                            {transaction.description || 'No description'}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`font-semibold ${
                              transaction.type === 'credit' || transaction.type === 'deposit' 
                                ? 'text-green-500' 
                                : 'text-red-500'
                            }`}>
                              {transaction.type === 'credit' || transaction.type === 'deposit' ? '+' : '-'}
                              ₦{transaction.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-800">
                  <div className="text-sm text-dark-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-dark-300 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark-50 mb-2">No transactions found</h3>
              <p className="text-dark-400">Your transaction history will appear here</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
