// src/pages/tenant/TenantNotifications.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatRelativeTime } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { 
  Bell, 
  Smartphone, 
  Mail, 
  ArrowLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const TenantNotifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notification');
      setNotifications(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage size="lg" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-2">
      {/* Back to dashboard */}
      <button 
        onClick={() => navigate('/tenant/dashboard')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Title */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">System Notifications</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Audit log of rent alerts, reminders, and payment status updates</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-1.5 hidden sm:block">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{notifications.length} Logged</span>
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="You don't have any notifications yet. Rent reminders will be automatically logged and shown here."
          icon={Bell}
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/tenant/dashboard')}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100 shadow-xs overflow-hidden">
          {notifications.map((notif) => {
            const isPush = String(notif.channel).toLowerCase() === 'push';
            return (
              <div 
                key={notif.notification_id} 
                className="p-5 flex items-start gap-4 hover:bg-slate-50/50 transition duration-150"
              >
                {/* Icon wrapper */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border
                  ${isPush ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                  {isPush ? <Smartphone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                      {isPush ? 'Push Notification' : 'Email Dispatch'}
                      <span className="text-[10px] font-bold text-slate-400">•</span>
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                        {notif.property_name || 'System'}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-350" />
                      {formatRelativeTime(notif.sent_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                    {notif.message_body}
                  </p>

                  {notif.room_number && (
                    <div className="pt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      Room Number: {notif.room_number}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PWA Reminder Box */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4 text-xs leading-relaxed text-amber-800 font-semibold">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold uppercase tracking-wide text-amber-900">Push Notification Integration</p>
          <p className="text-[11px] text-amber-800/80 mt-1 font-medium leading-relaxed">
            Ensure browser notification permissions are enabled in your client settings to receive instant mobile reminders. Our background scheduler automatically sends warning logs 3 days prior to monthly deadlines.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TenantNotifications;
