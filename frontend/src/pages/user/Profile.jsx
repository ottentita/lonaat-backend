import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { authAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  User, 
  Mail,
  Lock,
  Save,
  Calendar,
  Package,
  DollarSign,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '../../lib/currency';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    created_at: '',
    total_products: 0,
    total_earnings: 0,
    total_withdrawals: 0
  });
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      const data = response.data.user || response.data;
      setProfile(data);
      setProfileForm({
        name: data.name || '',
        email: data.email || ''
      });
    } catch (error) {
      
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await authAPI.updateProfile(profileForm);
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      await authAPI.updateProfile({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Password changed successfully');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
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
        <div>
          <h1 className="text-3xl font-bold text-dark-50">Profile Settings</h1>
          <p className="text-dark-400 mt-1">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-blue-500" />
              <span className="text-dark-400 text-sm">Total Products</span>
            </div>
            <p className="text-2xl font-bold text-dark-50">{profile.total_products || 0}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-dark-400 text-sm">Total Earnings</span>
            </div>
            <p className="text-2xl font-bold text-dark-50">
              {formatCurrency(profile.total_earnings || 0, 'USD')}
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <span className="text-dark-400 text-sm">Member Since</span>
            </div>
            <p className="text-lg font-semibold text-dark-50">
              {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-dark-50 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Profile Information
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-dark-300 text-sm mb-2">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-dark-300 text-sm mb-2">Email Address</label>
                <input
                  type="email"
                  className="input"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-dark-50 mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary-500" />
              Change Password
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-dark-300 text-sm mb-2">Current Password</label>
                <input
                  type="password"
                  className="input"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-dark-300 text-sm mb-2">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-dark-300 text-sm mb-2">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Update Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="card bg-dark-800 border-primary-700">
          <div className="flex items-start gap-4">
            <Mail className="w-6 h-6 text-primary-500 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-dark-50 mb-2">Need Help?</h3>
              <p className="text-dark-400 text-sm mb-3">
                If you have any questions or need assistance, feel free to contact our support team.
              </p>
              <a
                href="mailto:support@lonaat.com"
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
