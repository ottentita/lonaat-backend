import { useState, useEffect } from 'react';
import { walletAPI, productsAPI, adsAPI, commissionsAPI, affiliateAPI } from '@/services/api';

export const useDashboardSummary = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeCampaigns: 0,
    balance: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    availableBalance: 0,
    totalClicks: 0,
    totalLeads: 0,
    conversionRate: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [earningsHistory, setEarningsHistory] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [walletRes, productsRes, adsRes, commissionsRes, affiliateRes] = await Promise.all([
        walletAPI.getBalance().catch(() => ({ data: { balance: 0 } })),
        productsAPI.getAll().catch(() => ({ data: { products: [] } })),
        adsAPI.getStatus().catch(() => ({ data: { campaigns: [] } })),
        commissionsAPI.getMy().catch(() => ({ data: { commissions: [] } })),
        affiliateAPI.getStats().catch(() => ({ data: {} }))
      ]);

      const products = productsRes.data.products || [];
      const campaigns = adsRes.data.campaigns || [];
      const commissions = commissionsRes.data.commissions || [];
      
      const totalCommissions = commissions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
      const pendingCommissions = commissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

      const af = affiliateRes.data || {};

      // Build earnings history for chart (last 7 days mock data)
      const earningsData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          earnings: Math.floor(totalCommissions / 7) + Math.random() * 100,
          pending: Math.floor(pendingCommissions / 7) + Math.random() * 50
        };
      });

      setStats({
        totalProducts: products.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        balance: walletRes.data.balance || 0,
        totalEarnings: af.total_earnings || totalCommissions || 0,
        pendingEarnings: af.pending_earnings || pendingCommissions || 0,
        availableBalance: af.available_balance || walletRes.data.balance || 0,
        totalClicks: af.total_clicks || campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0),
        totalLeads: af.total_leads || 0,
        conversionRate: af.conversion_rate || 0
      });

      // Build recent activity
      const activity = [
        ...campaigns.slice(0, 2).map(c => ({
          type: 'campaign',
          title: `Campaign: ${c.product_name || 'Product'}`,
          description: `${c.clicks || 0} clicks • Level ${c.boost_level || 1}`,
          time: new Date(c.created_at).toLocaleDateString(),
        })),
        ...products.slice(0, 2).map(p => ({
          type: 'product',
          title: `Product: ${p.name || 'Unnamed'}`,
          description: `Added from ${p.network || 'manual'}`,
          time: new Date(p.created_at).toLocaleDateString(),
        })),
        ...commissions.slice(0, 1).map(c => ({
          type: 'commission',
          title: `Commission: $${parseFloat(c.amount || 0).toFixed(2)}`,
          description: `Status: ${c.status}`,
          time: new Date(c.created_at).toLocaleDateString(),
        }))
      ];

      setRecentActivity(activity);
      setEarningsHistory(earningsData);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    loading,
    error,
    stats,
    recentActivity,
    earningsHistory,
    refetch: fetchDashboardData
  };
};
