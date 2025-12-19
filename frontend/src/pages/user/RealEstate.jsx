import { useState, useEffect, useRef } from 'react';
import { realEstateAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function RealEstate() {
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [regions, setRegions] = useState([]);
  const [listingFees, setListingFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: 'house',
    transaction_type: 'sale',
    region: 'Littoral',
    city: 'Douala',
    location: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    area_sqft: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [propsRes, statsRes, typesRes, feesRes] = await Promise.all([
        realEstateAPI.getMyProperties(),
        realEstateAPI.getPropertyStats(),
        realEstateAPI.getPropertyTypes(),
        realEstateAPI.getListingFees(),
      ]);
      setProperties(propsRes.data.properties || []);
      setStats(statsRes.data);
      setPropertyTypes(typesRes.data.types || []);
      setTransactionTypes(typesRes.data.transaction_types || []);
      setCities(typesRes.data.cities || []);
      setRegions(typesRes.data.regions || []);
      setListingFees(feesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getListingFee = () => {
    if (!listingFees?.listing_fees) return 0;
    const fees = listingFees.listing_fees[formData.property_type] || listingFees.listing_fees.house;
    return fees[formData.transaction_type] || fees.sale || 0;
  };

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    try {
      const response = await realEstateAPI.createProperty({
        ...formData,
        price: parseFloat(formData.price) || null,
        bedrooms: parseInt(formData.bedrooms) || null,
        bathrooms: parseInt(formData.bathrooms) || null,
        area_sqft: parseFloat(formData.area_sqft) || null,
      });
      toast.success(response.data.message);
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        property_type: 'house',
        transaction_type: 'sale',
        region: 'Littoral',
        city: 'Douala',
        location: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        area_sqft: '',
      });
      loadData();
      
      if (response.data.requires_payment) {
        setShowPaymentForm(response.data.property.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create property');
    }
  };

  const handlePaymentUpload = async (propertyId) => {
    const file = fileInputRef.current?.files[0];
    if (!file) {
      toast.error('Please select a receipt file');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('receipt', file);
      
      const response = await realEstateAPI.payListingFee(propertyId, formData);
      toast.success(response.data.message);
      setShowPaymentForm(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload receipt');
    } finally {
      setUploading(false);
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

  const handleDeleteProperty = async (propertyId) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    
    try {
      await realEstateAPI.deleteProperty(propertyId);
      toast.success('Property deleted');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete property');
    }
  };

  const getStatusBadge = (status, isPaid) => {
    if (status === 'pending' && !isPaid) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Awaiting Payment
        </span>
      );
    }
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Real Estate</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
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
            {listingFees && (
              <p className="text-sm text-muted-foreground">
                Listing Fee: <span className="font-bold text-primary">{formatPrice(getListingFee())}</span>
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
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
                  <label className="block text-sm font-medium mb-1">Property Type *</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    {propertyTypes.map((type) => (
                      <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Transaction Type *</label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    {transactionTypes.map((type) => (
                      <option key={type} value={type}>{type.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Region</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    {regions.map((region) => (
                      <option key={region} value={region}>{region}</option>
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
                <label className="block text-sm font-medium mb-1">Address/Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background"
                  placeholder="e.g., Bonanjo, Rue de la Paix"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (XAF) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Area (sqft)</label>
                  <input
                    type="number"
                    value={formData.area_sqft}
                    onChange={(e) => setFormData({ ...formData, area_sqft: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              {listingFees && (
                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">Bank Transfer Details</h4>
                  <p className="text-sm">Bank: {listingFees.bank_details?.bank_name}</p>
                  <p className="text-sm">Account: {listingFees.bank_details?.account_number}</p>
                  <p className="text-sm">Name: {listingFees.bank_details?.account_name}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    After creating your listing, upload your payment receipt for approval.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full">Create Property</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showPaymentForm && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Upload Payment Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please upload your bank transfer receipt to complete the listing process.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".jpg,.jpeg,.png,.pdf"
                className="w-full p-2 border rounded-md bg-background"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => handlePaymentUpload(showPaymentForm)}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Receipt'}
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentForm(null)}>
                  Later
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">My Properties</h2>
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
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{property.title}</h3>
                        {getStatusBadge(property.status, property.is_paid)}
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {property.transaction_type}
                        </span>
                        {property.is_featured && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {property.property_type?.replace('_', ' ')} | {property.city}, {property.region}
                      </p>
                      <p className="font-medium text-primary">
                        {formatPrice(property.price, property.currency)}
                        {property.transaction_type === 'rent' && '/month'}
                      </p>
                      {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {property.bedrooms && `${property.bedrooms} bed`}
                          {property.bathrooms && ` | ${property.bathrooms} bath`}
                          {property.area_sqft && ` | ${property.area_sqft} sqft`}
                        </p>
                      )}
                      {property.listing_fee > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Listing fee: {formatPrice(property.listing_fee)}
                          {property.is_paid ? ' (Paid)' : ' (Unpaid)'}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {!property.is_paid && property.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => setShowPaymentForm(property.id)}
                        >
                          Pay Fee
                        </Button>
                      )}
                      {property.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBoostProperty(property.id)}
                        >
                          Boost
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteProperty(property.id)}
                      >
                        Delete
                      </Button>
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
