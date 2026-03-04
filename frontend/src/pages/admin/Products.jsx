import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/products');
      const data = response.data;
      setProducts(data.products || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSync = async () => {
    try {
      setSyncing(true);
      const response = await adminAPI.aiBulkImport({ networks: ['digistore24', 'awin', 'partnerstack'] });
      toast.success(response.data.message || 'Bulk sync completed');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateAds = async () => {
    try {
      setSyncing(true);
      const response = await adminAPI.aiGenerateAds({ limit: 10 });
      toast.success(response.data.message || 'Ads generated');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate ads');
    } finally {
      setSyncing(false);
    }
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Products Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleBulkSync} disabled={syncing}>
            {syncing ? 'Processing...' : 'Bulk Sync All Networks'}
          </Button>
          <Button variant="outline" onClick={handleGenerateAds} disabled={syncing}>
            Generate AI Ads
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="text-2xl font-bold">{stats?.total || products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">With AI Ads</p>
            <p className="text-2xl font-bold text-green-600">{stats?.with_ads || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active Boosts</p>
            <p className="text-2xl font-bold text-blue-600">{stats?.boosted || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="pt-4">
            <p className="text-sm opacity-90">Admin Access</p>
            <p className="text-lg font-bold">UNLIMITED FREE</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No products yet. Use Bulk Sync to import from affiliate networks.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {products.slice(0, 20).map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.source} | {product.category || 'Uncategorized'}
                      </p>
                      {product.price && (
                        <p className="font-medium text-primary mt-1">{product.price}</p>
                      )}
                      {product.ai_ad && (
                        <p className="text-xs text-green-600 mt-1">✓ AI Ad Generated</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {product.is_boosted && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Boosted</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
