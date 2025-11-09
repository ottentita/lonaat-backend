import { useState, useEffect } from 'react';
import { Send, Bell, Users, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Notifications = () => {
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [sentNotifications, setSentNotifications] = useState([]);

  useEffect(() => {
    fetchSentNotifications();
  }, []);

  const fetchSentNotifications = async () => {
    try {
      const { data } = await api.get('/admin/notifications/sent');
      setSentNotifications(data.notifications || []);
    } catch (error) {
      // API may not be implemented yet
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);
    try {
      await api.post('/admin/notifications/broadcast', {
        title,
        message
      });
      
      toast.success('Notification sent to all users!');
      setTitle('');
      setMessage('');
      fetchSentNotifications();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📢 Broadcast Notifications</h1>
        <p className="text-dark-400 mt-1">
          Send notifications to all users
        </p>
      </div>

      {/* Broadcast Form */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Send New Notification
        </h3>
        
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., New Feature Released!"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => {
                const newMessage = e.target.value;
                if (newMessage.length <= 500) {
                  setMessage(newMessage);
                }
              }}
              placeholder="Enter your message here..."
              className="input min-h-[120px]"
              maxLength={500}
              required
            />
            <p className={`text-xs mt-1 ${message.length >= 500 ? 'text-yellow-400' : 'text-dark-500'}`}>
              {message.length}/500 characters {message.length >= 500 && '(max reached)'}
            </p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <Bell className="w-5 h-5 text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Broadcast to all users</p>
              <p className="text-xs text-dark-400">This notification will be sent to every registered user</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setTitle('');
                setMessage('');
              }}
              className="btn-secondary"
              disabled={sending}
            >
              Clear
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={sending}
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send to All Users
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Recently Sent */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Recently Sent</h3>
        
        {sentNotifications.length === 0 ? (
          <div className="text-center py-8 text-dark-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No broadcasts sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sentNotifications.map((notification, index) => (
              <div key={index} className="p-4 bg-dark-800 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{notification.title}</h4>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-sm text-dark-300 mb-2">{notification.message}</p>
                <div className="flex items-center gap-4 text-xs text-dark-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {notification.recipient_count || 'All'} users
                  </span>
                  <span>{new Date(notification.sent_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Examples */}
      <div className="card bg-dark-800/50">
        <h3 className="text-lg font-semibold mb-3">💡 Example Notifications</h3>
        <div className="space-y-2 text-sm">
          <div className="p-3 bg-dark-900 rounded">
            <p className="font-medium">New Feature:</p>
            <p className="text-dark-400">"🎉 We've just launched AI-powered product descriptions! Try it now in your dashboard."</p>
          </div>
          <div className="p-3 bg-dark-900 rounded">
            <p className="font-medium">Maintenance Alert:</p>
            <p className="text-dark-400">"⚠️ Scheduled maintenance on Sunday 2AM-4AM. Services may be temporarily unavailable."</p>
          </div>
          <div className="p-3 bg-dark-900 rounded">
            <p className="font-medium">Promotion:</p>
            <p className="text-dark-400">"🚀 Double your AdBoost credits this weekend! Use code BOOST2X at checkout."</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
