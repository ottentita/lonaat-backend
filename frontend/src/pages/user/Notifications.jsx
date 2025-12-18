import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, TrendingUp, DollarSign, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'click':
      case 'traffic':
        return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'commission':
      case 'earnings':
        return <DollarSign className="w-5 h-5 text-green-400" />;
      case 'boost':
      case 'campaign':
        return <Megaphone className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-primary-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🔔 Notifications</h1>
          <p className="text-dark-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-secondary flex items-center gap-2"
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4" />
            Mark All as Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <Bell className="w-16 h-16 mx-auto mb-4 text-dark-600" />
          <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
          <p className="text-dark-400">
            You'll be notified about clicks, earnings, and important updates
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`card transition-all ${
                !notification.read 
                  ? 'border-l-4 border-primary-500 bg-primary-900/10' 
                  : 'opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        {notification.title || 'New Update'}
                      </h3>
                      <p className="text-dark-300 text-sm mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-dark-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 hover:bg-dark-800 rounded transition"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 hover:bg-red-900/20 rounded transition text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Example Notifications for Demo */}
      {notifications.length === 0 && (
        <div className="space-y-3">
          <div className="card border-l-4 border-blue-500 bg-blue-900/10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Example: New Traffic Alert</h3>
                <p className="text-dark-300 text-sm mb-2">
                  🎯 Your ad for 'Wireless Earbuds' gained 150 new clicks!
                </p>
                <p className="text-xs text-dark-500">This is an example notification</p>
              </div>
            </div>
          </div>

          <div className="card opacity-75">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Example: Commission Earned</h3>
                <p className="text-dark-300 text-sm mb-2">
                  💰 You earned $250 commission from product sales!
                </p>
                <p className="text-xs text-dark-500">This is an example notification</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
