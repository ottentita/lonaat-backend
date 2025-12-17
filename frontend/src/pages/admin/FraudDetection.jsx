import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function FraudDetection() {
  const [stats, setStats] = useState(null);
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getFraudStats();
      setStats(response.data.stats || null);
      setFlaggedUsers(response.data.flagged_users || []);
    } catch (error) {
      console.error('Error loading fraud data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (userId) => {
    const reason = prompt('Reason for blocking:');
    if (!reason) return;
    
    try {
      await adminAPI.blockUser(userId, { reason });
      toast.success('User blocked');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to block user');
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await adminAPI.unblockUser(userId);
      toast.success('User unblocked');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to unblock user');
    }
  };

  const getRiskBadge = (level) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level] || 'bg-gray-100'}`}>
        {level}
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
      <h1 className="text-2xl font-bold">Fraud Detection</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Flags</p>
            <p className="text-2xl font-bold">{stats?.total_flags || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Blocked Users</p>
            <p className="text-2xl font-bold text-red-600">{stats?.blocked_users || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">High Risk</p>
            <p className="text-2xl font-bold text-orange-600">{stats?.high_risk || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Under Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats?.under_review || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flagged Users</CardTitle>
        </CardHeader>
        <CardContent>
          {flaggedUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No flagged users. System is clean!</p>
          ) : (
            <div className="space-y-4">
              {flaggedUsers.map((user) => (
                <div key={user.id} className="flex justify-between items-start p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{user.name || user.email}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason: {user.flag_reason || 'Suspicious activity'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {getRiskBadge(user.risk_level || 'medium')}
                      {user.is_blocked && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Blocked</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {user.is_blocked ? (
                      <Button size="sm" variant="outline" onClick={() => handleUnblock(user.id)}>
                        Unblock
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => handleBlock(user.id)}>
                        Block
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
