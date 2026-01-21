import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, Marker, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

  const getToken = () => localStorage.getItem('token');

  const fetchLands = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`${API_URL}/api/land-registry${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setLands(data.lands || []);
    } catch (error) {
      console.error('Error fetching lands:', error);
      toast.error('Failed to load lands');
    }
  }, [filter]);

  const fetchMapData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/land-registry/map`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setMapData(data.lands || []);
    } catch (error) {
      console.error('Error fetching map data:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/land-registry/stats/overview`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

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
      const response = await fetch(`${API_URL}/api/land-registry/${landId}/verify-authority`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ action, notes })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
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
      const response = await fetch(`${API_URL}/api/land-registry/${landId}/verify-integrity`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await response.json();
      
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
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Land Registry Management</h1>
        <div className="flex gap-2">
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
        </div>
      </div>

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
                            <p className="text-xs">Area: {land.area_sqm?.toLocaleString()} m²</p>
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
            </CardHeader>
            <CardContent>
              {selectedLand ? (
                <div className="space-y-4">
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
                    <p>{selectedLand.area_sqm?.toLocaleString()} m²</p>
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
          <CardTitle>Land Registry Records ({lands.length})</CardTitle>
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
                  {lands.map((land) => (
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
                      <td className="p-3">{land.area_sqm?.toLocaleString() || '-'}</td>
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
