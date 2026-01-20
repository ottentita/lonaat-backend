import { useState, useEffect } from 'react';
import { leadsAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';
import { Users, Phone, Mail, MessageSquare, Star, Clock, CheckCircle, XCircle, ChevronRight, AlertCircle } from 'lucide-react';

export default function PropertyLeads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') params.status = filter;

      const [leadsRes, statsRes] = await Promise.all([
        leadsAPI.getLeads(params),
        leadsAPI.getStats()
      ]);
      setLeads(leadsRes.data.leads || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    try {
      await leadsAPI.updateStatus(leadId, { status });
      toast.success('Lead updated');
      loadData();
      setSelectedLead(null);
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const updatePriority = async (leadId, priority) => {
    try {
      await leadsAPI.updatePriority(leadId, priority);
      toast.success('Priority updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update priority');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const now = new Date();
    const diffHours = Math.floor((now - d) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[priority] || styles.medium;
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      negotiating: 'bg-purple-100 text-purple-800',
      converted: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      spam: 'bg-red-100 text-red-800'
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
            <Users className="w-6 h-6" />
            Incoming Leads
          </h1>
          <p className="text-muted-foreground">Manage inquiries and offers for your properties</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
              <p className="text-sm text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.contacted}</p>
              <p className="text-sm text-muted-foreground">Contacted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.converted}</p>
              <p className="text-sm text-muted-foreground">Converted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.high_priority}</p>
              <p className="text-sm text-muted-foreground">High Priority</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['all', 'new', 'contacted', 'negotiating', 'converted', 'closed'].map(s => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads ({leads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leads found
                </div>
              ) : (
                <div className="space-y-3">
                  {leads.map(lead => (
                    <div
                      key={lead.id}
                      className={`border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedLead?.id === lead.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityBadge(lead.priority)}`}>
                              {lead.priority}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadge(lead.status)}`}>
                              {lead.status}
                            </span>
                          </div>
                          <h3 className="font-semibold mt-1">{lead.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">{lead.message || 'No message'}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>}
                            {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{formatDate(lead.created_at)}</p>
                          {lead.offer_amount && (
                            <p className="font-semibold text-green-600">
                              {lead.currency} {Number(lead.offer_amount).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {selectedLead ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Lead Details
                  <button onClick={() => setSelectedLead(null)} className="text-muted-foreground hover:text-foreground">&times;</button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">{selectedLead.name}</p>
                </div>
                {selectedLead.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
                  </div>
                )}
                {selectedLead.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">{selectedLead.phone}</a>
                  </div>
                )}
                {selectedLead.whatsapp && (
                  <div>
                    <p className="text-sm text-muted-foreground">WhatsApp</p>
                    <a href={`https://wa.me/${selectedLead.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">{selectedLead.whatsapp}</a>
                  </div>
                )}
                {selectedLead.message && (
                  <div>
                    <p className="text-sm text-muted-foreground">Message</p>
                    <p className="text-sm">{selectedLead.message}</p>
                  </div>
                )}
                {selectedLead.offer_amount && (
                  <div>
                    <p className="text-sm text-muted-foreground">Offer Amount</p>
                    <p className="font-semibold text-lg text-green-600">
                      {selectedLead.currency} {Number(selectedLead.offer_amount).toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Received</p>
                  <p>{new Date(selectedLead.created_at).toLocaleString()}</p>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm font-medium">Update Priority</p>
                  <div className="flex gap-2">
                    {['high', 'medium', 'low'].map(p => (
                      <Button
                        key={p}
                        variant={selectedLead.priority === p ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updatePriority(selectedLead.id, p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm font-medium">Update Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateLeadStatus(selectedLead.id, 'contacted')}>
                      <Phone className="w-3 h-3 mr-1" /> Contacted
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateLeadStatus(selectedLead.id, 'negotiating')}>
                      <MessageSquare className="w-3 h-3 mr-1" /> Negotiating
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={() => updateLeadStatus(selectedLead.id, 'converted')}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Converted
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => updateLeadStatus(selectedLead.id, 'closed')}>
                      <XCircle className="w-3 h-3 mr-1" /> Close
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a lead to view details</p>
              </CardContent>
            </Card>
          )}

          {stats?.recent?.length > 0 && !selectedLead && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  New Leads Requiring Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.recent.map(lead => (
                    <div key={lead.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded cursor-pointer hover:bg-muted/80" onClick={() => setSelectedLead(lead)}>
                      <span className="font-medium">{lead.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityBadge(lead.priority)}`}>
                        {lead.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
