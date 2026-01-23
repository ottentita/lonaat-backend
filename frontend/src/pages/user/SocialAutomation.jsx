import { useState, useEffect } from 'react';
import { Share2, Send, MessageCircle, Facebook, Twitter, Plus, RefreshCw, Trash2, CheckCircle, Clock, AlertCircle, Settings } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { socialAPI } from '../../services/api';
import toast from 'react-hot-toast';

const SocialAutomation = () => {
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, published: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ platform: 'telegram', access_token: '', page_id: '', page_name: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsRes, postsRes, statsRes] = await Promise.all([
        socialAPI.getAccounts(),
        socialAPI.getPosts({ limit: 50 }),
        socialAPI.getStats()
      ]);
      setAccounts(accountsRes.data.accounts || []);
      setPosts(postsRes.data.posts || []);
      setStats(statsRes.data || { total: 0, pending: 0, published: 0, failed: 0 });
    } catch (error) {
      console.error('Failed to load social data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async () => {
    try {
      await socialAPI.addAccount(newAccount);
      toast.success('Account connected successfully');
      setShowAddAccount(false);
      setNewAccount({ platform: 'telegram', access_token: '', page_id: '', page_name: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to connect account');
    }
  };

  const deleteAccount = async (id) => {
    if (!confirm('Remove this social account?')) return;
    try {
      await socialAPI.deleteAccount(id);
      toast.success('Account removed');
      loadData();
    } catch (error) {
      toast.error('Failed to remove account');
    }
  };

  const publishPost = async (postId) => {
    try {
      const res = await socialAPI.publishPost(postId);
      if (res.data.success) {
        toast.success('Post published!');
      } else {
        toast.error(res.data.error || 'Failed to publish');
      }
      loadData();
    } catch (error) {
      toast.error('Publish failed');
    }
  };

  const retryFailed = async () => {
    try {
      const res = await socialAPI.retryFailed();
      toast.success(`${res.data.count} posts queued for retry`);
      loadData();
    } catch (error) {
      toast.error('Retry failed');
    }
  };

  const deletePost = async (id) => {
    try {
      await socialAPI.deletePost(id);
      toast.success('Post deleted');
      loadData();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'telegram': return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'twitter': return <Twitter className="w-5 h-5 text-sky-400" />;
      default: return <Share2 className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/10 text-yellow-500',
      published: 'bg-green-500/10 text-green-500',
      failed: 'bg-red-500/10 text-red-500'
    };
    const icons = {
      pending: <Clock className="w-3 h-3" />,
      published: <CheckCircle className="w-3 h-3" />,
      failed: <AlertCircle className="w-3 h-3" />
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {icons[status]} {status}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Social Automation</h1>
            <p className="text-dark-400">Auto-publish affiliate products to your social channels</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-dark-400 text-sm">Total Posts</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="card">
            <p className="text-dark-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
          </div>
          <div className="card">
            <p className="text-dark-400 text-sm">Published</p>
            <p className="text-2xl font-bold text-green-500">{stats.published}</p>
          </div>
          <div className="card">
            <p className="text-dark-400 text-sm">Failed</p>
            <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
          </div>
        </div>

        <div className="flex gap-4 border-b border-dark-700">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'posts' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-dark-400 hover:text-white'
            }`}
          >
            Posts Queue
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'accounts' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-dark-400 hover:text-white'
            }`}
          >
            Connected Accounts
          </button>
        </div>

        {activeTab === 'posts' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Social Posts Queue</h2>
              {stats.failed > 0 && (
                <button onClick={retryFailed} className="btn-secondary text-sm">
                  Retry Failed ({stats.failed})
                </button>
              )}
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-12">
                <Share2 className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Posts Yet</h3>
                <p className="text-dark-400">Import products to automatically generate social posts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="p-4 bg-dark-800/50 rounded-lg border border-dark-700">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getPlatformIcon(post.platform)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium capitalize">{post.platform}</span>
                            {getStatusBadge(post.status)}
                          </div>
                          <p className="text-sm text-dark-300 line-clamp-2">{post.content}</p>
                          {post.error && (
                            <p className="text-xs text-red-400 mt-1">{post.error}</p>
                          )}
                          <p className="text-xs text-dark-500 mt-2">
                            {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {post.status === 'pending' && (
                          <button
                            onClick={() => publishPost(post.id)}
                            className="p-2 bg-primary-500/10 text-primary-500 rounded-lg hover:bg-primary-500/20"
                            title="Publish Now"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deletePost(post.id)}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Connected Social Accounts</h2>
              <button onClick={() => setShowAddAccount(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Connect Account
              </button>
            </div>

            {showAddAccount && (
              <div className="p-4 bg-dark-800 rounded-lg border border-dark-600 mb-4">
                <h3 className="font-medium mb-3">Connect New Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Platform</label>
                    <select
                      value={newAccount.platform}
                      onChange={(e) => setNewAccount({...newAccount, platform: e.target.value})}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg"
                    >
                      <option value="telegram">Telegram</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="facebook">Facebook Page</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Page Name</label>
                    <input
                      type="text"
                      value={newAccount.page_name}
                      onChange={(e) => setNewAccount({...newAccount, page_name: e.target.value})}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg"
                      placeholder="My Channel"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">
                      {newAccount.platform === 'telegram' ? 'Bot Token' : 'Access Token'}
                    </label>
                    <input
                      type="password"
                      value={newAccount.access_token}
                      onChange={(e) => setNewAccount({...newAccount, access_token: e.target.value})}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg"
                      placeholder="Your API token"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">
                      {newAccount.platform === 'telegram' ? 'Chat/Channel ID' : 'Page ID'}
                    </label>
                    <input
                      type="text"
                      value={newAccount.page_id}
                      onChange={(e) => setNewAccount({...newAccount, page_id: e.target.value})}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg"
                      placeholder="-1001234567890"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={addAccount} className="btn-primary">Connect</button>
                  <button onClick={() => setShowAddAccount(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}

            {accounts.length === 0 && !showAddAccount ? (
              <div className="text-center py-12">
                <Settings className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Accounts Connected</h3>
                <p className="text-dark-400 mb-4">Connect your social media accounts to enable auto-posting</p>
                <button onClick={() => setShowAddAccount(true)} className="btn-primary">
                  Connect First Account
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg border border-dark-700">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(account.platform)}
                      <div>
                        <p className="font-medium capitalize">{account.platform}</p>
                        <p className="text-sm text-dark-400">{account.page_name || 'Connected'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs ${account.enabled ? 'bg-green-500/10 text-green-500' : 'bg-dark-600 text-dark-400'}`}>
                        {account.enabled ? 'Active' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => deleteAccount(account.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-dark-800 rounded-lg border border-dark-700">
              <h3 className="font-medium mb-2">Supported Platforms</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  <span>Telegram - Full Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-sky-400" />
                  <span>Twitter/X - API Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  <span>Facebook Pages - API Required</span>
                </div>
              </div>
              <p className="text-xs text-dark-500 mt-3">
                Note: Twitter and Facebook require developer API credentials. Telegram works with any bot token.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SocialAutomation;
