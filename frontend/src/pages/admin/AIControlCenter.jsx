import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminAIAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Bot,
  Play,
  Square,
  RefreshCw,
  Activity,
  Megaphone,
  Home,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ListFilter
} from 'lucide-react';

const AIControlCenter = () => {
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState({});
  const [stats, setStats] = useState({
    total_jobs: 0,
    completed_jobs: 0,
    failed_jobs: 0,
    running_jobs: 0,
    today_jobs: 0,
    success_rate: 0
  });
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState({ running_tasks: [], is_busy: false });
  const [filter, setFilter] = useState({ status: '', job_type: '' });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLogs(), fetchStatus()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminAIAPI.getStats();
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to fetch AI stats:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.job_type) params.job_type = filter.job_type;
      const response = await adminAIAPI.getLogs(params);
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch AI logs:', error);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await adminAIAPI.getStatus();
      setStatus(response.data || { running_tasks: [], is_busy: false });
    } catch (error) {
      console.error('Failed to fetch AI status:', error);
    }
  };

  const runTask = async (taskName, apiCall) => {
    try {
      setTaskLoading(prev => ({ ...prev, [taskName]: true }));
      const response = await apiCall();
      toast.success(response.data.message || `${taskName} completed!`);
      await Promise.all([fetchStats(), fetchLogs(), fetchStatus()]);
    } catch (error) {
      if (error.response?.data?.status === 'busy') {
        toast.error('Task is already running');
      } else {
        toast.error(`Failed to run ${taskName}`);
      }
    } finally {
      setTaskLoading(prev => ({ ...prev, [taskName]: false }));
    }
  };

  const stopAllTasks = async () => {
    try {
      setTaskLoading(prev => ({ ...prev, stopAll: true }));
      await adminAIAPI.stopAllTasks();
      toast.success('All AI tasks stopped');
      await fetchStatus();
    } catch (error) {
      toast.error('Failed to stop tasks');
    } finally {
      setTaskLoading(prev => ({ ...prev, stopAll: false }));
    }
  };

  const getStatusIcon = (jobStatus) => {
    switch (jobStatus) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (jobStatus) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return colors[jobStatus] || 'bg-gray-100 text-gray-800';
  };

  const formatJobType = (type) => {
    const typeMap = {
      'run_ads_products': 'Run Ads: Products',
      'run_ads_real_estate': 'Run Ads: Real Estate',
      'run_ads_all': 'Run Ads: All',
      'scan_commissions': 'Scan Commissions'
    };
    return typeMap[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Control Center</h1>
              <p className="text-gray-500">Manage automated tasks and monitor AI operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.is_busy && (
              <span className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Tasks Running
              </span>
            )}
            <button
              onClick={() => fetchData()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Total Jobs</span>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total_jobs}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Completed</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{stats.completed_jobs}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Failed</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{stats.failed_jobs}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Success Rate</span>
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{stats.success_rate}%</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-green-500" />
            Task Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => runTask('products', adminAIAPI.runAdsForProducts)}
              disabled={taskLoading.products || status.is_busy}
              className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {taskLoading.products ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Package className="w-5 h-5" />
              )}
              <span>Run Ads: Products</span>
            </button>
            
            <button
              onClick={() => runTask('realEstate', adminAIAPI.runAdsForRealEstate)}
              disabled={taskLoading.realEstate || status.is_busy}
              className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {taskLoading.realEstate ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Home className="w-5 h-5" />
              )}
              <span>Run Ads: Real Estate</span>
            </button>
            
            <button
              onClick={() => runTask('all', adminAIAPI.runAdsForAll)}
              disabled={taskLoading.all || status.is_busy}
              className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {taskLoading.all ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Megaphone className="w-5 h-5" />
              )}
              <span>Run Ads: All</span>
            </button>
            
            <button
              onClick={() => runTask('commissions', adminAIAPI.scanCommissions)}
              disabled={taskLoading.commissions || status.is_busy}
              className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {taskLoading.commissions ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <DollarSign className="w-5 h-5" />
              )}
              <span>Scan Commissions</span>
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={stopAllTasks}
              disabled={taskLoading.stopAll || !status.is_busy}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {taskLoading.stopAll ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              <span>Stop All Tasks</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-gray-500" />
              AI Task Logs
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={filter.job_type}
                onChange={(e) => setFilter(prev => ({ ...prev, job_type: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="run_ads_products">Run Ads: Products</option>
                <option value="run_ads_real_estate">Run Ads: Real Estate</option>
                <option value="run_ads_all">Run Ads: All</option>
                <option value="scan_commissions">Scan Commissions</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No AI task logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatJobType(log.job_type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(log.started_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(log.completed_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.error_message ? (
                          <span className="text-red-600">{log.error_message}</span>
                        ) : log.result ? (
                          <span className="text-gray-600 max-w-xs truncate block">
                            {typeof log.result === 'string' 
                              ? log.result.substring(0, 50) + (log.result.length > 50 ? '...' : '')
                              : JSON.stringify(log.result).substring(0, 50)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIControlCenter;
