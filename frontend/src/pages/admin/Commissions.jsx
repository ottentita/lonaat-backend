import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle,
  TrendingUp,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X,
  CreditCard,
  Users,
  RefreshCw
} from 'lucide-react';
import { commissionsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AdminCommissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    pendingCount: 0,
    totalCount: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    network: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 1
  });
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchCommissions();
  }, [filters.status, filters.network, filters.startDate, filters.endDate, pagination.page]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.perPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.network && { network: filters.network }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
        ...(filters.search && { search: filters.search })
      };
      
      const { data } = await commissionsAPI.getAll(params);
      setCommissions(data.commissions || []);
      
      if (data.summary) {
        setStats({
          total: data.summary.total_amount || 0,
          pending: data.summary.pending_amount || 0,
          approved: data.summary.approved_amount || 0,
          paid: data.summary.paid_amount || 0,
          rejected: data.summary.rejected_amount || 0,
          pendingCount: data.summary.pending_count || 0,
          totalCount: data.summary.total_count || 0
        });
      }
      
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total || 0,
          totalPages: data.pagination.pages || 1
        }));
      }
    } catch (error) {
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await commissionsAPI.approve(id);
      toast.success('Commission approved successfully');
      fetchCommissions();
    } catch (error) {
      toast.error('Failed to approve commission');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedCommission) return;
    
    try {
      setActionLoading(selectedCommission.id);
      await commissionsAPI.reject(selectedCommission.id, { reason: rejectReason });
      toast.success('Commission rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedCommission(null);
      fetchCommissions();
    } catch (error) {
      toast.error('Failed to reject commission');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      setActionLoading(id);
      await commissionsAPI.markPaid(id);
      toast.success('Commission marked as paid');
      fetchCommissions();
    } catch (error) {
      toast.error('Failed to mark commission as paid');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (commission) => {
    setSelectedCommission(commission);
    setShowRejectModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-500/10 text-yellow-500',
      approved: 'bg-blue-500/10 text-blue-500',
      paid: 'bg-green-500/10 text-green-500',
      rejected: 'bg-red-500/10 text-red-500',
    };
    return badges[status] || badges.pending;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'approved': return <Check className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCommissions();
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      network: '',
      search: '',
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Commission Tracking</h1>
          <p className="text-dark-400">Manage and track all affiliate commissions</p>
        </div>
        <button
          onClick={fetchCommissions}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-dark-400 text-sm">Total Commissions</p>
            <TrendingUp className="w-5 h-5 text-primary-500" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
          <p className="text-xs text-dark-500 mt-1">{stats.totalCount} records</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-dark-400 text-sm">Pending</p>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-500">{formatCurrency(stats.pending)}</p>
          <p className="text-xs text-dark-500 mt-1">{stats.pendingCount} awaiting review</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-dark-400 text-sm">Approved</p>
            <Check className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-500">{formatCurrency(stats.approved)}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-dark-400 text-sm">Paid Out</p>
            <CreditCard className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-500">{formatCurrency(stats.paid)}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-dark-400 text-sm">Rejected</p>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(stats.rejected)}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-dark-300 text-sm mb-2">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-dark-300 text-sm mb-2">Network</label>
            <select
              className="input"
              value={filters.network}
              onChange={(e) => setFilters({ ...filters, network: e.target.value })}
            >
              <option value="">All Networks</option>
              <option value="digistore24">Digistore24</option>
              <option value="awin">Awin</option>
              <option value="partnerstack">PartnerStack</option>
              <option value="mylead">MyLead</option>
            </select>
          </div>
          <div>
            <label className="block text-dark-300 text-sm mb-2">From Date</label>
            <input
              type="date"
              className="input"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-dark-300 text-sm mb-2">To Date</label>
            <input
              type="date"
              className="input"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-dark-300 text-sm mb-2">Search</label>
            <input
              type="text"
              className="input"
              placeholder="User or reference..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </button>
            <button type="button" onClick={clearFilters} className="btn-secondary">
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">All Commissions</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Commissions Found</h3>
            <p className="text-dark-400">
              Commission data will appear here when users earn affiliate commissions.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Network</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Reference</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="border-b border-dark-800 hover:bg-dark-800/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-dark-500" />
                          <span className="text-sm">{formatDate(commission.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-dark-500" />
                          <span className="text-sm">{commission.user?.name || commission.user?.email || `User #${commission.user_id}`}</span>
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
                          {commission.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-dark-500 font-mono">{commission.external_ref || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {commission.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(commission.id)}
                                disabled={actionLoading === commission.id}
                                className="p-2 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 transition"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openRejectModal(commission)}
                                disabled={actionLoading === commission.id}
                                className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {commission.status === 'approved' && (
                            <button
                              onClick={() => handleMarkPaid(commission.id)}
                              disabled={actionLoading === commission.id}
                              className="p-2 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition"
                              title="Mark as Paid"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedCommission(commission)}
                            className="p-2 bg-dark-700 rounded hover:bg-dark-600 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-800">
                <div className="text-sm text-dark-400">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Reject Commission</h3>
            <p className="text-dark-400 mb-4">
              Are you sure you want to reject this commission of {formatCurrency(selectedCommission?.amount)}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="input min-h-[100px]"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedCommission(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCommission && !showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Commission Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-dark-400">ID:</span>
                <span className="font-mono">#{selectedCommission.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">User:</span>
                <span>{selectedCommission.user?.name || selectedCommission.user?.email || `User #${selectedCommission.user_id}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Network:</span>
                <span className="capitalize">{selectedCommission.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Amount:</span>
                <span className="font-bold text-primary-400">{formatCurrency(selectedCommission.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Status:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedCommission.status)}`}>
                  {getStatusIcon(selectedCommission.status)}
                  {selectedCommission.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">External Ref:</span>
                <span className="font-mono text-sm">{selectedCommission.external_ref || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Created:</span>
                <span>{formatDate(selectedCommission.created_at)}</span>
              </div>
              {selectedCommission.approved_at && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Approved:</span>
                  <span>{formatDate(selectedCommission.approved_at)}</span>
                </div>
              )}
              {selectedCommission.paid_at && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Paid:</span>
                  <span>{formatDate(selectedCommission.paid_at)}</span>
                </div>
              )}
              {selectedCommission.rejection_reason && (
                <div className="pt-3 border-t border-dark-700">
                  <span className="text-dark-400 block mb-1">Rejection Reason:</span>
                  <p className="text-red-400">{selectedCommission.rejection_reason}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedCommission(null)}
              className="btn-secondary w-full mt-6"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCommissions;
