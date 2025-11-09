import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { walletAPI, productsAPI, adsAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Package, 
  Megaphone, 
  Wallet, 
  MousePointerClick,
  Plus,
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeCampaigns: 0,
    balance: 0,
    totalClicks: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [walletRes, productsRes, adsRes] = await Promise.all([
        walletAPI.getBalance(),
        productsAPI.getAll(),
        adsAPI.getStatus()
      ]);

      const products = productsRes.data.products || [];
      const campaigns = adsRes.data.campaigns || [];
      const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

      setStats({
        totalProducts: products.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        balance: walletRes.data.balance || 0,
        totalClicks
      });

      const activity = [
        ...campaigns.slice(0, 3).map(c => ({
          type: 'campaign',
          title: `Campaign for ${c.product_name || 'Product'}`,
          description: `${c.clicks || 0} clicks • Boost Level ${c.boost_level || 1}`,
          time: new Date(c.created_at).toLocaleDateString(),
          icon: Megaphone,
          color: 'text-primary-500'
        })),
        ...products.slice(0, 2).map(p => ({
          type: 'product',
          title: `Product: ${p.name || 'Unnamed'}`,
          description: `Added from ${p.network || 'manual'}`,
          time: new Date(p.created_at).toLocaleDateString(),
          icon: Package,
          color: 'text-green-500'
        }))
      ].slice(0, 5);

      setRecentActivity(activity);
    } catch (error) {
      
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500/10 text-blue-500',
      change: '+12%'
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns,
      icon: Megaphone,
      color: 'bg-purple-500/10 text-purple-500',
      change: '+5%'
    },
    {
      title: 'Account Balance',
      value: `₦${stats.balance.toLocaleString()}`,
      icon: Wallet,
      color: 'bg-green-500/10 text-green-500',
      change: '+8%'
    },
    {
      title: 'Total Clicks',
      value: stats.totalClicks,
      icon: MousePointerClick,
      color: 'bg-orange-500/10 text-orange-500',
      change: '+23%'
    }
  ];

  const quickActions = [
    {
      label: 'Add Product',
      icon: Plus,
      color: 'btn-primary',
      onClick: () => navigate('/products')
    },
    {
      label: 'Launch Campaign',
      icon: TrendingUp,
      color: 'btn-primary',
      onClick: () => navigate('/ads')
    },
    {
      label: 'Buy Credits',
      icon: Wallet,
      color: 'btn-secondary',
      onClick: () => navigate('/transactions')
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
          <h1 className="text-3xl font-bold text-dark-50">Dashboard</h1>
          <p className="text-dark-400 mt-1">Welcome back! Here's your overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <div key={index} className="card-hover">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-dark-400 text-sm">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-dark-50 mt-2">{stat.value}</h3>
                  <p className="text-green-500 text-sm mt-2">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-dark-50">Recent Activity</h2>
            </div>
            {recentActivity.length > 0 ? (
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
            ) : (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400">No recent activity</p>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`${action.color} w-full flex items-center justify-center gap-2`}
                >
                  <action.icon className="w-5 h-5" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
