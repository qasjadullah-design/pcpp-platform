import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Circle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../../services/api';
import Spinner from '../../components/common/Spinner';

const parseNotifications = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.notifications)) return response.notifications;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const typeClass = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  error: 'bg-red-50 text-red-700 border-red-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    notificationsAPI.getAll()
      .then(r => setNotifications(parseNotifications(r)))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (notification) => {
    if (notification.is_read) return;
    setBusy(notification.id);
    try {
      await notificationsAPI.markRead(notification.id);
      setNotifications(items => items.map(item => item.id === notification.id ? { ...item, is_read: true } : item));
    } catch(e) {
      toast.error(e.message || 'Failed to mark notification as read');
    } finally {
      setBusy('');
    }
  };

  const markAllRead = async () => {
    setBusy('all');
    try {
      await notificationsAPI.markAllRead();
      setNotifications(items => items.map(item => ({ ...item, is_read: true })));
      toast.success('Notifications marked as read');
    } catch(e) {
      toast.error(e.message || 'Failed to mark notifications as read');
    } finally {
      setBusy('');
    }
  };

  const openNotification = async (notification) => {
    await markRead(notification);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-pcpp-pine">Notifications</h1>
          <p className="text-sm text-ink-secondary">{unreadCount.toLocaleString()} unread of {notifications.length.toLocaleString()} recent notifications</p>
        </div>
        <button
          onClick={markAllRead}
          disabled={!unreadCount || busy === 'all'}
          className="inline-flex items-center gap-2 border border-pcpp-border text-ink-secondary px-4 py-2 rounded-control text-sm hover:bg-pcpp-mist disabled:opacity-50"
        >
          <CheckCircle size={16} strokeWidth={1.75} />
          Mark all read
        </button>
      </div>

      {loading ? <Spinner /> : notifications.length === 0 ? (
        <div className="text-center py-20 text-ink-secondary bg-pcpp-card border border-pcpp-border rounded-card">
          <Bell size={40} strokeWidth={1.75} className="mx-auto mb-4 text-ink-secondary" />
          <p className="font-medium text-ink">No notifications yet</p>
          <Link to="/dashboard" className="text-pcpp-emerald hover:underline text-sm">Back to dashboard</Link>
        </div>
      ) : (
        <div className="bg-pcpp-card border border-pcpp-border rounded-card divide-y divide-pcpp-border overflow-hidden">
          {notifications.map(notification => (
            <div key={notification.id} className={`p-4 flex items-start gap-4 ${notification.is_read ? 'bg-white' : 'bg-pcpp-mist/50'}`}>
              <button
                type="button"
                onClick={() => markRead(notification)}
                disabled={notification.is_read || busy === notification.id}
                className="mt-1 text-pcpp-emerald disabled:text-ink-tertiary"
                aria-label={notification.is_read ? 'Notification read' : 'Mark notification as read'}
              >
                {notification.is_read ? <CheckCircle size={18} strokeWidth={1.75} /> : <Circle size={18} strokeWidth={1.75} />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="font-semibold text-ink">{notification.title}</h2>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border capitalize ${typeClass[notification.type] || typeClass.info}`}>{notification.type || 'info'}</span>
                  {!notification.is_read && <span className="text-[11px] text-pcpp-emerald font-medium">Unread</span>}
                </div>
                <p className="text-sm text-ink-secondary">{notification.message}</p>
                <p className="text-xs text-ink-tertiary mt-2">{new Date(notification.created_at).toLocaleString()}</p>
              </div>
              {notification.link && (
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className="inline-flex items-center gap-1 text-sm text-pcpp-emerald hover:underline"
                >
                  Open
                  <ExternalLink size={14} strokeWidth={1.75} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
