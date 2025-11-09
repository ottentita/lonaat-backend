import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Users as UsersIcon, 
  Search,
  Filter,
  Eye,
  Shield,
  User,
  Wallet,
  Calendar,
  Loader2,
  X
} from 'lucide-react';

const Users = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const getRoleBadgeColor = (role) => {
    return role === 'admin'
      ? 'bg-purple-500/10 text-purple-500 border-purple-700'
      : 'bg-blue-500/10 text-blue-500 border-blue-700';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark-50">Users Management</h1>
            <p className="text-dark-400 mt-1">View and manage platform users</p>
          </div>
          <div className="card px-4 py-2">
            <p className="text-dark-400 text-sm">Total Users</p>
            <p className="text-2xl font-bold text-dark-50">{users.length}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary-500" />
              <select
                className="input"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-800">
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">Role</th>
                    <th className="text-right py-3 px-4 text-dark-400 font-medium">Balance</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">Joined</th>
                    <th className="text-center py-3 px-4 text-dark-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-500" />
                          </div>
                          <div>
                            <p className="text-dark-50 font-medium">{user.name || 'No name'}</p>
                            <p className="text-dark-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getRoleBadgeColor(user.role)}`}>
                          {user.role === 'admin' ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <span className="text-sm font-medium capitalize">{user.role}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Wallet className="w-4 h-4 text-green-500" />
                          <span className="text-dark-50 font-semibold">
                            ₦{(user.balance || 0).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-dark-300 text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="btn-secondary inline-flex items-center gap-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UsersIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark-50 mb-2">No users found</h3>
              <p className="text-dark-400">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {showDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-2xl w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark-50">User Details</h2>
                <button onClick={() => setShowDetailsModal(false)}>
                  <X className="w-6 h-6 text-dark-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b border-dark-800">
                  <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-primary-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-dark-50">{selectedUser.name}</h3>
                    <p className="text-dark-400">{selectedUser.email}</p>
                  </div>
                  <span className={`ml-auto px-3 py-1 rounded-full border ${getRoleBadgeColor(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="card bg-dark-800">
                    <p className="text-dark-400 text-sm mb-1">Account Balance</p>
                    <p className="text-2xl font-bold text-green-500">
                      ₦{(selectedUser.balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="card bg-dark-800">
                    <p className="text-dark-400 text-sm mb-1">Total Products</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {selectedUser.total_products || 0}
                    </p>
                  </div>
                  <div className="card bg-dark-800">
                    <p className="text-dark-400 text-sm mb-1">Active Campaigns</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {selectedUser.active_campaigns || 0}
                    </p>
                  </div>
                  <div className="card bg-dark-800">
                    <p className="text-dark-400 text-sm mb-1">Member Since</p>
                    <p className="text-lg font-semibold text-dark-50">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="card bg-dark-800">
                  <h4 className="font-semibold text-dark-50 mb-3">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-400">Email:</span>
                      <span className="text-dark-50">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">User ID:</span>
                      <span className="text-dark-50 font-mono">{selectedUser.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Users;
