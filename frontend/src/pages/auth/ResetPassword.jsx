import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Lock, Zap, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });


  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, password: formData.password });
      toast.success('Password reset successful!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-primary-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-12 h-12 text-primary-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Lonaat
            </h1>
          </div>
          <p className="text-dark-400">AI-Powered Affiliate Marketing</p>
        </div>

        <div className="card">
          <>
            <h2 className="text-2xl font-bold mb-2 text-center">Set New Password</h2>
            <p className="text-dark-400 text-center mb-6 text-sm">
              Enter your new password below
            </p>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </form>
          </>
        </div>

        <div className="mt-8 text-center text-xs text-dark-500">
          Powered by Lonaat © 2025
        </div>
      </div>
    </div>
  );

        <div className="mt-8 text-center text-xs text-dark-500">
          Powered by Lonaat © 2025
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
