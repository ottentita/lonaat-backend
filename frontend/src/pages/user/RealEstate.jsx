import { useState, useEffect } from 'react';
import { realEstateAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function RealEstate() {
  const [properties, setProperties] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('properties');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: 'house',
    city: 'Douala',
    address: '',
    price: '',
    price_type: 'fixed',
    bedrooms: '',
    bathrooms: '',
    size_sqm: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [propsRes, statsRes, typesRes, bookingsRes] = await Promise.all([
        realEstateAPI.getMyProperties(),
        realEstateAPI.getPropertyStats(),
        realEstateAPI.getPropertyTypes(),
        realEstateAPI.getMyBookings('owner'),
      ]);
      setProperties(propsRes.data.properties || []);
      setStats(statsRes.data);
      setPropertyTypes(typesRes.data.types || []);
      setCities(typesRes.data.cities || []);
      setMyBookings(bookingsRes.data.bookings || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    try {
      const response = await realEstateAPI.createProperty({
        ...formData,
        price: parseFloat(formData.price) || null,
        bedrooms: parseInt(formData.bedrooms) || null,
        bathrooms: parseInt(formData.bathrooms) || null,
        size_sqm: parseFloat(formData.size_sqm) || null,
      });
      toast.success(response.data.message);
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        property_type: 'house',
        city: 'Douala',
        address: '',
        price: '',
        price_type: 'fixed',
        bedrooms: '',
        bathrooms: '',
        size_sqm: '',
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create property');
    }
  };

  const handleBoostProperty = async (propertyId) => {
    try {
      const response = await realEstateAPI.boostProperty(propertyId);
      toast.success(response.data.message);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to boost property');
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    try {
      await realEstateAPI.confirmBooking(bookingId);
      toast.success('Booking confirmed');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to confirm booking');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Real Estate</h1>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={!stats?.can_add_property}
        >
          {showCreateForm ? 'Cancel' : '+ Add Property'}
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">My Properties</p>
              <p className="text-2xl font-bold">{stats.total_properties}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending_approval}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Limit</p>
              <p className="text-2xl font-bold">{stats.current_count}/{stats.max_allowed}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Property Listing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    {propertyTypes.map((type) => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    {cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (XAF)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price Type</label>
                  <select
                    value={formData.price_type}
                    onChange={(e) => setFormData({ ...formData, price_type: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="negotiable">Negotiable</option>
                    <option value="per_day">Per Day</option>
                    <option value="per_month">Per Month</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bedrooms</label>
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bathrooms</label>
                  <input
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Size (sqm)</label>
                  <input
                    type="number"
                    value={formData.size_sqm}
                    onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">Create Property</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('properties')}
          className={`px-4 py-2 font-medium ${activeTab === 'properties' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          My Properties
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 font-medium ${activeTab === 'bookings' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          Booking Requests
        </button>
      </div>

      {activeTab === 'properties' && (
        <div className="space-y-4">
          {properties.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No properties yet. Create your first listing!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {properties.map((property) => (
                <Card key={property.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{property.title}</h3>
                          {getStatusBadge(property.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {property.property_type.replace('_', ' ')} | {property.city}, {property.country}
                        </p>
                        {property.price && (
                          <p className="font-medium text-primary">
                            {property.currency} {property.price?.toLocaleString()} {property.price_type === 'per_month' ? '/month' : property.price_type === 'per_day' ? '/day' : ''}
                          </p>
                        )}
                        {property.bedrooms && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {property.bedrooms} bed | {property.bathrooms} bath | {property.size_sqm} sqm
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {property.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBoostProperty(property.id)}
                          >
                            Boost
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
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {myBookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No booking requests yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{booking.property_title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Guest: {booking.tenant_name} | {booking.guests} guest(s)
                        </p>
                        <p className="text-sm">
                          {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                        </p>
                        <p className="font-medium mt-1">
                          Total: {booking.currency} {booking.total_price?.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status)}
                        {booking.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmBooking(booking.id)}
                          >
                            Confirm
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
      )}
    </div>
  );
}
