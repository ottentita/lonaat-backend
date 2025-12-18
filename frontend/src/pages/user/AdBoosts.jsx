import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adsAPI, productsAPI, walletAPI } from '@/services/api';
import { isAdmin } from '@/utils/auth';
import toast from 'react-hot-toast';
import { 
  Megaphone, 
  Plus, 
  Pause,
  TrendingUp,
  MousePointerClick,
  Zap,
  Loader2,
  X,
  Wallet,
  Crown
} from 'lucide-react';

const AdBoosts = () => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [balance, setBalance] = useState(0);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    boost_level: 1,
    duration_days: 7
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adsRes, productsRes, walletRes] = await Promise.all([
        adsAPI.getStatus(),
        productsAPI.getAll(),
        walletAPI.getBalance()
      ]);
      setCampaigns(adsRes.data.campaigns || []);
      setProducts(productsRes.data.products || []);
      setBalance(walletRes.data.balance || 0);
    } catch (error) {
      
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const userIsAdmin = isAdmin();
  
  const calculateCost = () => {
    if (userIsAdmin) return 0;
    const baseDaily = 100;
    const multiplier = formData.boost_level;
    return baseDaily * multiplier * formData.duration_days;
  };

  const handleLaunchCampaign = async (e) => {
    e.preventDefault();
    const cost = calculateCost();
    
    if (!userIsAdmin && balance < cost) {
      toast.error('Insufficient balance. Please buy more credits.');
      return;
    }

    try {
      await adsAPI.launch(formData);
      toast.success('Campaign launched successfully!');
      setShowLaunchModal(false);
      setFormData({ product_id: '', boost_level: 1, duration_days: 7 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to launch campaign');
    }
  };

  const handlePauseCampaign = async (id) => {
    try {
      await adsAPI.pause(id);
      toast.success('Campaign paused');
      fetchData();
    } catch (error) {
      toast.error('Failed to pause campaign');
    }
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
    return status === 'active' 
      ? 'text-green-500 bg-green-500/10' 
      : 'text-dark-400 bg-dark-800';
  };

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
            <h1 className="text-3xl font-bold text-dark-50">AdBoost Campaigns</h1>
            <p className="text-dark-400 mt-1">Boost your product visibility</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="card px-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-green-500" />
                <span className="text-dark-400">Balance:</span>
                <span className="text-dark-50 font-semibold">${balance.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => setShowLaunchModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Launch Campaign
            </button>
          </div>
        </div>

        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-dark-50">
                      {campaign.product_name || 'Campaign'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getBoostLevelColor(campaign.boost_level)}`}>
                        Level {campaign.boost_level}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-primary-500/10 rounded-lg">
                    <Megaphone className="w-5 h-5 text-primary-500" />
                  </div>
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
                </div>

                <div className="flex items-center gap-2">
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => handlePauseCampaign(campaign.id)}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  )}
                  <div className="text-xs text-dark-500">
                    Started: {new Date(campaign.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Megaphone className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark-50 mb-2">No active campaigns</h3>
            <p className="text-dark-400 mb-6">Launch your first AdBoost campaign to get more clicks</p>
            <button onClick={() => setShowLaunchModal(true)} className="btn-primary">
              <Plus className="w-5 h-5 inline mr-2" />
              Launch Campaign
            </button>
          </div>
        )}

        {showLaunchModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark-50">Launch AdBoost Campaign</h2>
                <button onClick={() => setShowLaunchModal(false)}>
                  <X className="w-6 h-6 text-dark-400" />
                </button>
              </div>

              <form onSubmit={handleLaunchCampaign} className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Select Product</label>
                  <select
                    className="input"
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    required
                  >
                    <option value="">Choose a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">
                    Boost Level: {formData.boost_level}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    className="w-full"
                    value={formData.boost_level}
                    onChange={(e) => setFormData({ ...formData, boost_level: parseInt(e.target.value) })}
                  />
                  <div className="flex justify-between text-xs text-dark-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Duration (days)</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="30"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="card bg-dark-800 border-primary-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-dark-300">Total Cost</span>
                    <span className="text-2xl font-bold text-primary-500">
                      ${calculateCost().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">Your Balance</span>
                    <span className={balance >= calculateCost() ? 'text-green-500' : 'text-red-500'}>
                      ${balance.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="submit" 
                    className="btn-primary flex-1"
                    disabled={balance < calculateCost()}
                  >
                    Launch Campaign
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLaunchModal(false)}
                    className="btn-secondary"
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

export default AdBoosts;
