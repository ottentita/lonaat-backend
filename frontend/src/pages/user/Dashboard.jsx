import { useNavigate } from 'react-router-dom';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import EarningsChart from '@/components/EarningsChart';
import { formatCurrency, formatNumber } from '@/lib/currency';
import {
  Package,
  Megaphone,
  Wallet,
  MousePointerClick,
  Plus,
  TrendingUp,
  Activity,
  Loader2,
  DollarSign,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { loading, error, stats, recentActivity, earningsHistory, refetch } = useDashboardSummary();

  const statCards = [
    { title: 'Total Earnings', value: formatCurrency(stats.totalEarnings), icon: DollarSign, color: 'bg-green-500/10 text-green-500', link: '/dashboard/commissions' },
    { title: 'Pending', value: formatCurrency(stats.pendingEarnings), icon: TrendingUp, color: 'bg-yellow-500/10 text-yellow-500', link: '/dashboard/commissions' },
    { title: 'Available Balance', value: formatCurrency(stats.availableBalance), icon: Wallet, color: 'bg-purple-500/10 text-purple-500', link: '/dashboard/wallet' },
    { title: 'Active Campaigns', value: formatNumber(stats.activeCampaigns), icon: Megaphone, color: 'bg-blue-500/10 text-blue-500', link: '/dashboard/ads' },
    { title: 'Total Products', value: formatNumber(stats.totalProducts), icon: Package, color: 'bg-indigo-500/10 text-indigo-500', link: '/dashboard/products' },
    { title: 'Total Clicks', value: formatNumber(stats.totalClicks), icon: MousePointerClick, color: 'bg-cyan-500/10 text-cyan-500', link: '/dashboard/ads' }
  ];

  const quickActions = [
    { label: 'Import Products', icon: Plus, onClick: () => navigate('/dashboard/products') },
    { label: 'View Commissions', icon: DollarSign, onClick: () => navigate('/dashboard/commissions') },
    { label: 'Withdraw Funds', icon: Wallet, onClick: () => navigate('/dashboard/withdrawals') }
  ];

  // Loading Skeleton
  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-50">Dashboard</h1>
          <p className="text-dark-400 mt-1">Welcome back! Here's your overview</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-24 bg-dark-700 rounded"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card animate-pulse">
            <div className="h-96 bg-dark-700 rounded"></div>
          </div>
          <div className="card animate-pulse">
            <div className="h-96 bg-dark-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error Fallback
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-50">Dashboard</h1>
          <p className="text-dark-400 mt-1">Welcome back! Here's your overview</p>
        </div>

        <div className="card bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-500">Failed to load dashboard</h3>
              <p className="text-dark-400 text-sm mt-1">{error}</p>
              <button
                onClick={refetch}
                className="mt-3 btn btn-secondary flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-dark-50">Dashboard</h1>
        <p className="text-dark-400 mt-1">Welcome back! Here's your overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="card-hover cursor-pointer"
            onClick={() => stat.link && navigate(stat.link)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm">{stat.title}</p>
                <h3 className="text-2xl font-bold text-dark-50 mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EarningsChart data={earningsHistory} title="Earnings Trend (7 Days)" />
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-semibold text-dark-50">Recent Activity</h2>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.slice(0, 4).map((item, i) => (
                <div key={i} className="p-3 bg-dark-800 rounded-lg border border-dark-700">
                  <h4 className="text-dark-50 font-medium text-sm">{item.title}</h4>
                  <p className="text-dark-400 text-xs mt-1">{item.description}</p>
                  <p className="text-dark-500 text-xs mt-1">{item.time}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-dark-600 mx-auto mb-2" />
              <p className="text-dark-400 text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-dark-50 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className="btn btn-primary flex items-center justify-center gap-2"
            >
              <action.icon className="w-5 h-5" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
