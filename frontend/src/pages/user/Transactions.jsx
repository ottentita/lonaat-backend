import { useState, useEffect, useMemo } from 'react';
import { walletAPI } from '@/services/api';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Loader2,
  Calendar,
  DollarSign,
  Hash,
  Download
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import TransactionPagination from '@/components/TransactionPagination';
import { exportTransactionsToCSV } from '@/utils/csvExport';

const Transactions = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ type: 'all', dateFrom: '', dateTo: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters, transactions]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await walletAPI.getTransactions();
      setTransactions(res.data.transactions || []);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...transactions];
    if (filters.type !== 'all') {
      result = result.filter(t => t.type === filters.type);
    }
    if (filters.dateFrom) {
      result = result.filter(t => new Date(t.created_at) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      result = result.filter(t => new Date(t.created_at) <= new Date(filters.dateTo));
    }
    setFiltered(result);
  };

  const getTypeIcon = type => {
    return type === 'debit' || type === 'withdrawal' ? ArrowUpRight : ArrowDownLeft;
  };

  const getTypeColor = type => {
    return type === 'debit' || type === 'withdrawal' ? 'text-red-500' : 'text-green-500';
  };

  // Calculate paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, currentPage, itemsPerPage]);

  // Handle CSV export
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    try {
      exportTransactionsToCSV(filtered, `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Transactions exported successfully');
    } catch (err) {
      toast.error('Failed to export transactions');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const totalIncome = filtered
    .filter(t => t.type === 'credit' || t.type === 'deposit')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpense = filtered
    .filter(t => t.type === 'debit' || t.type === 'withdrawal')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-dark-50">Transactions</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm mb-1">Total Income</p>
              <h3 className="text-2xl font-bold text-green-500">
                {formatCurrency(totalIncome, 'USD')}
              </h3>
            </div>
            <ArrowDownLeft className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm mb-1">Total Expense</p>
              <h3 className="text-2xl font-bold text-red-500">
                {formatCurrency(totalExpense, 'USD')}
              </h3>
            </div>
            <ArrowUpRight className="w-10 h-10 text-red-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-dark-50">Filters</h2>
          </div>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-dark-900 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-dark-300 text-sm mb-2">Type</label>
            <select
              className="input"
              value={filters.type}
              onChange={e => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
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

      {/* Transactions List */}
      {filtered.length > 0 ? (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Reference</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map(transaction => {
                  const TypeIcon = getTypeIcon(transaction.type);
                  const typeColor = getTypeColor(transaction.type);
                  return (
                    <tr key={transaction.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-dark-300 text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(transaction.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-dark-50">{transaction.description || transaction.type}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-dark-500" />
                          <span className="text-dark-300 text-sm font-mono">
                            {transaction.reference || transaction.id}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TypeIcon className={`w-4 h-4 ${typeColor}`} />
                          <span className={`font-semibold ${typeColor}`}>
                            {transaction.type === 'debit' || transaction.type === 'withdrawal' ? '-' : '+'}
                            {formatCurrency(transaction.amount, transaction.currency || 'USD')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-dark-800 text-sm text-dark-400">
            <p>Showing {paginatedItems.length} of {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          
          {/* Pagination */}
          {filtered.length > itemsPerPage && (
            <TransactionPagination
              itemCount={filtered.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <DollarSign className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-dark-50 mb-2">No transactions found</h3>
          <p className="text-dark-400">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
};

export default Transactions;
