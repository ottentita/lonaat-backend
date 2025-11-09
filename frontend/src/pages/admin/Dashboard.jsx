import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Users, 
  DollarSign,
  Clock,
  TrendingUp,
  Wallet,
  Loader2,
  UserCheck,
  AlertCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    total_revenue: 0,
    pending_withdrawals: 0,
    total_withdrawals: 0,
    total_campaigns: 0,
    total_products: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data.stats || response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.total_users || 0,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
      trend: '+12%'
    },
    {
      title: 'Active Users',
      value: stats.active_users || 0,
      icon: UserCheck,
      color: 'bg-green-500/10 text-green-500',
      trend: '+8%'
    },
    {
      title: 'Total Revenue',
      value: `₦${(stats.total_revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500/10 text-purple-500',
      trend: '+23%'
    },
    {
      title: 'Pending Withdrawals',
      value: stats.pending_withdrawals || 0,
      icon: Clock,
      color: 'bg-yellow-500/10 text-yellow-500',
      trend: stats.pending_withdrawals > 0 ? 'Needs attention' : 'All clear'
    },
    {
      title: 'Total Campaigns',
      value: stats.total_campaigns || 0,
      icon: TrendingUp,
      color: 'bg-orange-500/10 text-orange-500',
      trend: '+15%'
    },
    {
      title: 'Total Products',
      value: stats.total_products || 0,
      icon: Wallet,
      color: 'bg-cyan-500/10 text-cyan-500',
      trend: '+18%'
    }
  ];

  const recentActivity = [
    {
      type: 'user',
      title: 'New user registered',
      description: 'John Doe joined the platform',
      time: '5 minutes ago',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      type: 'withdrawal',
      title: 'Withdrawal request',
      description: 'Jane Smith requested ₦50,000',
      time: '1 hour ago',
      icon: Wallet,
      color: 'text-yellow-500'
    },
    {
      type: 'payment',
      title: 'Payment received',
      description: 'Mike Johnson deposited ₦10,000',
      time: '2 hours ago',
      icon: DollarSign,
      color: 'text-green-500'
    }
  ];

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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-50">Admin Dashboard</h1>
          <p className="text-dark-400 mt-1">Platform overview and statistics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <div key={index} className="card-hover">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-dark-400 text-sm">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-dark-50 mt-2">{stat.value}</h3>
                  <p className={`text-sm mt-2 ${stat.trend.includes('+') ? 'text-green-500' : stat.trend.includes('attention') ? 'text-yellow-500' : 'text-dark-400'}`}>
                    {stat.trend}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {stats.pending_withdrawals > 0 && (
          <div className="card bg-yellow-900/20 border-yellow-700">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-500 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-dark-50 mb-1">
                  Action Required
                </h3>
                <p className="text-dark-300 text-sm">
                  You have {stats.pending_withdrawals} pending withdrawal request{stats.pending_withdrawals > 1 ? 's' : ''} that need{stats.pending_withdrawals === 1 ? 's' : ''} your attention.
                </p>
              </div>
              <a href="/admin/withdrawals" className="btn-primary">
                Review Now
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-dark-800 rounded-lg">
                  <div className={`p-2 rounded-lg bg-dark-700 ${activity.color}`}>
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-dark-50 font-medium">{activity.title}</h4>
                    <p className="text-dark-400 text-sm mt-1">{activity.description}</p>
                    <p className="text-dark-500 text-xs mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">Platform Health</h2>
            <div className="space-y-4">
              <div className="p-4 bg-dark-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-300">User Engagement</span>
                  <span className="text-green-500 font-semibold">Good</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div className="p-4 bg-dark-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-300">Revenue Growth</span>
                  <span className="text-blue-500 font-semibold">Excellent</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div className="p-4 bg-dark-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-300">System Performance</span>
                  <span className="text-purple-500 font-semibold">Optimal</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
