import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adsAPI, adminAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Megaphone, 
  Filter,
  TrendingUp,
  MousePointerClick,
  Zap,
  User,
  Calendar,
  Loader2
} from 'lucide-react';

const AdminAds = () => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    user: 'all'
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, campaigns]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await adsAPI.getStatus();
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...campaigns];

    if (filters.status !== 'all') {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    if (filters.user !== 'all') {
      filtered = filtered.filter(c => c.user_id === parseInt(filters.user));
    }

    setFilteredCampaigns(filtered);
  };

  const getBoostLevelColor = (level) => {
    const colors = {
      1: 'text-green-500 bg-green-500/10',
      2: 'text-blue-500 bg-blue-500/10',
      3: 'text-purple-500 bg-purple-500/10',
      4: 'text-orange-500 bg-orange-500/10',
      5: 'text-red-500 bg-red-500/10'
    };
    return colors[level] || colors[1];
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'text-green-500 bg-green-500/10',
      paused: 'text-yellow-500 bg-yellow-500/10',
      completed: 'text-blue-500 bg-blue-500/10',
      expired: 'text-dark-400 bg-dark-800'
    };
    return colors[status] || 'text-dark-400 bg-dark-800';
  };

  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const activeCampaigns = filteredCampaigns.filter(c => c.status === 'active').length;

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
            <h1 className="text-3xl font-bold text-dark-50">Ad Campaigns</h1>
            <p className="text-dark-400 mt-1">Monitor all platform campaigns</p>
          </div>
          <div className="flex gap-4">
            <div className="card px-4 py-2">
              <p className="text-dark-400 text-xs">Active</p>
              <p className="text-xl font-bold text-green-500">{activeCampaigns}</p>
            </div>
            <div className="card px-4 py-2">
              <p className="text-dark-400 text-xs">Total Clicks</p>
              <p className="text-xl font-bold text-primary-500">{totalClicks}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-dark-50">Filters</h2>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-dark-300 text-sm mb-2">Status</label>
              <select
                className="input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-dark-50">
                      {campaign.product_name || 'Campaign'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="w-3 h-3 text-dark-500" />
                      <span className="text-dark-400 text-xs">
                        User #{campaign.user_id}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-primary-500/10 rounded-lg">
                    <Megaphone className="w-5 h-5 text-primary-500" />
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getBoostLevelColor(campaign.boost_level)}`}>
                    Level {campaign.boost_level}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-dark-400">
                      <MousePointerClick className="w-4 h-4" />
                      <span className="text-sm">Total Clicks</span>
                    </div>
                    <span className="text-dark-50 font-semibold">{campaign.clicks || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-dark-400">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Boost Level</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Zap
                          key={i}
                          className={`w-3 h-3 ${
                            i < campaign.boost_level ? 'text-primary-500 fill-primary-500' : 'text-dark-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-dark-400">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Started</span>
                    </div>
                    <span className="text-dark-50 text-sm">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-dark-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">Campaign ID</span>
                    <span className="text-dark-50 font-mono">#{campaign.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Megaphone className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark-50 mb-2">No campaigns found</h3>
            <p className="text-dark-400">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAds;
