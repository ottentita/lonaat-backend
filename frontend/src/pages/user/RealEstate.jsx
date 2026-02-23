import { useState, useEffect, useRef } from 'react';
import { realEstateAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';
import { Home, Building, MapPin, Store, Hotel, Key, Plus, Eye, Upload, X, Phone, Mail, MessageCircle, FileText, Camera, Video, CheckCircle } from 'lucide-react';
import { formatCurrency, parseNumericInput } from '../../lib/currency';

const PROPERTY_ICONS = {
  house: Home,
  apartment: Building,
  land: MapPin,
  commercial: Store,
  guest_house: Hotel,
  rental: Key
};

export default function RealEstate() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPropertyType, setSelectedPropertyType] = useState(null);
  const [properties, setProperties] = useState([]);
  const [marketplace, setMarketplace] = useState([]);
  const [typesInfo, setTypesInfo] = useState(null);
  const [listingFees, setListingFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [propsRes, marketRes, typesRes, feesRes] = await Promise.all([
        realEstateAPI.getMyProperties(),
        realEstateAPI.getMarketplace(),
        realEstateAPI.getTypesInfo(),
        realEstateAPI.getListingFees(),
      ]);
      setProperties(propsRes.data.properties || []);
      setMarketplace(marketRes.data.properties || []);
      setTypesInfo(typesRes.data);
      setListingFees(feesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: properties.length,
    approved: properties.filter(p => p.status === 'approved').length,
    pending: properties.filter(p => p.status === 'pending').length,
    views: properties.reduce((sum, p) => sum + (p.views_count || 0), 0)
  };

  const formatPrice = (price, currency = 'XAF') => {
    if (price === null || price === undefined || price === '') return 'Contact for price'
    return formatCurrency(price, currency || 'XAF')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Real Estate</h1>
          <p className="text-muted-foreground">List and manage your properties</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {['dashboard', 'list-property', 'my-listings', 'marketplace'].map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => { setActiveTab(tab); setSelectedPropertyType(null); }}
          >
            {tab === 'dashboard' && 'Dashboard'}
            {tab === 'list-property' && <><Plus className="w-4 h-4 mr-1" /> List Property</>}
            {tab === 'my-listings' && 'My Listings'}
            {tab === 'marketplace' && <><Eye className="w-4 h-4 mr-1" /> Marketplace</>}
          </Button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <DashboardView 
          stats={stats} 
          properties={properties} 
          typesInfo={typesInfo}
          onListProperty={() => setActiveTab('list-property')}
          formatPrice={formatPrice}
        />
      )}

      {activeTab === 'list-property' && !selectedPropertyType && (
        <PropertyTypeSelector 
          typesInfo={typesInfo}
          onSelect={(type) => setSelectedPropertyType(type)}
        />
      )}

      {activeTab === 'list-property' && selectedPropertyType && (
        <PropertyListingForm
          propertyType={selectedPropertyType}
          typesInfo={typesInfo}
          listingFees={listingFees}
          onBack={() => setSelectedPropertyType(null)}
          onSuccess={(property) => {
            loadData();
            if (property.requires_payment) {
              setShowPaymentForm(property.property.id);
            }
            setActiveTab('my-listings');
          }}
        />
      )}

      {activeTab === 'my-listings' && (
        <MyListingsView
          properties={properties}
          formatPrice={formatPrice}
          onPayFee={(id) => setShowPaymentForm(id)}
          onViewDetails={(property) => setSelectedProperty(property)}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'marketplace' && (
        <MarketplaceView
          properties={marketplace}
          formatPrice={formatPrice}
          onViewDetails={(property) => setSelectedProperty(property)}
        />
      )}

      {showPaymentForm && (
        <PaymentModal
          propertyId={showPaymentForm}
          listingFees={listingFees}
          properties={properties}
          fileInputRef={fileInputRef}
          onClose={() => setShowPaymentForm(null)}
          onSuccess={() => { setShowPaymentForm(null); loadData(); }}
        />
      )}

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          formatPrice={formatPrice}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}

function DashboardView({ stats, properties, typesInfo, onListProperty, formatPrice }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Listings</p>
            <p className="text-2xl font-bold">{stats.total}</p>
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
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Views</p>
            <p className="text-2xl font-bold text-blue-600">{stats.views}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {typesInfo?.property_types?.map(type => {
              const Icon = PROPERTY_ICONS[type.id] || Home;
              return (
                <button
                  key={type.id}
                  onClick={onListProperty}
                  className="p-4 border rounded-lg hover:bg-primary/10 hover:border-primary transition-colors text-center"
                >
                  <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">{type.label}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {properties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties.slice(0, 5).map(property => (
                <div key={property.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{property.title}</p>
                    <p className="text-sm text-muted-foreground">{property.city}, {property.region}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">{formatPrice(property.price)}</p>
                    <StatusBadge status={property.status} isPaid={property.is_paid} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PropertyTypeSelector({ typesInfo, onSelect }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold">What would you like to list?</h2>
        <p className="text-muted-foreground">Select a property type to begin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {typesInfo?.property_types?.map(type => {
          const Icon = PROPERTY_ICONS[type.id] || Home;
          return (
            <Card
              key={type.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelect(type)}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{type.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {type.id === 'house' && 'Villas, duplexes, standalone houses'}
                  {type.id === 'apartment' && 'Flats, studios, condos'}
                  {type.id === 'land' && 'Plots, empty land, agricultural'}
                  {type.id === 'commercial' && 'Shops, offices, warehouses'}
                  {type.id === 'guest_house' && 'Hotels, guest houses, lodges'}
                  {type.id === 'rental' && 'Short-term, vacation rentals'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PropertyListingForm({ propertyType, typesInfo, listingFees, onBack, onSuccess }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: propertyType.id,
    transaction_type: 'sale',
    price: '',
    price_negotiable: true,
    region: 'Littoral',
    city: 'Douala',
    neighborhood: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    area_sqft: '',
    land_size_sqft: '',
    floors: '',
    parking_spaces: '',
    year_built: '',
    furnishing: '',
    condition: '',
    amenities: [],
    images: [],
    videos: [],
    documents: [],
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    owner_whatsapp: '',
    owner_id_type: '',
    owner_id_number: ''
  });

  const Icon = PROPERTY_ICONS[propertyType.id] || Home;
  const showField = (field) => propertyType.fields?.includes(field);
  
  const getListingFee = () => {
    if (!listingFees?.listing_fees) return 0;
    const fees = listingFees.listing_fees[propertyType.id] || listingFees.listing_fees.house;
    return fees[formData.transaction_type] || fees.sale || 0;
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    
    setUploadingImages(true);
    try {
      const formDataUpload = new FormData();
      Array.from(files).forEach(f => formDataUpload.append('images', f));
      const res = await realEstateAPI.uploadImages(formDataUpload);
      setFormData(prev => ({ ...prev, images: [...prev.images, ...res.data.images] }));
      toast.success(`${res.data.images.length} image(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingVideo(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('video', file);
      const res = await realEstateAPI.uploadVideo(formDataUpload);
      setFormData(prev => ({ ...prev, videos: [...prev.videos, res.data.video] }));
      toast.success('Video uploaded');
    } catch (error) {
      toast.error('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDocUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    
    setUploadingDocs(true);
    try {
      const formDataUpload = new FormData();
      Array.from(files).forEach(f => formDataUpload.append('documents', f));
      const res = await realEstateAPI.uploadDocuments(formDataUpload);
      setFormData(prev => ({ ...prev, documents: [...prev.documents, ...res.data.documents] }));
      toast.success('Documents uploaded');
    } catch (error) {
      toast.error('Failed to upload documents');
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price) {
      toast.error('Title and price are required');
      return;
    }
    if (!formData.owner_phone && !formData.owner_email) {
      toast.error('At least one contact method is required');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await realEstateAPI.createProperty(formData);
      toast.success(response.data.message);
      onSuccess(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <div className="flex items-center gap-2">
          <Icon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">List {propertyType.label}</h2>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className={`flex-1 h-2 rounded ${step >= s ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-3 border rounded-lg bg-background"
                placeholder="e.g., Beautiful 4-Bedroom Villa in Bonanjo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Transaction Type *</label>
                <select
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                >
                  {typesInfo?.transaction_types?.map(t => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price (XAF) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder="e.g., 50000000"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="negotiable"
                checked={formData.price_negotiable}
                onChange={(e) => setFormData({ ...formData, price_negotiable: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="negotiable" className="text-sm">Price is negotiable</label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border rounded-lg bg-background"
                rows={4}
                placeholder="Describe your property in detail..."
              />
            </div>

            <Button onClick={() => setStep(2)} className="w-full">Continue to Location</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Location & Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Region</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                >
                  {typesInfo?.regions?.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                >
                  {typesInfo?.cities?.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Neighborhood</label>
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder="e.g., Bonanjo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Address</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder="e.g., Rue de la Paix, near City Hall"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {showField('bedrooms') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Bedrooms</label>
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-background"
                  />
                </div>
              )}
              {showField('bathrooms') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Bathrooms</label>
                  <input
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-background"
                  />
                </div>
              )}
              {showField('area_sqft') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Area (sqft)</label>
                  <input
                    type="number"
                    value={formData.area_sqft}
                    onChange={(e) => setFormData({ ...formData, area_sqft: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-background"
                  />
                </div>
              )}
              {showField('land_size_sqft') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Land Size (sqft)</label>
                  <input
                    type="number"
                    value={formData.land_size_sqft}
                    onChange={(e) => setFormData({ ...formData, land_size_sqft: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-background"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {showField('floors') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Floors</label>
                  <input
                    type="number"
                    value={formData.floors}
                    onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-background"
                  />
                </div>
              )}
              {showField('parking_spaces') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Parking Spaces</label>
                  <input
                    type="number"
                    value={formData.parking_spaces}
                    onChange={(e) => setFormData({ ...formData, parking_spaces: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-background"
                  />
                </div>
              )}
              {showField('year_built') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Year Built</label>
                  <input
                    type="number"
                    value={formData.year_built}
                    onChange={(e) => setFormData({ ...formData, year_built: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-background"
                    placeholder="e.g., 2020"
                  />
                </div>
              )}
              {showField('furnishing') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Furnishing</label>
                  <select
                    value={formData.furnishing}
                    onChange={(e) => setFormData({ ...formData, furnishing: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-background"
                  >
                    <option value="">Select...</option>
                    {typesInfo?.furnishing_options?.map(f => (
                      <option key={f} value={f}>{f.replace(/-/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {showField('condition') && (
              <div>
                <label className="block text-sm font-medium mb-1">Property Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                >
                  <option value="">Select condition...</option>
                  {typesInfo?.condition_options?.map(c => (
                    <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>
                  ))}
                </select>
              </div>
            )}

            {showField('amenities') && (
              <div>
                <label className="block text-sm font-medium mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {typesInfo?.amenities_list?.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        formData.amenities.includes(a)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1">Continue to Media</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos, Videos & Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Camera className="w-4 h-4 inline mr-1" /> Property Photos (up to 10)
              </label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploadingImages}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  {uploadingImages ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload images</p>
                    </>
                  )}
                </label>
              </div>
              {formData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded" />
                      <button
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          images: prev.images.filter((_, idx) => idx !== i)
                        }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Video className="w-4 h-4 inline mr-1" /> Property Video (optional)
              </label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                  id="video-upload"
                  disabled={uploadingVideo}
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  {uploadingVideo ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  ) : (
                    <>
                      <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload video</p>
                    </>
                  )}
                </label>
              </div>
              {formData.videos.length > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  {formData.videos.length} video(s) uploaded
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <FileText className="w-4 h-4 inline mr-1" /> Owner Documents (ID, land title, etc.)
              </label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocUpload}
                  className="hidden"
                  id="doc-upload"
                  disabled={uploadingDocs}
                />
                <label htmlFor="doc-upload" className="cursor-pointer">
                  {uploadingDocs ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  ) : (
                    <>
                      <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Upload documents (PDF, images)</p>
                    </>
                  )}
                </label>
              </div>
              {formData.documents.length > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  {formData.documents.length} document(s) uploaded
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1">Continue to Contact Info</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Contact & Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Phone className="w-4 h-4 inline mr-1" /> Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.owner_phone}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder="+237 6XX XXX XXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  <MessageCircle className="w-4 h-4 inline mr-1" /> WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.owner_whatsapp}
                  onChange={(e) => setFormData({ ...formData, owner_whatsapp: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder="+237 6XX XXX XXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Mail className="w-4 h-4 inline mr-1" /> Email
                </label>
                <input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Owner Name</label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder="Full name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID Type</label>
                <select
                  value={formData.owner_id_type}
                  onChange={(e) => setFormData({ ...formData, owner_id_type: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                >
                  <option value="">Select ID type...</option>
                  {typesInfo?.id_types?.map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID Number</label>
                <input
                  type="text"
                  value={formData.owner_id_number}
                  onChange={(e) => setFormData({ ...formData, owner_id_number: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder="ID number"
                />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Listing Fee</h4>
              <p className="text-2xl font-bold text-primary">{formatCurrency(getListingFee(), 'XAF')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Payment via bank transfer. Details will be shown after submission.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                {submitting ? 'Submitting...' : 'Submit Listing'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MyListingsView({ properties, formatPrice, onPayFee, onViewDetails, onRefresh }) {
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      await realEstateAPI.deleteProperty(id);
      toast.success('Property deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete property');
    }
  };

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Home className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Properties Yet</h3>
          <p className="text-muted-foreground">Start by listing your first property</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {properties.map(property => {
        const Icon = PROPERTY_ICONS[property.property_type] || Home;
        return (
          <Card key={property.id}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  {property.images?.length > 0 ? (
                    <img src={property.images[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Icon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{property.title}</h3>
                    <StatusBadge status={property.status} isPaid={property.is_paid} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {property.property_type?.replace('_', ' ')} | {property.city}, {property.region}
                  </p>
                  <p className="font-bold text-primary">{formatPrice(property.price)}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {property.bedrooms && <span>{property.bedrooms} bed</span>}
                    {property.bathrooms && <span>{property.bathrooms} bath</span>}
                    {property.area_sqft && <span>{property.area_sqft} sqft</span>}
                    <span>{property.views_count || 0} views</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => onViewDetails(property)}>
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                  {!property.is_paid && property.status === 'pending' && (
                    <Button size="sm" onClick={() => onPayFee(property.id)}>Pay Fee</Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(property.id)}>Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MarketplaceView({ properties, formatPrice, onViewDetails }) {
  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Properties Available</h3>
          <p className="text-muted-foreground">Check back later for new listings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {properties.map(property => {
        const Icon = PROPERTY_ICONS[property.property_type] || Home;
        return (
          <Card key={property.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => onViewDetails(property)}>
            <div className="h-48 bg-muted flex items-center justify-center">
              {property.images?.length > 0 ? (
                <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <Icon className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <CardContent className="p-4">
              <p className="font-bold text-lg text-primary mb-1">{formatPrice(property.price)}</p>
              <h3 className="font-medium mb-2">{property.title}</h3>
              <p className="text-sm text-muted-foreground">{property.city}, {property.region}</p>
              <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
                {property.bedrooms && <span>{property.bedrooms} bed</span>}
                {property.bathrooms && <span>{property.bathrooms} bath</span>}
                {property.area_sqft && <span>{property.area_sqft} sqft</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, isPaid }) {
  if (status === 'pending' && !isPaid) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Awaiting Payment</span>;
  }
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
}

function PaymentModal({ propertyId, listingFees, properties, fileInputRef, onClose, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const property = properties.find(p => p.id === propertyId);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files[0];
    if (!file) {
      toast.error('Please select a receipt file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      await realEstateAPI.payListingFee(propertyId, formData);
      toast.success('Payment receipt uploaded');
      onSuccess();
    } catch (error) {
      toast.error('Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Upload Payment Receipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm mb-2">Transfer to:</p>
            <p className="font-medium">{listingFees?.bank_details?.bank_name}</p>
            <p className="text-sm">Account: {listingFees?.bank_details?.account_number}</p>
            <p className="text-sm">Name: {listingFees?.bank_details?.account_name}</p>
            <p className="text-lg font-bold mt-2">{formatCurrency(Number(property?.listing_fee || 0), property?.currency || 'XAF')}</p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".jpg,.jpeg,.png,.pdf"
            className="w-full p-2 border rounded-lg"
          />

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading} className="flex-1">
              {uploading ? 'Uploading...' : 'Upload Receipt'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PropertyDetailModal({ property, formatPrice, onClose }) {
  const Icon = PROPERTY_ICONS[property.property_type] || Home;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {property.title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {property.images?.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {property.images.slice(0, 6).map((img, i) => (
                <img key={i} src={img} alt="" className="w-full h-24 object-cover rounded-lg" />
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-2xl font-bold text-primary">{formatPrice(property.price)}</p>
            {property.price_negotiable && <span className="text-sm text-muted-foreground">Negotiable</span>}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Type:</span> {property.property_type?.replace('_', ' ')}</div>
            <div><span className="text-muted-foreground">Transaction:</span> {property.transaction_type}</div>
            <div><span className="text-muted-foreground">Location:</span> {property.city}, {property.region}</div>
            {property.neighborhood && <div><span className="text-muted-foreground">Neighborhood:</span> {property.neighborhood}</div>}
            {property.bedrooms && <div><span className="text-muted-foreground">Bedrooms:</span> {property.bedrooms}</div>}
            {property.bathrooms && <div><span className="text-muted-foreground">Bathrooms:</span> {property.bathrooms}</div>}
            {property.area_sqft && <div><span className="text-muted-foreground">Area:</span> {property.area_sqft} sqft</div>}
            {property.floors && <div><span className="text-muted-foreground">Floors:</span> {property.floors}</div>}
            {property.parking_spaces && <div><span className="text-muted-foreground">Parking:</span> {property.parking_spaces} spaces</div>}
            {property.year_built && <div><span className="text-muted-foreground">Year Built:</span> {property.year_built}</div>}
            {property.furnishing && <div><span className="text-muted-foreground">Furnishing:</span> {property.furnishing}</div>}
            {property.condition && <div><span className="text-muted-foreground">Condition:</span> {property.condition}</div>}
          </div>

          {property.description && (
            <div>
              <h4 className="font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">{property.description}</p>
            </div>
          )}

          {property.amenities?.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((a, i) => (
                  <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{a}</span>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Contact</h4>
            <div className="space-y-1 text-sm">
              {property.owner_name && <p>Name: {property.owner_name}</p>}
              {property.owner_phone && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> {property.owner_phone}
                </p>
              )}
              {property.owner_whatsapp && (
                <p className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> {property.owner_whatsapp}
                </p>
              )}
              {property.owner_email && (
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {property.owner_email}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
