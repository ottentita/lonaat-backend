import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Zap } from 'lucide-react';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing');
      return;
    }

    const verifyEmail = async () => {
      try {
        const { data } = await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        toast.success('Email verified! Redirecting to login...');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Verification failed. Token may be expired or invalid.');
        toast.error('Verification failed');
      }
    };

    verifyEmail();
  }, [token, navigate]);

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
        </div>

        <div className="card text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold mb-2">Verifying Email</h2>
              <p className="text-dark-400">Please wait while we verify your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-green-500">Email Verified!</h2>
              <p className="text-dark-300 mb-6">{message}</p>
              <p className="text-sm text-dark-400">Redirecting to login page...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-red-500">Verification Failed</h2>
              <p className="text-dark-300 mb-6">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary"
              >
                Go to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
