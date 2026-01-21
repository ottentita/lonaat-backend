import { useState, useEffect } from 'react';
import { DollarSign, Calendar, CheckCircle, Clock, TrendingUp, Filter, ExternalLink, Banknote } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { commissionsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterNetwork, setFilterNetwork] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    paidByNetwork: 0,
  });

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const { data } = await commissionsAPI.getMy();
      setCommissions(data.commissions || []);
      
      const totalAmount = data.commissions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
      const pendingAmount = data.commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
      const paidAmount = data.commissions.filter(c => c.status === 'paid' || c.status === 'approved').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
      const paidByNetworkAmount = data.commissions.filter(c => c.status === 'paid_by_network').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
      
      setStats({
        total: totalAmount,
        pending: pendingAmount,
        paid: paidAmount,
        paidByNetwork: paidByNetworkAmount,
      });
    } catch (error) {
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommissions = commissions.filter(c => {
    if (filterNetwork !== 'all' && c.network !== filterNetwork) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const networks = [...new Set(commissions.map(c => c.network))].filter(Boolean);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-500/10 text-yellow-500',
      approved: 'bg-blue-500/10 text-blue-500',
      paid: 'bg-green-500/10 text-green-500',
      paid_by_network: 'bg-emerald-500/10 text-emerald-500',
      rejected: 'bg-red-500/10 text-red-500',
    };
    
    return badges[status] || badges.pending;
  };

  const getStatusIcon = (status) => {
    if (status === 'paid' || status === 'paid_by_network') return <CheckCircle className="w-4 h-4" />;
    if (status === 'approved') return <Banknote className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      paid: 'Paid',
      paid_by_network: 'Paid by Network',
      rejected: 'Rejected',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Commissions</h1>
          <p className="text-dark-400">Track your affiliate commissions from all networks - paid directly to your affiliate accounts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-dark-400 text-sm">Total Earnings</p>
              <TrendingUp className="w-5 h-5 text-primary-500" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(stats.total)}</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-dark-400 text-sm">Pending</p>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-yellow-500">{formatCurrency(stats.pending)}</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-dark-400 text-sm">Paid by Network</p>
              <ExternalLink className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-emerald-500">{formatCurrency(stats.paidByNetwork)}</p>
            <p className="text-xs text-dark-500 mt-1">Sent directly to your network account</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-dark-400 text-sm">Approved</p>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-500">{formatCurrency(stats.paid)}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold">Commission History</h2>
            <div className="flex gap-3">
              <select
                value={filterNetwork}
                onChange={(e) => setFilterNetwork(e.target.value)}
                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Networks</option>
                {networks.map(n => (
                  <option key={n} value={n} className="capitalize">{n}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="paid_by_network">Paid by Network</option>
              </select>
            </div>
          </div>
          
          {filteredCommissions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Commissions Yet</h3>
              <p className="text-dark-400 mb-4">
                Start importing products and sharing your affiliate links to earn commissions!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Network</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommissions.map((commission) => (
                    <tr key={commission.id} className="border-b border-dark-800 hover:bg-dark-800/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-dark-500" />
                          <span className="text-sm">{formatDate(commission.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium capitalize">{commission.network}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-bold text-primary-400">
                          {formatCurrency(commission.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(commission.status)}`}>
                          {getStatusIcon(commission.status)}
                          {getStatusLabel(commission.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-dark-500 font-mono">{commission.external_ref || 'N/A'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Commissions;
