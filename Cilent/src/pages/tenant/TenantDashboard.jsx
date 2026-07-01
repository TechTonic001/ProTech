// src/pages/tenant/TenantDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaseAPI, paymentAPI, approvalAPI } from '../../utils/api';
import api from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import RealTimeGreeting from '../../components/ui/RealTimeGreeting';
import { 
  Home, 
  CreditCard, 
  Receipt, 
  Megaphone, 
  Bell, 
  Calendar, 
  Clock, 
  Mail,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';

const TenantDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState(null);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      const [leaseRes, payRes, notifRes, annRes] = await Promise.all([
        leaseAPI.getMine(),
        paymentAPI.getHistory(),
        api.get('/notification'),
        api.get('/announcement')
      ]);

      const activeLease = leaseRes.data.data?.find(l => l.lease_status === 'active');
      setLease(activeLease || null);
      setPayments(payRes.data.data || []);
      setNotifications(notifRes.data.data || []);
      setAnnouncements(annRes.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!lease) return 0;
    const now = new Date();
    const dueDay = lease.due_day || 5;
    const due = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (now.getDate() > dueDay) {
      due.setMonth(due.getMonth() + 1);
    }
    const diffTime = due - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysRemainingPill = () => {
    const days = getDaysRemaining();
    if (days <= 0) return 'bg-red-400/20 text-red-200';
    if (days <= 7) return 'bg-amber-400/20 text-amber-200';
    return 'bg-green-400/20 text-green-200';
  };

  const getLeaseProgressPercent = () => {
    if (!lease || !lease.start_date || !lease.end_date) return 0;
    const start = new Date(lease.start_date);
    const end = new Date(lease.end_date);
    const now = new Date();
    const total = end - start;
    const elapsed = now - start;
    if (total <= 0) return 0;
    const percent = Math.round((elapsed / total) * 100);
    return Math.min(100, Math.max(0, percent));
  };

  if (loading) return <LoadingSpinner fullPage size="lg" />;

  const daysRemaining = lease ? getDaysRemaining() : 0;
  const nextRentAmount = lease ? parseFloat(lease.rent_amount) + 500 : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 rounded-2xl p-6 text-white shadow-md shadow-indigo-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1 min-w-0">
          <RealTimeGreeting
            name={lease?.tenant_name || 'Tenant'}
            subtitle={lease ? `${lease.property_name} • Room ${lease.room_number}` : 'Awaiting Landlord Room Assignment'}
          />
        </div>

        {/* Next due alert box */}
        {lease && (
          <div className="bg-white/10 border border-white/10 rounded-2xl p-4 text-right self-stretch md:self-auto flex flex-col items-end justify-center">
            <span className="text-[10px] text-white/60 uppercase tracking-widest font-extrabold">Next Rent Due</span>
            <span className="text-3xl font-black text-white mt-1 leading-none">{formatCurrency(nextRentAmount)}</span>
            <span className="text-[10px] text-indigo-150 mt-1 font-semibold uppercase">
              Due by {lease.due_day}th of month
            </span>
            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getDaysRemainingPill()}`}>
              {daysRemaining <= 0 ? 'Overdue' : `${daysRemaining} days remaining`}
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {lease ? (
          <div
            onClick={() => navigate('/tenant/pay')}
            className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.01] transition duration-200 flex flex-col justify-between"
          >
            <div>
              <CreditCard className="w-8 h-8 text-white/80 mb-3" />
              <h3 className="text-lg font-bold">Pay Rent</h3>
              <p className="text-xs text-white/60 mt-1">Verify payment breakdown and launch secure Paystack checkout.</p>
            </div>
            <div className="flex justify-between items-baseline mt-6 pt-2 border-t border-white/15">
              <span className="text-2xl font-black">{formatCurrency(nextRentAmount)}</span>
              <span className="text-xs text-white/70 font-semibold flex items-center gap-1">
                Pay Now <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-center items-center text-center">
            <Clock className="w-8 h-8 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Lease Pending</h3>
            <p className="text-xs text-slate-400 mt-1">Once assigned to a room, you can make rent payments here.</p>
          </div>
        )}

        <div
          onClick={() => navigate('/tenant/history')}
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs hover:shadow-md cursor-pointer transition flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Verify payment receipts, download billing audits, and track transactional references.
            </p>
          </div>
          <div className="flex justify-between items-center mt-6 pt-2 border-t border-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>{payments.length} Payments registered</span>
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
        </div>

        <div
          onClick={() => navigate('/tenant/announcements')}
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs hover:shadow-md cursor-pointer transition flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Megaphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Announcements</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Read notices and general announcements issued by your hostel landlord.
            </p>
          </div>
          <div className="flex justify-between items-center mt-6 pt-2 border-t border-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>{announcements.length} broadcasts</span>
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Payments Made" value={payments.filter(p => p.payment_status === 'success').length} icon={Receipt} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard 
          label="Days Until Due" 
          value={daysRemaining > 0 ? `${daysRemaining} days` : '0 days'} 
          icon={Calendar} 
          iconColor="text-blue-600" 
          iconBg="bg-blue-50" 
          trendValue={daysRemaining <= 0 ? 'Overdue' : null}
          trendDirection="down"
        />
        <StatCard label="Reminders Logged" value={notifications.length} icon={Bell} iconColor="text-purple-600" iconBg="bg-purple-50" />
      </div>

      {/* Lease Details + Activity log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lease card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">My Agreement Details</h3>
              <Badge status={lease ? 'paid' : 'rejected'}>{lease ? 'Active' : 'Unassigned'}</Badge>
            </div>

            {lease ? (
              <div className="divide-y divide-slate-50 font-semibold text-xs text-slate-600">
                {[
                  { label: 'Hostel Name', value: lease.property_name },
                  { label: 'Hostel Address', value: lease.property_address },
                  { label: 'Room Number', value: `${lease.room_number} (${lease.room_type || 'Single'})` },
                  { label: 'Monthly Rent', value: formatCurrency(lease.rent_amount), blue: true },
                  { label: 'Agreement Period', value: `${formatDate(lease.start_date)} — ${formatDate(lease.end_date)}` },
                  { label: 'Rent Due Day', value: `Every ${lease.due_day}th of the month` },
                  { label: 'Landlord Email', value: lease.landlord_email }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between py-3">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">{item.label}</span>
                    <span className={`text-right max-w-[60%] truncate ${item.blue ? 'text-blue-600 font-black text-sm' : 'text-slate-800'}`}>
                      {item.value || '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                No active lease details found. Once your landlord assigns you to a room, details will appear here.
              </div>
            )}
          </div>

          {/* Lease progress timeline */}
          {lease && (
            <div className="space-y-1.5 pt-4 border-t border-slate-100 font-semibold">
              <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span>Lease Progress</span>
                <span className="text-blue-600">{getLeaseProgressPercent()}% elapsed</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getLeaseProgressPercent()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Notifications log */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4">My Notifications Feed</h3>
            
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No alerts or notifications received.
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {notifications.slice(0, 5).map((n) => {
                  const isPush = String(n.channel).toLowerCase() === 'push';
                  return (
                    <div key={n.notification_id} className="flex items-start gap-3 text-xs leading-normal">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border
                        ${isPush ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                        {isPush ? <Smartphone className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-800">Rent Alert</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{formatRelativeTime(n.sent_at)}</span>
                        </div>
                        <p className="text-slate-500 font-medium mt-0.5">{n.message_body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 justify-center select-none mt-4">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            Reminders dispatched by automated system
          </div>
        </div>

      </div>

    </div>
  );
};

export default TenantDashboard;
