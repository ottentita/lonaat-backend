import { useState, useEffect } from 'react';
import { affiliateAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function AffiliateNetworks() {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);

  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const response = await fetch('/api/affiliate/networks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setNetworks(data.networks || []);
    } catch (error) {
      console.error('Error loading networks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (networkId) => {
    try {
      setSyncing(networkId);
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const response = await fetch(`/api/affiliate/sync/${networkId}`, {
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
        Browse and sync products from your connected affiliate networks. Products synced here will appear in your My Products section.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {networks.map((network) => (
          <Card key={network.id} className="hover:border-primary/50 transition-colors">
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
                <span className={`text-xs px-2 py-1 rounded-full ${network.configured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {network.configured ? 'Connected' : 'Demo Mode'}
                </span>
                <Button
                  size="sm"
                  onClick={() => handleSync(network.id)}
                  disabled={syncing === network.id}
                >
                  {syncing === network.id ? 'Syncing...' : 'Sync Products'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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
