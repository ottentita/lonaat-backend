import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';
import { ShoppingBag, MousePointerClick, TrendingUp, DollarSign, ExternalLink, Copy, Filter, RefreshCw, Search } from 'lucide-react';
import api from '../../services/api';

export default function OffersLeads() {
  const [offers, setOffers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total_clicks: 0, conversions: 0, conversion_rate: '0' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('offers');
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedNetwork, selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedNetwork !== 'all') params.append('network', selectedNetwork);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const [offersRes, leadsRes] = await Promise.all([
        api.get(`/affiliate/offers?${params.toString()}`),
        api.get('/affiliate/leads')
      ]);

      setOffers(offersRes.data.offers || []);
      setLeads(leadsRes.data.leads || []);
      setStats(leadsRes.data.stats || { total_clicks: 0, conversions: 0, conversion_rate: '0' });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackClick = async (productId) => {
    try {
      const res = await api.post('/affiliate/track/click', { product_id: productId });
      if (res.data.redirect_url) {
        window.open(res.data.redirect_url, '_blank');
        toast.success('Click tracked! Redirecting...');
        loadData();
      }
    } catch (error) {
      toast.error('Failed to track click');
    }
  };

  const copyAffiliateLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success('Affiliate link copied!');
  };

  const searchAdmitadProducts = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }
    try {
      setIsSearching(true);
      const res = await api.get(`/affiliate/admitad/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res.data.data || []);
      setShowSearchResults(true);
      if ((res.data.data || []).length === 0) {
        toast('No products found for "' + searchQuery + '"', { icon: '🔍' });
      } else {
        toast.success(`Found ${res.data.data.length} products`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const networks = ['all', 'admitad', 'aliexpress', 'awin', 'digistore24', 'mylead'];
  const categories = ['all', 'Electronics', 'Fashion', 'Health', 'Finance', 'Software', 'Courses'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Offers & Leads</h1>
            <p className="text-dark-400 mt-1">Browse affiliate offers and track your leads</p>
          </div>
          <Button onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Available Offers</p>
                  <p className="text-2xl font-bold text-white">{offers.length}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-primary-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Total Clicks</p>
                  <p className="text-2xl font-bold text-white">{stats.total_clicks}</p>
                </div>
                <MousePointerClick className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Conversions</p>
                  <p className="text-2xl font-bold text-white">{stats.conversions}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Conversion Rate</p>
                  <p className="text-2xl font-bold text-white">{stats.conversion_rate}%</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 border-b border-dark-800 pb-2">
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 rounded-t-lg transition ${
              activeTab === 'offers'
                ? 'bg-primary-600 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            Offers ({offers.length})
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-t-lg transition ${
              activeTab === 'leads'
                ? 'bg-primary-600 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            My Leads ({leads.length})
          </button>
        </div>

        {activeTab === 'offers' && (
          <>
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                    <Search className="w-4 h-4 text-dark-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchAdmitadProducts()}
                      placeholder="Search Admitad products (e.g., wear, electronics)..."
                      className="input flex-1"
                    />
                    <Button onClick={searchAdmitadProducts} disabled={isSearching}>
                      {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span className="ml-2">Search</span>
                    </Button>
                    {showSearchResults && (
                      <Button variant="outline" onClick={clearSearch}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {showSearchResults && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">
                    Search Results: "{searchQuery}" ({searchResults.length} products)
                  </h3>
                </div>
                {searchResults.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Search className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                      <p className="text-dark-400">No products found for "{searchQuery}"</p>
                      <p className="text-dark-500 text-sm mt-2">Try different keywords</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {searchResults.map((product, index) => (
                      <Card key={product.id || index} className="overflow-hidden">
                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-40 object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-white line-clamp-2">{product.name}</h3>
                            <span className="px-2 py-1 text-xs rounded bg-blue-900/30 text-blue-400">Admitad</span>
                          </div>
                          <p className="text-dark-400 text-sm mb-3 line-clamp-2">
                            {product.description || `From ${product.merchant}`}
                          </p>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xl font-bold text-primary-400">
                              {product.price} {product.currency}
                            </span>
                            <span className="text-xs text-dark-500">{product.category}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => window.open(product.url, '_blank')}
                              className="flex-1"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Product
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => copyAffiliateLink(product.url)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <hr className="border-dark-700 my-4" />
              </div>
            )}

            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-dark-400" />
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="input w-40"
                >
                  {networks.map(n => (
                    <option key={n} value={n}>{n === 'all' ? 'All Networks' : n.charAt(0).toUpperCase() + n.slice(1)}</option>
                  ))}
                </select>
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input w-40"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
                <p className="text-dark-400">Loading offers...</p>
              </div>
            ) : offers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Offers Available</h3>
                  <p className="text-dark-400">Check back later for new affiliate offers</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => (
                  <Card key={offer.id} className="overflow-hidden">
                    {offer.image_url && (
                      <img
                        src={offer.image_url}
                        alt={offer.name}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white line-clamp-2">{offer.name}</h3>
                        <span className="px-2 py-1 text-xs rounded bg-dark-700 text-dark-300">
                          {offer.network}
                        </span>
                      </div>
                      
                      <p className="text-dark-400 text-sm mb-3 line-clamp-2">
                        {offer.description || offer.ai_generated_ad || 'High-quality affiliate product'}
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-primary-400">{offer.price}</span>
                        {offer.category && (
                          <span className="text-xs text-dark-500">{offer.category}</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => trackClick(offer.id)}
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Get Offer
                        </Button>
                        {offer.affiliate_link && (
                          <Button
                            variant="outline"
                            onClick={() => copyAffiliateLink(offer.affiliate_link)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'leads' && (
          <Card>
            <CardHeader>
              <CardTitle>Your Click History</CardTitle>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="text-center py-8">
                  <MousePointerClick className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400">No clicks tracked yet. Start promoting offers!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-4 bg-dark-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {lead.product?.image_url && (
                          <img
                            src={lead.product.image_url}
                            alt={lead.product?.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="text-white font-medium">{lead.product?.name || 'Product'}</p>
                          <p className="text-dark-400 text-sm">
                            {new Date(lead.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          lead.converted
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {lead.converted ? 'Converted' : 'Pending'}
                        </span>
                        <span className="text-dark-500 text-sm">{lead.network}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
