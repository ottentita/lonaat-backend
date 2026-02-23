import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/currency' 
import { 
  Users, 
  DollarSign,
  Clock,
  TrendingUp,
  Wallet,
  Loader2,
  UserCheck,
  AlertCircle,
  Download,
  Package,
  Megaphone,
  Globe,
  ArrowRight,
  Sparkles,
  Shield,
  Bot
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    total_revenue: 0,
    pending_withdrawals: 0,
    total_withdrawals: 0,
    total_campaigns: 0,
    total_products: 0
  });
  const [recentData, setRecentData] = useState({
    users: [],
    transactions: [],
    commissions: [],
    adminActions: []
  });
  
  const handleAiBulkImport = async () => {
    try {
      setAiLoading(true);
      const response = await adminAPI.aiBulkImport({
        networks: ['digistore24', 'awin'],
        max_per_network: 20,
        generate_ads: true
      });
      toast.success(response.data.message || 'AI bulk import complete!');
      fetchStats();
    } catch (error) {
      toast.error('Failed to run AI bulk import');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data.stats || response.data);
      
      const rawData = response.data.raw || {};
      setRecentData({
        users: rawData.recent_users || [],
        transactions: rawData.recent_transactions || [],
        commissions: rawData.recent_commissions || [],
        adminActions: rawData.recent_admin_actions || []
      });
    } catch (error) {
      
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
      value: formatCurrency(stats.total_revenue || 0, 'USD'),
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const recentActivity = [
    ...recentData.users.slice(0, 3).map(user => ({
      type: 'user',
      title: 'New user registered',
      description: `${user.email || 'Unknown'} joined the platform`,
      time: formatDate(user.created_at),
      icon: Users,
      color: 'text-blue-500'
    })),
    ...recentData.transactions.slice(0, 3).map(tx => ({
      type: 'transaction',
      title: tx.type === 'withdrawal' ? 'Withdrawal request' : 'Commission earned',
      description: formatCurrency(parseFloat(tx.amount || 0) || 0, 'USD') + ` - ${tx.status || 'pending'}`,
      time: formatDate(tx.created_at),
      icon: tx.type === 'withdrawal' ? Wallet : DollarSign,
      color: tx.type === 'withdrawal' ? 'text-yellow-500' : 'text-green-500'
    })),
    ...recentData.commissions.slice(0, 2).map(comm => ({
      type: 'commission',
      title: 'Commission generated',
      description: formatCurrency(parseFloat(comm.amount || 0) || 0, 'USD') + ' from affiliate sales',
      time: formatDate(comm.created_at),
      icon: TrendingUp,
      color: 'text-purple-500'
    }))
  ].slice(0, 5);

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

        <div>
          <h2 className="text-xl font-semibold text-dark-50 mb-4">AI Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="card bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-700/50">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <Bot className="w-8 h-8 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-dark-50 mb-1">
                    AI Bulk Import
                  </h3>
                  <p className="text-dark-300 text-sm mb-3">
                    Automatically import products from Digistore24 & Awin with AI-generated ad copy. 
                    <span className="text-green-400 font-medium"> Free & Unlimited for Admins!</span>
                  </p>
                  <button
                    onClick={handleAiBulkImport}
                    disabled={aiLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Running AI Import...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Run AI Bulk Import
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="card bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-700/50">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <Shield className="w-8 h-8 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-dark-50 mb-1">
                    Fraud Detection
                  </h3>
                  <p className="text-dark-300 text-sm mb-3">
                    Monitor suspicious activity and manage blocked accounts. Auto-blocks users with fraud score above 80.
                  </p>
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    View Fraud Stats
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-dark-50 mb-4">Product Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/dashboard/products')}
              className="card-hover text-left group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                  <Download className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-dark-500 group-hover:text-primary-500 transition-colors" />
              </div>
              <h3 className="text-dark-50 font-semibold mb-1">Import Products</h3>
              <p className="text-dark-400 text-sm">Import from Digistore24 & Awin</p>
            </button>

            <button
              onClick={() => navigate('/dashboard/products')}
              className="card-hover text-left group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                  <Package className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-dark-500 group-hover:text-primary-500 transition-colors" />
              </div>
              <h3 className="text-dark-50 font-semibold mb-1">View Products</h3>
              <p className="text-dark-400 text-sm">Manage {stats.total_products} products</p>
            </button>

            <button
              onClick={() => navigate('/dashboard/ads')}
              className="card-hover text-left group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-lg bg-orange-500/10 text-orange-500">
                  <Megaphone className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-dark-500 group-hover:text-primary-500 transition-colors" />
              </div>
              <h3 className="text-dark-50 font-semibold mb-1">Manage Campaigns</h3>
              <p className="text-dark-400 text-sm">{stats.total_campaigns} active campaigns</p>
            </button>

            <button
              onClick={() => navigate('/dashboard/wallet')}
              className="card-hover text-left group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
                  <Globe className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-dark-500 group-hover:text-primary-500 transition-colors" />
              </div>
              <h3 className="text-dark-50 font-semibold mb-1">Browse Networks</h3>
              <p className="text-dark-400 text-sm">Digistore24 & Awin products</p>
            </button>
          </div>
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
