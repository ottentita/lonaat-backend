import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function AffiliateNetworks() {
  const [networks, setNetworks] = useState([]);
  const [productNetworks, setProductNetworks] = useState([]);
  const [cpaNetworks, setCpaNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
      const response = await fetch(`${BASE}/api/affiliate/networks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setNetworks(data.networks || []);
      setProductNetworks(data.productNetworks || data.networks?.filter(n => n.supportsProducts) || []);
      setCpaNetworks(data.cpaNetworks || data.networks?.filter(n => n.supportsCPA && !n.supportsProducts) || []);
    } catch (error) {
      console.error('Error loading networks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (networkId, network) => {
    if (!network.supportsProducts) {
      toast.error(`${network.name} is CPA-only. Use Offers & Leads for tracking.`);
      return;
    }

    try {
      setSyncing(networkId);
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
      const response = await fetch(`${BASE}/api/affiliate/sync/${networkId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 100 })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Products synced successfully');
      } else {
        toast.error(data.error || 'Failed to sync');
      }
    } catch (error) {
      toast.error('Failed to sync products');
    } finally {
      setSyncing(null);
    }
  };

  const getNetworkIcon = (id) => {
    const icons = {
      digistore24: '🛒',
      awin: '🔗',
      partnerstack: '💼',
      amazon: '📦',
      clickbank: '💰',
      shareasale: '🤝',
      admitad: '🌍',
      aliexpress: '🛍️',
      mylead: '📊'
    };
    return icons[id] || '🌐';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Affiliate Networks</h1>
      </div>

      <p className="text-muted-foreground">
        Connect to affiliate networks to import products or track CPA conversions.
      </p>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-500">📦</span> Product Networks
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Import products from these networks to your marketplace. Products synced here will appear in My Products.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productNetworks.map((network) => (
              <Card key={network.id} className="hover:border-primary/50 transition-colors border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{getNetworkIcon(network.id)}</span>
                    {network.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {network.description || `Sync products from ${network.name}`}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Products + {network.supportsCPA ? 'CPA' : 'Feed Only'}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleSync(network.id, network)}
                      disabled={syncing === network.id}
                    >
                      {syncing === network.id ? 'Syncing...' : 'Sync Products'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-500">📊</span> CPA Networks (Leads & Offers Only)
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            These networks track conversions and commissions only. No product imports available - use Offers & Leads page for tracking.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cpaNetworks.filter(n => !n.supportsProducts).map((network) => (
              <Card key={network.id} className="hover:border-blue-500/50 transition-colors border-blue-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{getNetworkIcon(network.id)}</span>
                    {network.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {network.description || 'CPA tracking only - no product imports'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      CPA Only
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/dashboard/offers-leads')}
                    >
                      View Offers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {cpaNetworks.filter(n => !n.supportsProducts).length === 0 && (
              <Card className="border-blue-500/20">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">MyLead will appear here for CPA tracking.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {networks.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No affiliate networks available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
