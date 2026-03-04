import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, Marker, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { formatNumber } from '../../lib/currency';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_URL = import.meta.env.VITE_API_URL || '';

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 10);
    }
  }, [center, zoom, map]);
  return null;
}

const statusColors = {
  submitted: '#f59e0b',
  pending: '#f59e0b',
  under_review: '#3b82f6',
  verified: '#10b981',
  approved: '#059669',
  rejected: '#ef4444',
  locked: '#6b7280'
};

const getStatus = (land) => land.verification_status || land.status || 'submitted';

export default function AdminLandRegistry() {
  const [lands, setLands] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLand, setSelectedLand] = useState(null);
  const [filter, setFilter] = useState('all');
  const [mapCenter, setMapCenter] = useState([7.3697, 12.3547]);
  const [mapZoom, setMapZoom] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsTab, setDetailsTab] = useState('info');
  const [history, setHistory] = useState([]);
  const [neighbors, setNeighbors] = useState([]);
  const [sections, setSections] = useState([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSection, setNewSection] = useState({ section_name: '', section_type: 'sitting', area_sqm: '', description: '', capacity: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    auto_verify_threshold: 1000,
    require_gps_for_registration: true,
    allow_self_registration: true,
    min_area_sqm: 100,
    max_area_sqm: 100000,
    default_currency: 'XAF',
    verification_expiry_days: 365,
    require_documents: true,
    notify_on_verification: true,
    allow_transfer_requests: true
  });

  const fetchLands = useCallback(async () => {
    try {
      const response = await api.get('/land-registry', {
        params: filter !== 'all' ? { status: filter } : {}
      });
      const data = response.data;
      setLands(data.lands || []);
    } catch (error) {
      console.error('Error fetching lands:', error);
      toast.error('Failed to load lands');
    }
  }, [filter]);

  const fetchMapData = useCallback(async () => {
    try {
      const response = await api.get('/land-registry/map');
      const data = response.data;
      setMapData(data.lands || []);
    } catch (error) {
      console.error('Error fetching map data:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/land-registry/stats/overview');
      const data = response.data;
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchHistory = async (landId) => {
    try {
      const response = await api.get(`/land-registry/${landId}/history`);
      const data = response.data;
      setHistory(data.history || data.auditLog || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    }
  };

  const fetchNeighbors = async (landId) => {
    try {
      const response = await api.get(`/land-registry/${landId}/neighbors`);
      const data = response.data;
      setNeighbors(data.neighbors || []);
    } catch (error) {
      console.error('Error fetching neighbors:', error);
      setNeighbors([]);
    }
  };

  const fetchSections = async (landId) => {
    try {
      const response = await api.get(`/land-registry/${landId}/sections`);
      const data = response.data;
      setSections(data.sections || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
    }
  };

  const handleAddSection = async () => {
    if (!selectedLand || !newSection.section_name) {
      toast.error('Section name is required');
      return;
    }
    try {
      const { data } = await api.post(`/land-registry/${selectedLand.id}/sections`, newSection);
      if (!data) throw new Error('Add section failed');
      toast.success('Section added successfully');
      setNewSection({ section_name: '', section_type: 'sitting', area_sqm: '', description: '', capacity: '' });
      setShowAddSection(false);
      fetchSections(selectedLand.id);
    } catch (error) {
      toast.error(error.message || 'Failed to add section');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      await api.delete(`/land-registry/${selectedLand.id}/sections/${sectionId}`);
      toast.success('Section deleted');
      fetchSections(selectedLand.id);
    } catch (error) {
      toast.error('Failed to delete section');
    }
  };

  const sectionTypes = ['sitting', 'building', 'agricultural', 'parking', 'garden', 'storage', 'recreational', 'commercial', 'residential', 'other'];
  const sectionColors = {
    sitting: '#10b981',
    building: '#3b82f6',
    agricultural: '#84cc16',
    parking: '#6b7280',
    garden: '#22c55e',
    storage: '#f59e0b',
    recreational: '#a855f7',
    commercial: '#ef4444',
    residential: '#06b6d4',
    other: '#64748b'
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLands(), fetchMapData(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchLands, fetchMapData, fetchStats]);

  const handleVerifyAction = async (landId, action, notes = '') => {
    try {
      const { data } = await api.post(`/land-registry/${landId}/verify-authority`, { action, notes });
      if (!data) {
        throw new Error('Action failed');
      }
      
      toast.success(`Land ${action}d successfully`);
      fetchLands();
      fetchMapData();
      fetchStats();
      setSelectedLand(null);
    } catch (error) {
      toast.error(error.message || `Failed to ${action} land`);
    }
  };

  const handleVerifyIntegrity = async (landId) => {
    try {
      const { data } = await api.get(`/land-registry/${landId}/verify-integrity`);
      
      if (data.integrity_check?.tampered) {
        toast.error('TAMPERING DETECTED: Land record has been modified!');
      } else if (data.hashes_match) {
        toast.success('Land record integrity verified - No tampering detected');
      } else {
        toast.warning('No hash stored for this land');
      }
    } catch (error) {
      toast.error('Failed to verify integrity');
    }
  };

  const getPolygonCoords = (land) => {
    if (land.polygon && land.polygon.coordinates) {
      return land.polygon.coordinates[0].map(coord => [coord[1], coord[0]]);
    }
    return [];
  };

  const focusOnLand = (land) => {
    if (land.center_lat && land.center_lng) {
      setMapCenter([parseFloat(land.center_lat), parseFloat(land.center_lng)]);
      setMapZoom(15);
    }
    setSelectedLand(land);
    setDetailsTab('info');
    fetchHistory(land.id);
    fetchNeighbors(land.id);
    fetchSections(land.id);
  };

  const filteredLands = lands.filter(land => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      land.title_number?.toLowerCase().includes(query) ||
      land.current_owner?.toLowerCase().includes(query) ||
      land.region?.toLowerCase().includes(query) ||
      land.town?.toLowerCase().includes(query) ||
      land.city?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Land Registry Management</h1>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search owner, title, region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button 
            variant="outline" 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            Settings
          </Button>
        </div>
      </div>

      {showSettings && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">Land Registry Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Registration Settings</h4>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.require_gps_for_registration}
                    onChange={(e) => setSettings({...settings, require_gps_for_registration: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Require GPS coordinates for registration</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.allow_self_registration}
                    onChange={(e) => setSettings({...settings, allow_self_registration: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Allow self-registration by users</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.require_documents}
                    onChange={(e) => setSettings({...settings, require_documents: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Require document uploads</span>
                </label>
                <div>
                  <label className="text-sm text-gray-600">Default Currency</label>
                  <select
                    value={settings.default_currency}
                    onChange={(e) => setSettings({...settings, default_currency: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded text-sm"
                  >
                    <option value="XAF">XAF (CFA Franc)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Area Limits</h4>
                <div>
                  <label className="text-sm text-gray-600">Minimum Area (m²)</label>
                  <input
                    type="number"
                    value={settings.min_area_sqm}
                    onChange={(e) => setSettings({...settings, min_area_sqm: parseInt(e.target.value) || 0})}
                    className="w-full mt-1 px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Maximum Area (m²)</label>
                  <input
                    type="number"
                    value={settings.max_area_sqm}
                    onChange={(e) => setSettings({...settings, max_area_sqm: parseInt(e.target.value) || 0})}
                    className="w-full mt-1 px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Auto-Verify Below (m²)</label>
                  <input
                    type="number"
                    value={settings.auto_verify_threshold}
                    onChange={(e) => setSettings({...settings, auto_verify_threshold: parseInt(e.target.value) || 0})}
                    className="w-full mt-1 px-3 py-2 border rounded text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lands below this area can be auto-verified</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Verification Settings</h4>
                <div>
                  <label className="text-sm text-gray-600">Verification Expiry (days)</label>
                  <input
                    type="number"
                    value={settings.verification_expiry_days}
                    onChange={(e) => setSettings({...settings, verification_expiry_days: parseInt(e.target.value) || 0})}
                    className="w-full mt-1 px-3 py-2 border rounded text-sm"
                  />
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notify_on_verification}
                    onChange={(e) => setSettings({...settings, notify_on_verification: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Notify owner on verification status change</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.allow_transfer_requests}
                    onChange={(e) => setSettings({...settings, allow_transfer_requests: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Allow ownership transfer requests</span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
              <Button onClick={() => { toast.success('Settings saved'); setShowSettings(false); }}>
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-sm text-gray-500">Total Lands</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-sm text-gray-500">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
              <p className="text-sm text-gray-500">Verified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.disputed}</div>
              <p className="text-sm text-gray-500">Disputed</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Cameroon Land Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '500px', borderRadius: '8px', overflow: 'hidden' }}>
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                >
                  <MapUpdater center={mapCenter} zoom={mapZoom} />
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {mapData.map((land) => {
                    const coords = getPolygonCoords(land);
                    if (coords.length === 0) return null;
                    
                    return (
                      <Polygon
                        key={land.id}
                        positions={coords}
                        pathOptions={{
                          color: statusColors[getStatus(land)] || '#3b82f6',
                          fillColor: statusColors[getStatus(land)] || '#3b82f6',
                          fillOpacity: 0.4,
                          weight: 2
                        }}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-bold">{land.title_number}</h3>
                            <p className="text-sm">{land.owner_name}</p>
                            <p className="text-xs text-gray-500">{land.region}, {land.town}</p>
                            <p className="text-xs">Area: {formatNumber(land.area_sqm)} m²</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                              getStatus(land) === 'approved' ? 'bg-green-100 text-green-800' :
                              getStatus(land) === 'verified' ? 'bg-blue-100 text-blue-800' :
                              getStatus(land) === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {getStatus(land)}
                            </span>
                          </div>
                        </Popup>
                      </Polygon>
                    );
                  })}
                  {selectedLand && selectedLand.center_lat && (
                    <Marker position={[parseFloat(selectedLand.center_lat), parseFloat(selectedLand.center_lng)]}>
                      <Popup>
                        <strong>{selectedLand.title_number}</strong>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Land Details</CardTitle>
              {selectedLand && (
                <div className="flex gap-1 mt-2 border-b">
                  {['info', 'sections', 'history', 'neighbors'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setDetailsTab(tab)}
                      className={`px-3 py-1.5 text-sm font-medium capitalize ${
                        detailsTab === tab 
                          ? 'border-b-2 border-blue-600 text-blue-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {selectedLand ? (
                <div className="space-y-4">
                  {detailsTab === 'info' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Title Number</label>
                        <p className="font-bold">{selectedLand.title_number}</p>
                      </div>
                      {selectedLand.land_name && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Land Name</label>
                          <p>{selectedLand.land_name}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Owner</label>
                        <p>{selectedLand.current_owner}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p>{selectedLand.region}, {selectedLand.city || selectedLand.town}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Area</label>
                        <p>{formatNumber(selectedLand.area_sqm)} m²</p>
                      </div>
                      <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${
                      selectedLand.verification_status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedLand.verification_status === 'verified' ? 'bg-blue-100 text-blue-800' :
                      selectedLand.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedLand.verification_status || selectedLand.status}
                    </span>
                  </div>
                  {selectedLand.land_hash && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Blockchain Hash</label>
                      <p className="text-xs font-mono break-all bg-gray-100 p-2 rounded">
                        {selectedLand.land_hash}
                      </p>
                    </div>
                  )}
                  
                  <div className="pt-4 space-y-2 border-t">
                    <h4 className="font-semibold">Authority Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedLand.verification_status === 'submitted' || selectedLand.status === 'submitted' || selectedLand.status === 'pending') && (
                        <Button
                          size="sm"
                          onClick={() => handleVerifyAction(selectedLand.id, 'verify')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Verify
                        </Button>
                      )}
                      {(selectedLand.verification_status === 'verified' || selectedLand.status === 'verified') && (
                        <Button
                          size="sm"
                          onClick={() => handleVerifyAction(selectedLand.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                      )}
                      {selectedLand.verification_status !== 'rejected' && selectedLand.status !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const reason = prompt('Reason for rejection:');
                            if (reason) handleVerifyAction(selectedLand.id, 'reject', reason);
                          }}
                        >
                          Reject
                        </Button>
                      )}
                      {!selectedLand.is_locked && selectedLand.verification_status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const reason = prompt('Reason for locking:');
                            if (reason) handleVerifyAction(selectedLand.id, 'lock', reason);
                          }}
                        >
                          Lock
                        </Button>
                      )}
                    </div>
                    <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerifyIntegrity(selectedLand.id)}
                          className="w-full mt-2"
                        >
                          Verify Integrity (Hash Check)
                        </Button>
                      </div>
                    </>
                  )}

                  {detailsTab === 'sections' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Land Sections ({sections.length})</span>
                        <Button size="sm" onClick={() => setShowAddSection(!showAddSection)}>
                          {showAddSection ? 'Cancel' : '+ Add Section'}
                        </Button>
                      </div>

                      {showAddSection && (
                        <div className="p-3 bg-gray-50 rounded space-y-2">
                          <input
                            type="text"
                            placeholder="Section Name (e.g., Main Sitting Area)"
                            value={newSection.section_name}
                            onChange={(e) => setNewSection({...newSection, section_name: e.target.value})}
                            className="w-full px-3 py-2 border rounded text-sm"
                          />
                          <select
                            value={newSection.section_type}
                            onChange={(e) => setNewSection({...newSection, section_type: e.target.value})}
                            className="w-full px-3 py-2 border rounded text-sm"
                          >
                            {sectionTypes.map(type => (
                              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                            ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Area (m²)"
                              value={newSection.area_sqm}
                              onChange={(e) => setNewSection({...newSection, area_sqm: e.target.value})}
                              className="px-3 py-2 border rounded text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Capacity"
                              value={newSection.capacity}
                              onChange={(e) => setNewSection({...newSection, capacity: e.target.value})}
                              className="px-3 py-2 border rounded text-sm"
                            />
                          </div>
                          <textarea
                            placeholder="Description"
                            value={newSection.description}
                            onChange={(e) => setNewSection({...newSection, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded text-sm"
                            rows={2}
                          />
                          <Button size="sm" onClick={handleAddSection} className="w-full bg-green-600 hover:bg-green-700">
                            Save Section
                          </Button>
                        </div>
                      )}

                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {sections.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">No sections defined</p>
                        ) : (
                          sections.map((section) => (
                            <div 
                              key={section.id} 
                              className="p-3 border rounded"
                              style={{ borderLeftColor: sectionColors[section.section_type] || '#64748b', borderLeftWidth: '4px' }}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-sm">{section.section_name}</p>
                                  <span 
                                    className="inline-block px-2 py-0.5 text-xs rounded capitalize mt-1"
                                    style={{ backgroundColor: `${sectionColors[section.section_type]}20`, color: sectionColors[section.section_type] }}
                                  >
                                    {section.section_type}
                                  </span>
                                </div>
                                <button 
                                  onClick={() => handleDeleteSection(section.id)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                              {section.area_sqm && (
                                <p className="text-xs text-gray-500 mt-1">Area: {formatNumber(parseFloat(section.area_sqm))} m²</p>
                              )}
                              {section.capacity && (
                                <p className="text-xs text-gray-500">Capacity: {section.capacity} people</p>
                              )}
                              {section.description && (
                                <p className="text-xs text-gray-600 mt-1">{section.description}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {detailsTab === 'history' && (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {history.length === 0 ? (
                        <p className="text-gray-500 text-sm">No history available</p>
                      ) : (
                        history.map((entry, idx) => (
                          <div key={idx} className="border-l-2 border-blue-400 pl-3 py-1">
                            <p className="font-medium text-sm">{entry.action || entry.description}</p>
                            <p className="text-xs text-gray-500">
                              {entry.actor_name && `By: ${entry.actor_name} | `}
                              {new Date(entry.created_at || entry.timestamp).toLocaleString()}
                            </p>
                            {entry.notes && <p className="text-xs text-gray-600 mt-1">{entry.notes}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailsTab === 'neighbors' && (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {neighbors.length === 0 ? (
                        <p className="text-gray-500 text-sm">No neighboring lands found</p>
                      ) : (
                        neighbors.map((neighbor, idx) => (
                          <div 
                            key={idx} 
                            className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                            onClick={() => focusOnLand(neighbor)}
                          >
                            <p className="font-medium text-sm">{neighbor.title_number}</p>
                            <p className="text-xs text-gray-600">{neighbor.current_owner || neighbor.owner_name}</p>
                            <p className="text-xs text-gray-500">{neighbor.region}, {neighbor.town}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                              getStatus(neighbor) === 'approved' ? 'bg-green-100 text-green-800' :
                              getStatus(neighbor) === 'verified' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {getStatus(neighbor)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a land from the list to view details
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Land Registry Records ({filteredLands.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Title Number</th>
                    <th className="text-left p-3">Owner</th>
                    <th className="text-left p-3">Region</th>
                    <th className="text-left p-3">Town</th>
                    <th className="text-left p-3">Area (m²)</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLands.map((land) => (
                    <tr
                      key={land.id}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${
                        selectedLand?.id === land.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => focusOnLand(land)}
                    >
                      <td className="p-3 font-mono text-sm">{land.title_number}</td>
                      <td className="p-3">{land.current_owner}</td>
                      <td className="p-3">{land.region}</td>
                      <td className="p-3">{land.town || land.city || '-'}</td>
                      <td className="p-3">{formatNumber(land.area_sqm) || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          land.verification_status === 'approved' || land.status === 'approved' ? 'bg-green-100 text-green-800' :
                          land.verification_status === 'verified' || land.status === 'verified' ? 'bg-blue-100 text-blue-800' :
                          land.verification_status === 'rejected' || land.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {land.verification_status || land.status}
                        </span>
                        {land.is_locked && (
                          <span className="ml-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Locked</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            focusOnLand(land);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lands.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No lands found with the selected filter
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {stats?.by_region && (
        <Card>
          <CardHeader>
            <CardTitle>Lands by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.by_region.map((item) => (
                <div key={item.region} className="p-3 bg-gray-50 rounded-lg text-center">
                  <div className="text-lg font-bold">{item.count}</div>
                  <div className="text-sm text-gray-600">{item.region}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
