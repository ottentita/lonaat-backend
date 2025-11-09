import { useState, useEffect } from 'react';
import { GlassCard } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FadeIn, Stagger, StaggerItem } from './ui/motion';
import { Globe, Check, X, Loader } from 'lucide-react';
import api from '../services/api';

export default function NetworksCard() {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNetworks();
  }, []);

  const fetchNetworks = async () => {
    try {
      const response = await api.get('/networks/list');
      setNetworks(response.data.networks || []);
    } catch (error) {
      console.error('Failed to fetch networks:', error);
    } finally {
      setLoading(false);
    }
  };

  const topNetworks = [
    { id: 'amazon', name: 'Amazon Associates', status: 'demo', category: 'E-Commerce' },
    { id: 'clickbank', name: 'ClickBank', status: 'active', category: 'Digital Products' },
    { id: 'cj', name: 'CJ Affiliate', status: 'demo', category: 'SaaS' },
    { id: 'shareasale', name: 'ShareASale', status: 'demo', category: 'Multi-Category' },
    { id: 'impact', name: 'Impact', status: 'demo', category: 'SaaS' },
    { id: 'rakuten', name: 'Rakuten', status: 'demo', category: 'E-Commerce' },
  ];

  return (
    <FadeIn>
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Connected Networks</h2>
              <p className="text-sm text-muted-foreground">21 networks available</p>
            </div>
          </div>
          <Button size="sm" className="shadow-glow">
            Connect Network
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Stagger className="space-y-3">
            {topNetworks.map((network, index) => (
              <StaggerItem key={network.id}>
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    {network.status === 'active' ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <div className="font-medium">{network.name}</div>
                      <div className="text-sm text-muted-foreground">{network.category}</div>
                    </div>
                  </div>
                  <Badge variant={network.status === 'active' ? 'success' : 'glass'}>
                    {network.status === 'active' ? 'Active' : 'Demo Mode'}
                  </Badge>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}

        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Networks</span>
            <span className="font-bold text-primary">21</span>
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}
