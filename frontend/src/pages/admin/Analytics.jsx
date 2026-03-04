import { useState, useEffect } from 'react';
import { analyticsAPI } from '@/services/api';
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
import { TrendingUp, Users, DollarSign, Activity, Loader2 } from 'lucide-react';

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    overview: {},
    revenue: [],
    users: [],
    offers: [],
    topAffiliates: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.getPlatformAnalytics();
      setAnalytics(res.data || {});
    } catch (err) {
      toast.error('Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const { overview = {}, revenue = [], users: userData = [], offers: offerData = [], topAffiliates = [] } = analytics;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark-50">Platform Analytics</h1>
        <p className="text-dark-400 mt-2">Monitor platform performance and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-dark-400 text-sm mb-1">Total Revenue</p>
              <h3 className="text-2xl font-bold text-dark-50">
                ${(overview.totalRevenue || 0).toLocaleString()}
              </h3>
            </div>
            <DollarSign className="w-6 h-6 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-dark-400 text-sm mb-1">Active Users</p>
              <h3 className="text-2xl font-bold text-dark-50">
                {(overview.activeUsers || 0).toLocaleString()}
              </h3>
            </div>
            <Users className="w-6 h-6 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-dark-400 text-sm mb-1">Total Conversions</p>
              <h3 className="text-2xl font-bold text-dark-50">
                {(overview.conversions || 0).toLocaleString()}
              </h3>
            </div>
            <Activity className="w-6 h-6 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-dark-400 text-sm mb-1">Commission Avg</p>
              <h3 className="text-2xl font-bold text-dark-50">
                {(overview.avgCommission || 0).toFixed(1)}%
              </h3>
            </div>
            <TrendingUp className="w-6 h-6 text-yellow-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        {revenue.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-50 mb-4">Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* User Growth */}
        {userData.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-50 mb-4">User Growth</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
                <Bar dataKey="newUsers" fill="#10b981" name="New Users" />
                <Bar dataKey="activeUsers" fill="#3b82f6" name="Active Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Offer Performance */}
        {offerData.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-50 mb-4">Top Offers</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={offerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
                <Bar dataKey="conversions" fill="#f59e0b" name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category Distribution */}
        {offerData.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-50 mb-4">Category Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={offerData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="conversions"
                >
                  {offerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Affiliates */}
      {topAffiliates.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-50 mb-4">Top Affiliates</h2>
          <div className="space-y-2">
            {topAffiliates.map((affiliate, idx) => (
              <div key={affiliate.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-dark-400 font-semibold">#{idx + 1}</span>
                  <span className="text-dark-50">{affiliate.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-green-500 font-semibold">
                    ${(affiliate.earnings || 0).toLocaleString()}
                  </p>
                  <p className="text-dark-400 text-sm">
                    {affiliate.conversions} conversions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;
