import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const EmailCapture = ({ title = "Stay Updated", description = "Get the latest updates and tips for affiliate marketing" }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/leads/capture', { email });
      toast.success('Thank you! We\'ll keep you updated.');
      setSubmitted(true);
      setEmail('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="card text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">You're all set!</h3>
        <p className="text-dark-400">Check your email for confirmation.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Mail className="w-6 h-6 text-primary-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-sm text-dark-400 mb-4">{description}</p>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input flex-1"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Subscribe</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailCapture;
