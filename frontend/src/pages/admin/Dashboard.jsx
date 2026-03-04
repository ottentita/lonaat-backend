import { useState, useEffect } from 'react';
import { adminAPI } from '@/services/api';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Users,
  Zap,
  TrendingUp,
  DollarSign,
  Activity,
  AlertCircle,
  Loader2,
  Calendar,
  Clock
} from 'lucide-react';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, revenueRes, growthRes, activityRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getRevenueData(),
        adminAPI.getUserGrowth(),
        adminAPI.getRecentActivity()
      ]);

      setStats(statsRes.data || {});
      setRevenueData(revenueRes.data || []);
      setUserGrowth(growthRes.data || []);
      setRecentActivity(activityRes.data || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
      trend: '+12%'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers || 0,
      icon: Activity,
      color: 'bg-green-500/10 text-green-500',
      trend: '+8%'
    },
    {
      title: 'Total Revenue',
      value: `$${(stats.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500/10 text-purple-500',
      trend: '+23%'
    },
    {
      title: 'Transactions',
      value: stats.totalTransactions || 0,
      icon: Zap,
      color: 'bg-orange-500/10 text-orange-500',
      trend: '+5%'
    }
  ];

  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-dark-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-50">Dashboard</h1>
          <p className="text-dark-400 mt-2">Welcome back! Here's your performance overview.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-dark-400 text-sm mb-1">{card.title}</p>
                  <h3 className="text-2xl font-bold text-dark-50">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-500 text-sm font-medium">{card.trend}</span>
                <span className="text-dark-400 text-sm">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-50 mb-4">Revenue Trend</h2>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="month" stroke="#718096" />
                <YAxis stroke="#718096" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #2d3748' }}
                  labelStyle={{ color: '#a0aec0' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-dark-400">
              No data available
            </div>
          )}
        </div>

        {/* User Growth Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-50 mb-4">User Growth</h2>
          {userGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="month" stroke="#718096" />
                <YAxis stroke="#718096" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #2d3748' }}
                  labelStyle={{ color: '#a0aec0' }}
                />
                <Legend />
                <Bar dataKey="users" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-dark-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-dark-50 mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.slice(0, 5).map((activity, idx) => (
              <div key={idx} className="flex items-start gap-4 pb-4 border-b border-dark-800 last:border-b-0">
                <div className="p-2 rounded-lg bg-dark-800">
                  <Activity className="w-4 h-4 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-dark-50 font-medium truncate">{activity.title}</p>
                  <p className="text-dark-400 text-sm truncate">{activity.description}</p>
                </div>
                <div className="flex items-center gap-2 text-dark-400 text-xs whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-dark-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
