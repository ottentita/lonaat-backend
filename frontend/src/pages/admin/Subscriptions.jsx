import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/subscriptions?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (subId) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${subId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        toast.success('Subscription approved');
        loadData();
      }
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
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
      <h1 className="text-2xl font-bold">Subscriptions Management</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Subscriptions</p>
            <p className="text-2xl font-bold">{stats?.total || subscriptions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold">${(stats?.revenue || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b">
        {['all', 'active', 'pending', 'expired'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 font-medium capitalize ${filter === status ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {subscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No subscriptions found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {subscriptions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{sub.user_name || sub.user_email}</h3>
                      <p className="text-sm text-muted-foreground">
                        Plan: {sub.plan_name} | ${sub.amount?.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(sub.created_at).toLocaleDateString()} - {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(sub.status)}
                      {sub.status === 'pending' && (
                        <Button size="sm" onClick={() => handleApprove(sub.id)}>
                          Approve
                        </Button>
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
