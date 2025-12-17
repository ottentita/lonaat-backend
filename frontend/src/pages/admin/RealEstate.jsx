import { useState, useEffect } from 'react';
import { realEstateAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function AdminRealEstate() {
  const [properties, setProperties] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadProperties();
  }, [filter]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await realEstateAPI.adminGetProperties({ status: filter });
      setProperties(response.data.properties || []);
      setPendingCount(response.data.pending_count || 0);
      setApprovedCount(response.data.approved_count || 0);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (propertyId, isFeatured = false) => {
    try {
      await realEstateAPI.adminApproveProperty(propertyId, { is_featured: isFeatured });
      toast.success('Property approved');
      loadProperties();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve property');
    }
  };

  const handleReject = async (propertyId) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    try {
      await realEstateAPI.adminRejectProperty(propertyId, { reason });
      toast.success('Property rejected');
      loadProperties();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject property');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const colors = {
      land: 'bg-amber-100 text-amber-800',
      house: 'bg-blue-100 text-blue-800',
      rental: 'bg-purple-100 text-purple-800',
      guest_house: 'bg-pink-100 text-pink-800',
      car_rental: 'bg-cyan-100 text-cyan-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100'}`}>
        {type.replace('_', ' ')}
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
      <h1 className="text-2xl font-bold">Real Estate Management</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Listings</p>
            <p className="text-2xl font-bold">{pendingCount + approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="pt-4">
            <p className="text-sm opacity-90">Admin Access</p>
            <p className="text-lg font-bold">UNLIMITED FREE</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 font-medium ${filter === 'pending' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 font-medium ${filter === 'approved' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 font-medium ${filter === 'rejected' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          Rejected
        </button>
      </div>

      <div className="space-y-4">
        {properties.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No properties with status: {filter}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {properties.map((property) => (
              <Card key={property.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{property.title}</h3>
                        {getStatusBadge(property.status)}
                        {getTypeBadge(property.property_type)}
                        {property.is_featured && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Owner: {property.owner_name}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {property.city}, {property.country}
                        {property.address && ` - ${property.address}`}
                      </p>
                      {property.price && (
                        <p className="font-medium text-primary">
                          {property.currency} {property.price?.toLocaleString()}
                          {property.price_type === 'per_month' ? '/month' : property.price_type === 'per_day' ? '/day' : ''}
                        </p>
                      )}
                      {property.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {property.description}
                        </p>
                      )}
                      {property.bedrooms && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {property.bedrooms} bed | {property.bathrooms} bath | {property.size_sqm} sqm
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {new Date(property.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {property.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(property.id, false)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(property.id, true)}
                          >
                            Approve + Feature
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(property.id)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {property.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(property.id)}
                        >
                          Revoke
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
