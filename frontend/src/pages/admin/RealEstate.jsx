import { useState, useEffect } from 'react';
import { realEstateAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function AdminRealEstate() {
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('properties');
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    if (activeTab === 'properties') {
      loadProperties();
    } else {
      loadPayments();
    }
  }, [filter, activeTab]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await realEstateAPI.adminGetProperties({ status: filter });
      setProperties(response.data.properties || []);
      setPendingCount(response.data.pending_count || 0);
      setApprovedCount(response.data.approved_count || 0);
      setRejectedCount(response.data.rejected_count || 0);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await realEstateAPI.adminGetPayments({ status: filter === 'all' ? undefined : filter });
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payments');
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

  const handleApprovePayment = async (paymentId) => {
    try {
      await realEstateAPI.adminApprovePayment(paymentId);
      toast.success('Payment approved - property is now live');
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve payment');
    }
  };

  const handleRejectPayment = async (paymentId) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    try {
      await realEstateAPI.adminRejectPayment(paymentId, { reason });
      toast.success('Payment rejected');
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject payment');
    }
  };

  const handleBoostProperty = async (propertyId) => {
    try {
      const response = await realEstateAPI.boostProperty(propertyId);
      toast.success(response.data.message);
      loadProperties();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to boost property');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      sold: 'bg-blue-100 text-blue-800',
      rented: 'bg-purple-100 text-purple-800',
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
      apartment: 'bg-indigo-100 text-indigo-800',
      commercial: 'bg-green-100 text-green-800',
      rental: 'bg-purple-100 text-purple-800',
      guest_house: 'bg-pink-100 text-pink-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100'}`}>
        {type?.replace('_', ' ')}
      </span>
    );
  };

  const formatPrice = (price, currency = 'XAF') => {
    if (!price) return 'N/A';
    return `${currency} ${Number(price).toLocaleString()}`;
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
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="pt-4">
            <p className="text-sm opacity-90">Admin Access</p>
            <p className="text-lg font-bold">UNLIMITED FREE</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('properties')}
          className={`px-4 py-2 font-medium ${activeTab === 'properties' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          Properties
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 font-medium ${activeTab === 'payments' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          Listing Payments
        </button>
      </div>

      {activeTab === 'properties' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {['pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === status 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
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
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {property.transaction_type}
                            </span>
                            {property.is_featured && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                                Featured
                              </span>
                            )}
                            {!property.is_paid && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Unpaid
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Owner ID: {property.user_id}
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            {property.city}, {property.region}
                            {property.location && ` - ${property.location}`}
                          </p>
                          <p className="font-medium text-primary">
                            {formatPrice(property.price, property.currency)}
                            {property.transaction_type === 'rent' && '/month'}
                          </p>
                          {property.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {property.description}
                            </p>
                          )}
                          {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {property.bedrooms && `${property.bedrooms} bed`}
                              {property.bathrooms && ` | ${property.bathrooms} bath`}
                              {property.area_sqft && ` | ${property.area_sqft} sqft`}
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
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBoostProperty(property.id)}
                              >
                                Boost FREE
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(property.id)}
                              >
                                Revoke
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'payments' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {['pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === status 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {payments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No payments with status: {filter}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              Payment #{payment.id}
                            </h3>
                            {getStatusBadge(payment.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Property: {payment.property?.title || `ID: ${payment.property_id}`}
                          </p>
                          <p className="text-sm text-muted-foreground mb-1">
                            Type: {payment.property?.property_type}
                          </p>
                          <p className="font-medium text-primary">
                            Amount: {formatPrice(payment.amount, payment.currency)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Method: {payment.payment_method}
                          </p>
                          {payment.receipt_url && (
                            <a 
                              href={payment.receipt_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary underline mt-2 block"
                            >
                              View Receipt
                            </a>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Submitted: {new Date(payment.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {payment.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprovePayment(payment.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectPayment(payment.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
