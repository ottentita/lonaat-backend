import { useState, useEffect } from 'react';
import { realEstateAnalyticsAPI } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { BarChart3, TrendingUp, Eye, Users, Building, MapPin, DollarSign, Activity } from 'lucide-react';

export default function RealEstateAnalytics() {
  const [overview, setOverview] = useState(null);
  const [, setRevenue] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [landAnalytics, setLandAnalytics] = useState(null);
  const [leadAnalytics, setLeadAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, revenueRes, perfRes, landRes, leadRes] = await Promise.all([
        realEstateAnalyticsAPI.getOverview(),
        realEstateAnalyticsAPI.getRevenue(period),
        realEstateAnalyticsAPI.getPerformance(),
        realEstateAnalyticsAPI.getLandAnalytics(),
        realEstateAnalyticsAPI.getLeadAnalytics(period)
      ]);
      setOverview(overviewRes.data);
      setRevenue(revenueRes.data);
      setPerformance(perfRes.data);
      setLandAnalytics(landRes.data);
      setLeadAnalytics(leadRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
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
            <BarChart3 className="w-6 h-6" />
            Real Estate Analytics
          </h1>
          <p className="text-muted-foreground">Track performance and insights</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map(p => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overview.total_properties}</p>
                  <p className="text-sm text-muted-foreground">Total Properties</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overview.active_listings}</p>
                  <p className="text-sm text-muted-foreground">Active Listings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(overview.total_views)}</p>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(overview.total_inquiries)}</p>
                  <p className="text-sm text-muted-foreground">Inquiries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {overview?.by_type && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Properties by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overview.by_type.map(t => (
                  <div key={t.type} className="flex items-center justify-between">
                    <span className="capitalize">{t.type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(t.count / overview.total_properties) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{t.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {overview?.by_status && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Properties by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {overview.by_status.map(s => (
                  <div key={s.status} className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold">{s.count}</p>
                    <p className="text-sm text-muted-foreground capitalize">{s.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {performance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" /> Top Viewed Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performance.top_viewed?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {performance.top_viewed?.slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.location}</p>
                        </div>
                      </div>
                      <span className="font-semibold">{formatNumber(p.views_count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Highest Conversion Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performance.conversion_rates?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {performance.conversion_rates?.slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">{i + 1}</span>
                        <p className="font-medium text-sm line-clamp-1">{p.title}</p>
                      </div>
                      <span className="font-semibold text-green-600">{p.rate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {landAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Land Registry Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{landAnalytics.total_lands}</p>
                <p className="text-sm text-muted-foreground">Total Lands</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{landAnalytics.verified}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{landAnalytics.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{landAnalytics.disputed}</p>
                <p className="text-sm text-muted-foreground">Disputed</p>
              </div>
            </div>

            {landAnalytics.by_region?.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Lands by Region</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {landAnalytics.by_region.map(r => (
                    <div key={r.region} className="text-center p-2 border rounded-lg">
                      <p className="font-bold">{r.count}</p>
                      <p className="text-xs text-muted-foreground">{r.region}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {leadAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> Lead Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{leadAnalytics.total_leads}</p>
                <p className="text-sm text-muted-foreground">Total Leads</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{leadAnalytics.new_leads}</p>
                <p className="text-sm text-muted-foreground">New</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{leadAnalytics.conversion_rate}%</p>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{leadAnalytics.avg_response_hours}h</p>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {leadAnalytics.by_priority?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Leads by Priority</h4>
                  <div className="space-y-2">
                    {leadAnalytics.by_priority.map(p => (
                      <div key={p.priority} className="flex items-center justify-between">
                        <span className="capitalize">{p.priority}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${p.priority === 'high' ? 'bg-red-500' : p.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`}
                              style={{ width: `${(p.count / leadAnalytics.total_leads) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{p.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {leadAnalytics.by_status?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Leads by Status</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {leadAnalytics.by_status.map(s => (
                      <div key={s.status} className="text-center p-2 border rounded">
                        <p className="font-bold">{s.count}</p>
                        <p className="text-xs text-muted-foreground capitalize">{s.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
