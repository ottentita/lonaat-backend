import { useState, useEffect } from 'react';
import { landRegistryAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';
import { MapPin, Search, Plus, CheckCircle, AlertTriangle, Clock, FileText, Users, ChevronRight, Map } from 'lucide-react';

export default function LandRegistry() {
  const [activeTab, setActiveTab] = useState('overview');
  const [lands, setLands] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('title');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedLand, setSelectedLand] = useState(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [landsRes, statsRes] = await Promise.all([
        landRegistryAPI.getLands({ limit: 50 }),
        landRegistryAPI.getStats()
      ]);
      setLands(landsRes.data.lands || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading land data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter search query');
      return;
    }

    try {
      const params = {};
      if (searchType === 'title') params.title = searchQuery;
      else if (searchType === 'owner') params.owner = searchQuery;
      
      const res = await landRegistryAPI.searchLands(params);
      setSearchResults(res.data.lands || []);
      toast.success(`Found ${res.data.lands?.length || 0} results`);
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const viewLandDetails = async (landId) => {
    try {
      const res = await landRegistryAPI.getLand(landId);
      setSelectedLand(res.data);
    } catch (error) {
      toast.error('Failed to load land details');
    }
  };

  const formatPrice = (price, currency = 'XAF') => {
    if (!price) return 'N/A';
    return `${currency} ${Number(price).toLocaleString()}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const styles = {
      verified: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      disputed: 'bg-red-100 text-red-800',
      rejected: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            GPS Land Registry
          </h1>
          <p className="text-muted-foreground">Verify land ownership and prevent double sales</p>
        </div>
        <Button onClick={() => setShowRegisterForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Register Land
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Map className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Lands</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.verified}</p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.disputed}</p>
                  <p className="text-sm text-muted-foreground">Disputed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {['overview', 'search', 'register'].map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && 'Land Records'}
            {tab === 'search' && <><Search className="w-4 h-4 mr-1" /> Search</>}
            {tab === 'register' && <><Plus className="w-4 h-4 mr-1" /> Register</>}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Lands</CardTitle>
            </CardHeader>
            <CardContent>
              {lands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No lands registered yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Title Number</th>
                        <th className="text-left p-3">Owner</th>
                        <th className="text-left p-3">Region</th>
                        <th className="text-left p-3">Area (sqm)</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lands.map(land => (
                        <tr key={land.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-mono">{land.title_number}</td>
                          <td className="p-3">{land.current_owner}</td>
                          <td className="p-3">{land.region}{land.city ? `, ${land.city}` : ''}</td>
                          <td className="p-3">{land.area_sqm ? Number(land.area_sqm).toLocaleString() : 'N/A'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(land.status)}`}>
                              {land.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm" onClick={() => viewLandDetails(land.id)}>
                              View <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {stats?.by_region && stats.by_region.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Lands by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {stats.by_region.map(r => (
                    <div key={r.region} className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xl font-bold">{r.count}</p>
                      <p className="text-sm text-muted-foreground">{r.region}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle>Search Land Registry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="border rounded-md p-2"
              >
                <option value="title">By Title Number</option>
                <option value="owner">By Owner Name/ID</option>
              </select>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchType === 'title' ? 'Enter title number...' : 'Enter owner name or ID...'}
                className="flex-1 border rounded-md p-2"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" /> Search
              </Button>
            </div>

            {searchResults && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Search Results ({searchResults.length})</h3>
                {searchResults.length === 0 ? (
                  <p className="text-muted-foreground">No lands found matching your search</p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map(land => (
                      <div key={land.id} className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer" onClick={() => viewLandDetails(land.id)}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{land.title_number}</p>
                            <p className="text-sm text-muted-foreground">Owner: {land.current_owner}</p>
                            <p className="text-sm text-muted-foreground">{land.region}{land.city ? `, ${land.city}` : ''}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(land.status)}`}>
                            {land.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'register' && (
        <RegisterLandForm onSuccess={() => { loadData(); setActiveTab('overview'); }} />
      )}

      {selectedLand && (
        <LandDetailsModal land={selectedLand} onClose={() => setSelectedLand(null)} />
      )}
    </div>
  );
}

function RegisterLandForm({ onSuccess }) {
  const [form, setForm] = useState({
    title_number: '',
    current_owner: '',
    owner_id_type: 'national_id',
    owner_id_number: '',
    region: '',
    city: '',
    town: '',
    neighborhood: '',
    land_use: 'residential',
    purchase_date: '',
    purchase_price: '',
    seller_name: '',
    seller_id_number: '',
    notes: '',
    polygon_coords: []
  });
  const [coordInput, setCoordInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const addCoordinate = () => {
    const match = coordInput.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      setForm(prev => ({
        ...prev,
        polygon_coords: [...prev.polygon_coords, { lat, lng }]
      }));
      setCoordInput('');
    } else {
      toast.error('Invalid format. Use: latitude, longitude');
    }
  };

  const removeCoordinate = (index) => {
    setForm(prev => ({
      ...prev,
      polygon_coords: prev.polygon_coords.filter((_, i) => i !== index)
    }));
  };

  const verifyBoundaries = async () => {
    if (form.polygon_coords.length < 3) {
      toast.error('Add at least 3 coordinates');
      return;
    }

    setVerifying(true);
    try {
      const res = await landRegistryAPI.verifyBoundaries(form.polygon_coords);
      setVerificationResult(res.data);
      if (res.data.valid) {
        toast.success('Boundaries verified - no conflicts');
      } else {
        toast.error('Conflicts detected');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.polygon_coords.length < 3) {
      toast.error('Add at least 3 boundary coordinates');
      return;
    }

    if (!verificationResult?.valid) {
      toast.error('Verify boundaries first');
      return;
    }

    setSubmitting(true);
    try {
      await landRegistryAPI.registerLand(form);
      toast.success('Land registered successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const regions = ['Adamawa', 'Centre', 'East', 'Far North', 'Littoral', 'North', 'Northwest', 'South', 'Southwest', 'West'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register New Land</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title Number *</label>
              <input
                type="text"
                value={form.title_number}
                onChange={(e) => setForm({...form, title_number: e.target.value})}
                className="w-full border rounded-md p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Owner Name *</label>
              <input
                type="text"
                value={form.current_owner}
                onChange={(e) => setForm({...form, current_owner: e.target.value})}
                className="w-full border rounded-md p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Owner ID Type</label>
              <select
                value={form.owner_id_type}
                onChange={(e) => setForm({...form, owner_id_type: e.target.value})}
                className="w-full border rounded-md p-2"
              >
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="driver_license">Driver's License</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Owner ID Number</label>
              <input
                type="text"
                value={form.owner_id_number}
                onChange={(e) => setForm({...form, owner_id_number: e.target.value})}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Region *</label>
              <select
                value={form.region}
                onChange={(e) => setForm({...form, region: e.target.value})}
                className="w-full border rounded-md p-2"
                required
              >
                <option value="">Select region</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({...form, city: e.target.value})}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Town</label>
              <input
                type="text"
                value={form.town}
                onChange={(e) => setForm({...form, town: e.target.value})}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Land Use</label>
              <select
                value={form.land_use}
                onChange={(e) => setForm({...form, land_use: e.target.value})}
                className="w-full border rounded-md p-2"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="agricultural">Agricultural</option>
                <option value="industrial">Industrial</option>
                <option value="mixed">Mixed Use</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm({...form, purchase_date: e.target.value})}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Price (XAF)</label>
              <input
                type="number"
                value={form.purchase_price}
                onChange={(e) => setForm({...form, purchase_price: e.target.value})}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Seller Name</label>
              <input
                type="text"
                value={form.seller_name}
                onChange={(e) => setForm({...form, seller_name: e.target.value})}
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Seller ID Number</label>
              <input
                type="text"
                value={form.seller_id_number}
                onChange={(e) => setForm({...form, seller_id_number: e.target.value})}
                className="w-full border rounded-md p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Boundary Coordinates *</label>
            <p className="text-xs text-muted-foreground mb-2">Add GPS coordinates for each corner of the land (minimum 3 points)</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={coordInput}
                onChange={(e) => setCoordInput(e.target.value)}
                placeholder="latitude, longitude (e.g., 3.8480, 11.5021)"
                className="flex-1 border rounded-md p-2"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCoordinate())}
              />
              <Button type="button" onClick={addCoordinate}>Add Point</Button>
            </div>
            {form.polygon_coords.length > 0 && (
              <div className="border rounded-md p-2 bg-muted">
                <p className="text-sm font-medium mb-2">Boundary Points ({form.polygon_coords.length})</p>
                <div className="flex flex-wrap gap-2">
                  {form.polygon_coords.map((coord, i) => (
                    <span key={i} className="bg-background px-2 py-1 rounded text-sm flex items-center gap-1">
                      {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
                      <button type="button" onClick={() => removeCoordinate(i)} className="text-red-500 hover:text-red-700">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {verificationResult && (
            <div className={`p-4 rounded-lg ${verificationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {verificationResult.valid ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <p className={verificationResult.valid ? 'text-green-800' : 'text-red-800'}>
                  {verificationResult.message}
                </p>
              </div>
              {verificationResult.conflicts?.length > 0 && (
                <div className="mt-2 space-y-2">
                  {verificationResult.conflicts.map(c => (
                    <div key={c.id} className="text-sm text-red-700">
                      Conflict: {c.title_number} - Owner: {c.current_owner}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={verifyBoundaries} disabled={verifying || form.polygon_coords.length < 3}>
              {verifying ? 'Verifying...' : 'Verify Boundaries'}
            </Button>
            <Button type="submit" disabled={submitting || !verificationResult?.valid}>
              {submitting ? 'Registering...' : 'Register Land'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LandDetailsModal({ land, onClose }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [land.land.id]);

  const loadHistory = async () => {
    try {
      const res = await landRegistryAPI.getHistory(land.land.id);
      setHistory(res.data);
    } catch (error) {
      console.error('Failed to load history');
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A';

  const getStatusBadge = (status) => {
    const styles = {
      verified: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      disputed: 'bg-red-100 text-red-800',
      active: 'bg-green-100 text-green-800',
      transferred: 'bg-blue-100 text-blue-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">Land Details</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">&times;</button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Title Number</p>
                <p className="font-mono font-semibold">{land.land.title_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(land.land.status)}`}>
                  {land.land.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Owner</p>
                <p className="font-semibold">{land.land.current_owner}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Owner ID</p>
                <p>{land.land.owner_id_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p>{land.land.region}{land.land.city ? `, ${land.land.city}` : ''}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Area</p>
                <p>{land.land.area_sqm ? `${Number(land.land.area_sqm).toLocaleString()} sqm` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Land Use</p>
                <p className="capitalize">{land.land.land_use || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purchase Date</p>
                <p>{formatDate(land.land.purchase_date)}</p>
              </div>
            </div>

            {land.neighbors?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Neighboring Lands ({land.neighbors.length})</h3>
                <div className="space-y-2">
                  {land.neighbors.map(n => (
                    <div key={n.id} className="border rounded p-2 text-sm">
                      <p><strong>{n.title_number}</strong> - {n.current_owner}</p>
                      <p className="text-muted-foreground">{n.region}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history?.ownership_history?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Ownership History
                </h3>
                <div className="space-y-2">
                  {history.ownership_history.map(o => (
                    <div key={o.id} className="border rounded p-3">
                      <div className="flex justify-between">
                        <p className="font-medium">{o.owner_name}</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(o.status)}`}>
                          {o.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Acquired: {formatDate(o.acquired_date)}
                        {o.acquired_price && ` | Price: XAF ${Number(o.acquired_price).toLocaleString()}`}
                      </p>
                      {o.seller_name && <p className="text-sm text-muted-foreground">From: {o.seller_name}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history?.audit_logs?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Audit Log
                </h3>
                <div className="space-y-1 text-sm">
                  {history.audit_logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex justify-between text-muted-foreground">
                      <span>{log.action} by {log.actor_name || 'System'}</span>
                      <span>{formatDate(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
