// src/pages/landlord/LandlordNotifications.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { Bell, Mail, Smartphone, Clock, ShieldCheck, Settings2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWA } from '../../hooks/usePWA';







const LandlordNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSubscribed, subscribeToPush } = usePWA();


  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notification');
      setNotifications(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Settings shortcut banner */}
      <Link
        to="/landlord/notifications/settings"
        className="flex items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl
                   hover:bg-blue-100 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black text-blue-900 uppercase tracking-wider">Notification Settings</p>
            <p className="text-[11px] text-blue-700 font-medium">
              Configure when &amp; how often your tenants receive rent reminders
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl lg:text-2xl font-black text-slate-900">Notifications Feed</h2>
          <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-full">
            {notifications.length} alerts
          </span>
        </div>
        <div>
          <button
            onClick={subscribeToPush}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow-sm
              ${isSubscribed 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
          >
            {isSubscribed ? 'Push Notifications Active' : 'Enable Push Notifications'}
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts logged"
          message="Automated rent notifications and manual alerts sent to your tenants will appear here once processed."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isPush = String(n.channel).toLowerCase() === 'push';
            return (
              <div
                key={n.notification_id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition duration-150 flex items-start gap-4"
              >
                {/* Channel Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border
                  ${isPush 
                    ? 'bg-blue-50 border-blue-100 text-blue-600' 
                    : 'bg-green-50 border-green-100 text-green-600'
                  }`}
                >
                  {isPush ? <Smartphone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-950 block sm:inline">
                        {n.tenant_name || 'System Notification'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider sm:ml-2">
                        Room {n.room_number || 'N/A'} • {n.property_name || 'Hostel'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatRelativeTime(n.sent_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                    {n.message_body}
                  </p>

                  <div className="flex items-center gap-1.5 pt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    Delivered via {n.channel} • {formatDate(n.sent_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LandlordNotifications;
