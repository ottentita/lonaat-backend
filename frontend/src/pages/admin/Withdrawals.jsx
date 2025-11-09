import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { withdrawalAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Wallet, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Loader2,
  X
} from 'lucide-react';

const AdminWithdrawals = () => {
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [statusFilter, withdrawals]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await withdrawalAPI.getAll();
      setWithdrawals(response.data.withdrawals || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...withdrawals];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    setFilteredWithdrawals(filtered);
  };

  const handleAction = (withdrawal, type) => {
    setSelectedWithdrawal(withdrawal);
    setActionType(type);
    setShowActionModal(true);
    setAdminNotes('');
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    
    try {
      setProcessing(true);
      if (actionType === 'approve') {
        await withdrawalAPI.approve(selectedWithdrawal.id, { admin_notes: adminNotes });
        toast.success('Withdrawal approved successfully');
      } else {
        await withdrawalAPI.reject(selectedWithdrawal.id, { admin_notes: adminNotes });
        toast.success('Withdrawal rejected');
      }
      setShowActionModal(false);
      setSelectedWithdrawal(null);
      setAdminNotes('');
      fetchWithdrawals();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Action failed');
    } finally {
      setProcessing(false);
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

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const totalAmount = filteredWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

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
            <h1 className="text-3xl font-bold text-dark-50">Withdrawal Requests</h1>
            <p className="text-dark-400 mt-1">Review and process withdrawal requests</p>
          </div>
          <div className="flex gap-4">
            <div className="card px-4 py-2">
              <p className="text-dark-400 text-xs">Pending</p>
              <p className="text-xl font-bold text-yellow-500">{pendingCount}</p>
            </div>
            <div className="card px-4 py-2">
              <p className="text-dark-400 text-xs">Total Amount</p>
              <p className="text-xl font-bold text-primary-500">₦{totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="card bg-yellow-900/20 border-yellow-700">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-500 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-dark-50 mb-1">
                  {pendingCount} Pending Request{pendingCount > 1 ? 's' : ''}
                </h3>
                <p className="text-dark-300 text-sm">
                  Review and process pending withdrawal requests to keep users satisfied
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-dark-50">Filters</h2>
          </div>
          <div>
            <label className="block text-dark-300 text-sm mb-2">Status</label>
            <select
              className="input max-w-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {filteredWithdrawals.length > 0 ? (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-800">
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">User</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">Method</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">Date</th>
                    <th className="text-center py-3 px-4 text-dark-400 font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-dark-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWithdrawals.map((withdrawal) => {
                    const StatusIcon = getStatusIcon(withdrawal.status);
                    return (
                      <tr key={withdrawal.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-dark-500" />
                            <div>
                              <p className="text-dark-50">{withdrawal.user_name || 'User'}</p>
                              <p className="text-dark-400 text-xs">ID: {withdrawal.user_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-dark-50 font-semibold text-lg">
                            ₦{withdrawal.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-dark-300 text-sm">
                            {withdrawal.method?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-dark-300 text-sm">
                            <Calendar className="w-4 h-4" />
                            {new Date(withdrawal.created_at).toLocaleDateString()}
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
                                onClick={() => handleAction(withdrawal, 'approve')}
                                className="btn-success text-sm px-3 py-1"
                              >
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(withdrawal, 'reject')}
                                className="btn-danger text-sm px-3 py-1"
                              >
                                <XCircle className="w-4 h-4 inline mr-1" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-dark-500 text-sm">
                              {withdrawal.status === 'completed' ? 'Processed' : 'No action'}
                            </span>
                          )}
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
            <Wallet className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark-50 mb-2">No withdrawals found</h3>
            <p className="text-dark-400">Try adjusting your filters</p>
          </div>
        )}

        {showActionModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark-50">
                  {actionType === 'approve' ? 'Approve' : 'Reject'} Withdrawal
                </h2>
                <button onClick={() => setShowActionModal(false)}>
                  <X className="w-6 h-6 text-dark-400" />
                </button>
              </div>

              <div className="mb-6 p-4 bg-dark-800 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-dark-400">User:</span>
                  <span className="text-dark-50">{selectedWithdrawal.user_name || `User #${selectedWithdrawal.user_id}`}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-dark-400">Amount:</span>
                  <span className="text-dark-50 font-bold text-lg">₦{selectedWithdrawal.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Method:</span>
                  <span className="text-dark-50">{selectedWithdrawal.method?.replace('_', ' ')}</span>
                </div>
              </div>

              <form onSubmit={handleSubmitAction} className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-2">
                    Notes {actionType === 'reject' && '(Required)'}
                  </label>
                  <textarea
                    className="input"
                    rows="4"
                    placeholder={actionType === 'approve' ? 'Optional notes...' : 'Reason for rejection...'}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    required={actionType === 'reject'}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={processing}
                    className={`flex-1 ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 inline animate-spin" />
                    ) : (
                      <>
                        {actionType === 'approve' ? (
                          <CheckCircle className="w-5 h-5 inline mr-2" />
                        ) : (
                          <XCircle className="w-5 h-5 inline mr-2" />
                        )}
                        Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowActionModal(false)}
                    className="btn-secondary"
                    disabled={processing}
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

export default AdminWithdrawals;
