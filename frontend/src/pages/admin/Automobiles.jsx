import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/currency' 

export default function AdminAutomobiles() {
  const [automobiles, setAutomobiles] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, sold: 0, pending: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const token = localStorage.getItem('access_token') || localStorage.getItem('token');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
      const [autosRes, statsRes] = await Promise.all([
        fetch(`${BASE}/api/automobiles?status=${filter}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE}/api/automobiles/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const autosData = await autosRes.json();
      const statsData = await statsRes.json();
      
      setAutomobiles(autosData.automobiles || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
      const response = await fetch(`${BASE}/api/automobiles/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast.success(`Status updated to ${status}`);
        loadData();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const deleteAuto = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
      const response = await fetch(`${BASE}/api/automobiles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Listing deleted');
        loadData();
      }
    } catch (error) {
      toast.error('Failed to delete listing');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      sold: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || 'bg-gray-100'}`}>
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Automobiles</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.sold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${stats.revenue?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vehicle Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {automobiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No vehicle listings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Vehicle</th>
                    <th className="text-left p-2">Seller</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Views</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {automobiles.map((auto) => (
                    <tr key={auto.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{auto.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {[auto.brand, auto.model, auto.year].filter(Boolean).join(' ')}
                          </p>
                        </div>
                      </td>
                      <td className="p-2">{auto.seller?.name || auto.seller?.email || 'N/A'}</td>
                      <td className="p-2">
                        {auto.price ? `${auto.currency} ${Number(auto.price).toLocaleString()}` : '-'}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${auto.listing_type === 'affiliate' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'}`}>
                          {auto.listing_type}
                        </span>
                      </td>
                      <td className="p-2">{getStatusBadge(auto.status)}</td>
                      <td className="p-2">{auto.views}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {auto.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(auto.id, 'approved')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(auto.id, 'rejected')}>
                                Reject
                              </Button>
                            </>
                          )}
                          {auto.status === 'approved' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(auto.id, 'sold')}>
                              Mark Sold
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteAuto(auto.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
