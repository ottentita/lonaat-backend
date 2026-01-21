import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import toast from 'react-hot-toast';

export default function Automobiles() {
  const [automobiles, setAutomobiles] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, sold: 0, pending: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '', brand: '', model: '', year: '', mileage: '',
    fuel_type: '', transmission: '', condition: '',
    price: '', currency: 'USD', location: '', description: ''
  });

  const token = localStorage.getItem('access_token') || localStorage.getItem('token');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [autosRes, statsRes] = await Promise.all([
        fetch('/api/automobiles?status=all', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/automobiles/stats', { headers: { Authorization: `Bearer ${token}` } })
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/automobiles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success('Vehicle listing created successfully');
        setShowAddDialog(false);
        setFormData({
          title: '', brand: '', model: '', year: '', mileage: '',
          fuel_type: '', transmission: '', condition: '',
          price: '', currency: 'USD', location: '', description: ''
        });
        loadData();
      } else {
        toast.error(data.error || 'Failed to create listing');
      }
    } catch (error) {
      toast.error('Failed to create listing');
    }
  };

  const markAsSold = async (id) => {
    try {
      const response = await fetch(`/api/automobiles/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'sold' })
      });
      
      if (response.ok) {
        toast.success('Marked as sold');
        loadData();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const deleteAuto = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      const response = await fetch(`/api/automobiles/${id}`, {
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
        <h1 className="text-2xl font-bold">Automobiles</h1>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>+ Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Vehicle Listing</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., 2020 Toyota Camry SE"
                    required
                  />
                </div>
                <div>
                  <Label>Brand</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., Toyota"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., Camry"
                  />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="e.g., 2020"
                  />
                </div>
                <div>
                  <Label>Mileage (km)</Label>
                  <Input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    placeholder="e.g., 50000"
                  />
                </div>
                <div>
                  <Label>Fuel Type</Label>
                  <Select value={formData.fuel_type} onValueChange={(v) => setFormData({ ...formData, fuel_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petrol">Petrol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="lpg">LPG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transmission</Label>
                  <Select value={formData.transmission} onValueChange={(v) => setFormData({ ...formData, transmission: v })}>
                    <SelectTrigger><SelectValue placeholder="Select transmission" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="cvt">CVT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                    <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="certified">Certified Pre-Owned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g., 25000"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="XAF">XAF</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Douala, Cameroon"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the vehicle..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button type="submit">Create Listing</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sold Vehicles</CardTitle>
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
          <CardTitle>My Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          {automobiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No vehicle listings yet. Click "Add Vehicle" to create one.</p>
          ) : (
            <div className="space-y-4">
              {automobiles.map((auto) => (
                <div key={auto.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{auto.title}</h3>
                      {getStatusBadge(auto.status)}
                      {auto.listing_type === 'affiliate' && (
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">Affiliate</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[auto.brand, auto.model, auto.year].filter(Boolean).join(' ')} 
                      {auto.mileage && ` | ${auto.mileage.toLocaleString()} km`}
                    </p>
                    <p className="text-sm font-medium mt-1">
                      {auto.price ? `${auto.currency} ${Number(auto.price).toLocaleString()}` : 'Price on request'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-sm text-muted-foreground">{auto.views} views</span>
                    {auto.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => markAsSold(auto.id)}>Mark Sold</Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => deleteAuto(auto.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
