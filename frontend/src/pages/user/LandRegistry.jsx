import { useState, useEffect } from 'react';
import { landRegistryAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';
import { MapPin, Search, Plus, CheckCircle, AlertTriangle, Clock, FileText, Users, ChevronRight, Map, X, Navigation, History, MapPinned, Shield, Layers } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CAMEROON_CENTER = [7.3697, 12.3547];
const CAMEROON_BOUNDS = [[1.65, 8.5], [13.1, 16.2]];

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 12);
    }
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export default function LandRegistry() {
  const [activeTab, setActiveTab] = useState('map');
  const [lands, setLands] = useState([]);
  const [mapLands, setMapLands] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('title');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedLand, setSelectedLand] = useState(null);
  const [detailsTab, setDetailsTab] = useState('info');
  const [neighbors, setNeighbors] = useState([]);
  const [mapCenter, setMapCenter] = useState(CAMEROON_CENTER);
  const [mapZoom, setMapZoom] = useState(6);
  const [isAddingCoords, _setIsAddingCoords] = useState(false);
  const [newCoords, setNewCoords] = useState([]);
  const [blockedCount, setBlockedCount] = useState(0);
  const [gpsSearchLat, setGpsSearchLat] = useState('');
  const [gpsSearchLng, setGpsSearchLng] = useState('');

  useEffect(() => {
    loadData();
    loadMapData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [landsRes, statsRes] = await Promise.all([
        landRegistryAPI.getLands({ limit: 100 }),
        landRegistryAPI.getStats()
      ]);
      setLands(landsRes.data.lands || []);
      setStats(statsRes.data);
      setBlockedCount(landsRes.data.lands?.filter(l => l.status === 'blocked' || l.status === 'disputed').length || 0);
    } catch (error) {
      console.error('Error loading land data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMapData = async () => {
    try {
      const res = await landRegistryAPI.getMapData();
      setMapLands(res.data.lands || []);
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && searchType !== 'gps') {
      toast.error('Enter search query');
      return;
    }

    try {
      let params = {};
      if (searchType === 'title') params.title = searchQuery;
      else if (searchType === 'owner') params.owner = searchQuery;
      else if (searchType === 'region') params.region = searchQuery;
      else if (searchType === 'town') params.town = searchQuery;
      
      const res = await landRegistryAPI.searchLands(params);
      setSearchResults(res.data.lands || []);
      toast.success(`Found ${res.data.lands?.length || 0} results`);
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const handleGPSSearch = async () => {
    const lat = parseFloat(gpsSearchLat);
    const lng = parseFloat(gpsSearchLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Enter valid GPS coordinates');
      return;
    }

    try {
      const res = await landRegistryAPI.searchByLocation(lat, lng, 5);
      setSearchResults(res.data.lands || []);
      setMapCenter([lat, lng]);
      setMapZoom(14);
      toast.success(`Found ${res.data.lands?.length || 0} nearby lands`);
    } catch (error) {
      toast.error('GPS search failed');
    }
  };

  const viewLandDetails = async (landId) => {
    try {
      const res = await landRegistryAPI.getLand(landId);
      setSelectedLand(res.data);
      setDetailsTab('info');
      
      if (res.data.center_lat && res.data.center_lng) {
        setMapCenter([Number(res.data.center_lat), Number(res.data.center_lng)]);
        setMapZoom(15);
      }
      
      try {
        const neighborsRes = await landRegistryAPI.getNeighbors(landId);
        setNeighbors(neighborsRes.data.neighbors || []);
      } catch (_e) {
        setNeighbors([]);
      }
    } catch (error) {
      toast.error('Failed to load land details');
    }
  };

  const handleMapClick = (latlng) => {
    if (isAddingCoords) {
      setNewCoords(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
      toast.success(`Point added: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
    }
  };

  const getPolygonColor = (status) => {
    switch (status) {
      case 'verified': return '#22c55e';
      case 'pending': return '#eab308';
      case 'disputed': return '#ef4444';
      case 'blocked': return '#dc2626';
      case 'rejected': return '#6b7280';
      default: return '#3b82f6';
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
      verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      disputed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
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
    <div className="h-screen flex flex-col bg-background">
      <div className="p-4 border-b bg-card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              GPS Land Registry - Cameroon
            </h1>
            <p className="text-muted-foreground text-sm">Verify land ownership and prevent double sales with GPS verification</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { loadData(); loadMapData(); }}>
              Refresh
            </Button>
            <Button onClick={() => setActiveTab('register')}>
              <Plus className="w-4 h-4 mr-2" /> Register Land
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 flex items-center gap-3">
              <Map className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Lands</p>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.verified}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.disputed}</p>
                <p className="text-xs text-muted-foreground">Disputed</p>
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{blockedCount}</p>
                <p className="text-xs text-muted-foreground">Duplicate Blocks</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r bg-card flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="flex gap-1 mb-3">
              {['map', 'list', 'register'].map(tab => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="flex-1"
                >
                  {tab === 'map' && <Layers className="w-4 h-4" />}
                  {tab === 'list' && <FileText className="w-4 h-4" />}
                  {tab === 'register' && <Plus className="w-4 h-4" />}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full border rounded-md p-2 text-sm bg-background"
              >
                <option value="title">By Title Number</option>
                <option value="owner">By Owner Name</option>
                <option value="region">By Region</option>
                <option value="town">By Town</option>
                <option value="gps">By GPS Coordinates</option>
              </select>

              {searchType === 'gps' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={gpsSearchLat}
                    onChange={(e) => setGpsSearchLat(e.target.value)}
                    placeholder="Latitude (e.g., 3.8480)"
                    className="w-full border rounded-md p-2 text-sm bg-background"
                  />
                  <input
                    type="text"
                    value={gpsSearchLng}
                    onChange={(e) => setGpsSearchLng(e.target.value)}
                    placeholder="Longitude (e.g., 11.5021)"
                    className="w-full border rounded-md p-2 text-sm bg-background"
                  />
                  <Button size="sm" className="w-full" onClick={handleGPSSearch}>
                    <Navigation className="w-4 h-4 mr-2" /> Search Nearby
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 border rounded-md p-2 text-sm bg-background"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button size="sm" onClick={handleSearch}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {searchResults ? (
              <div>
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-sm font-medium">Results ({searchResults.length})</span>
                  <Button variant="ghost" size="sm" onClick={() => setSearchResults(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {searchResults.map(land => (
                  <LandListItem 
                    key={land.id} 
                    land={land} 
                    onClick={() => viewLandDetails(land.id)}
                    isSelected={selectedLand?.id === land.id}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium mb-2 px-1">All Lands ({lands.length})</p>
                {lands.map(land => (
                  <LandListItem 
                    key={land.id} 
                    land={land} 
                    onClick={() => viewLandDetails(land.id)}
                    isSelected={selectedLand?.id === land.id}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          <MapContainer
            center={CAMEROON_CENTER}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
            maxBounds={CAMEROON_BOUNDS}
            minZoom={5}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapController center={mapCenter} zoom={mapZoom} />
            <MapClickHandler onMapClick={handleMapClick} />

            {mapLands.map(land => {
              if (!land.polygon?.coordinates?.[0]) return null;
              const positions = land.polygon.coordinates[0].map(coord => [coord[1], coord[0]]);
              return (
                <Polygon
                  key={land.id}
                  positions={positions}
                  pathOptions={{
                    color: getPolygonColor(land.status),
                    fillColor: getPolygonColor(land.status),
                    fillOpacity: selectedLand?.id === land.id ? 0.6 : 0.3,
                    weight: selectedLand?.id === land.id ? 3 : 2
                  }}
                  eventHandlers={{
                    click: () => viewLandDetails(land.id)
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{land.title_number}</p>
                      <p>Owner: {land.owner_name}</p>
                      <p>Status: {land.status}</p>
                      {land.area_sqm && <p>Area: {land.area_sqm.toLocaleString()} sqm</p>}
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {isAddingCoords && newCoords.map((coord, i) => (
              <Marker key={i} position={[coord.lat, coord.lng]}>
                <Popup>Point {i + 1}: {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}</Popup>
              </Marker>
            ))}

            {selectedLand?.center_lat && selectedLand?.center_lng && (
              <Marker position={[Number(selectedLand.center_lat), Number(selectedLand.center_lng)]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{selectedLand.title_number}</p>
                    <p>{selectedLand.current_owner}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          <div className="absolute bottom-4 left-4 bg-card rounded-lg shadow-lg p-3 z-[1000]">
            <p className="text-xs font-medium mb-2">Legend</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{backgroundColor: '#22c55e'}}></span> Verified</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{backgroundColor: '#eab308'}}></span> Pending</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{backgroundColor: '#ef4444'}}></span> Disputed</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{backgroundColor: '#3b82f6'}}></span> Active</span>
            </div>
          </div>
        </div>

        {selectedLand && (
          <div className="w-96 border-l bg-card flex flex-col overflow-hidden">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-bold">Land Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLand(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex border-b">
              {[
                { id: 'info', icon: FileText, label: 'Info' },
                { id: 'neighbors', icon: Users, label: 'Neighbors' },
                { id: 'history', icon: History, label: 'History' },
                { id: 'location', icon: MapPinned, label: 'Location' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDetailsTab(tab.id)}
                  className={`flex-1 p-2 text-xs flex flex-col items-center gap-1 ${
                    detailsTab === tab.id ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {detailsTab === 'info' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-lg font-bold">{selectedLand.title_number}</p>
                      <p className="text-muted-foreground">{selectedLand.current_owner}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedLand.status)}`}>
                      {selectedLand.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Region</p>
                      <p className="font-medium">{selectedLand.region}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">City</p>
                      <p className="font-medium">{selectedLand.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Town</p>
                      <p className="font-medium">{selectedLand.town || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Neighborhood</p>
                      <p className="font-medium">{selectedLand.neighborhood || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Area</p>
                      <p className="font-medium">{selectedLand.area_sqm ? `${Number(selectedLand.area_sqm).toLocaleString()} sqm` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Land Use</p>
                      <p className="font-medium capitalize">{selectedLand.land_use || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Purchase Price</p>
                      <p className="font-medium">{formatPrice(selectedLand.purchase_price, selectedLand.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Purchase Date</p>
                      <p className="font-medium">{formatDate(selectedLand.purchase_date)}</p>
                    </div>
                  </div>

                  {selectedLand.documents && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-2">Documents</p>
                      <div className="space-y-1">
                        {(Array.isArray(selectedLand.documents) ? selectedLand.documents : []).map((doc, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                            <FileText className="w-4 h-4" />
                            <span>{doc.name || doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detailsTab === 'neighbors' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Neighboring lands within 1km radius
                  </p>
                  {neighbors.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No neighboring lands found</p>
                  ) : (
                    neighbors.map(n => (
                      <div key={n.id} className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer" onClick={() => viewLandDetails(n.id)}>
                        <p className="font-mono text-sm font-bold">{n.title_number}</p>
                        <p className="text-sm text-muted-foreground">{n.current_owner}</p>
                        <div className="flex justify-between mt-1 text-xs">
                          <span>{n.region}</span>
                          <span className={`px-2 py-0.5 rounded ${getStatusBadge(n.status)}`}>{n.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailsTab === 'history' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Ownership & transaction history</p>
                  {selectedLand.ownership_history?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedLand.ownership_history.map((h, i) => (
                        <div key={i} className="border-l-2 border-primary pl-3 py-2">
                          <p className="font-medium">{h.owner_name}</p>
                          <p className="text-xs text-muted-foreground">{h.transaction_type} - {formatDate(h.transaction_date)}</p>
                          {h.price && <p className="text-sm">{formatPrice(h.price)}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No history available</p>
                  )}
                </div>
              )}

              {detailsTab === 'location' && (
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">GPS Center Point</p>
                    <p className="font-mono text-sm">
                      {selectedLand.center_lat ? `${Number(selectedLand.center_lat).toFixed(6)}, ${Number(selectedLand.center_lng).toFixed(6)}` : 'N/A'}
                    </p>
                  </div>
                  
                  {selectedLand.polygon_coords && (
                    <div>
                      <p className="text-sm font-medium mb-2">Boundary Coordinates</p>
                      <div className="bg-muted rounded-lg p-2 max-h-48 overflow-y-auto">
                        {(Array.isArray(selectedLand.polygon_coords) ? selectedLand.polygon_coords : []).map((c, i) => (
                          <p key={i} className="font-mono text-xs py-1 border-b last:border-0">
                            Point {i + 1}: {c.lat?.toFixed(6)}, {c.lng?.toFixed(6)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      if (selectedLand.center_lat && selectedLand.center_lng) {
                        setMapCenter([Number(selectedLand.center_lat), Number(selectedLand.center_lng)]);
                        setMapZoom(17);
                      }
                    }}
                  >
                    <Navigation className="w-4 h-4 mr-2" /> Center on Map
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LandListItem({ land, onClick, isSelected, getStatusBadge }) {
  return (
    <div 
      className={`p-2 rounded-lg cursor-pointer mb-1 border ${
        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted border-transparent'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-medium truncate">{land.title_number}</p>
          <p className="text-xs text-muted-foreground truncate">{land.current_owner}</p>
          <p className="text-xs text-muted-foreground">{land.region}{land.city ? `, ${land.city}` : ''}</p>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[10px] ${getStatusBadge(land.status)}`}>
          {land.status}
        </span>
      </div>
    </div>
  );
}
