// src/pages/tenant/TenantDashboard.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { leaseAPI, paymentAPI, approvalAPI } from '../../utils/api';
import api from '../../utils/api';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';
import { daysUntilDue, dueDateLabel, dueDateColourClass } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SkeletonCard from '../../components/ui/SkeletonCard';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import RealTimeGreeting from '../../components/ui/RealTimeGreeting';
import { useSSE } from '../../hooks/useSSE';
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState(null);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tenantUser, setTenantUser] = useState(null);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      const [leaseRes, payRes, notifRes, annRes] = await Promise.all([
        leaseAPI.getMyLease().catch(() => ({ data: null })),
        paymentAPI.getHistory(),
        api.get('/notification'),
        api.get('/announcement'),
      ]);

      setLease(leaseRes.data || null);
      setTenantUser(user?.user_id || null);
      setPayments(payRes.data.data || []);
      setNotifications(notifRes.data.data || []);
      setAnnouncements(annRes.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useSSE({
    payment_confirmed: (data) => {
      setLease((prev) => prev ? { ...prev, amount_paid_this_cycle: data.amount_paid_total, remaining: data.remaining, is_fully_paid: data.is_fully_paid } : prev);
      toast.success(`Payment confirmed! ₦${parseFloat(data.remaining || 0).toLocaleString('en-NG')} remaining`, { duration: 5000 });
    },
  }, !!tenantUser);

  useEffect(() => {
    loadTenantData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useMemo: these three calculations depend only on lease data.
  // Previously defined as plain functions called multiple times inside JSX.
  const daysRemaining = useMemo(() => {
    if (!lease?.end_date) return 0;
    return daysUntilDue(lease.end_date) ?? 0;
  }, [lease]);

  const daysRemainingPillClass = useMemo(() => {
    if (daysRemaining <= 0) return 'bg-red-400/20 text-red-200';
    if (daysRemaining <= 7) return 'bg-amber-400/20 text-amber-200';
    return 'bg-green-400/20 text-green-200';
  }, [daysRemaining]);

  const leaseProgressPercent = useMemo(() => {
    if (!lease || !lease.start_date || !lease.end_date) return 0;
    const start   = new Date(lease.start_date);
    const end     = new Date(lease.end_date);
    const now     = new Date();
    const total   = end - start;
    const elapsed = now - start;
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }, [lease]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    );
  }

  // Derived from lease — computed after loading guard
  const nextRentAmount = lease ? parseFloat(lease.rent_amount) + 500 : 0;

  const days = lease ? daysUntilDue(lease?.end_date) : null;
  const colour = dueDateColourClass(
    lease?.end_date,
    lease?.amount_paid_this_cycle >= lease?.rent_amount
  );

  const currentRent = parseFloat(lease?.rent_amount || 0);
  const amountPaidCycle = parseFloat(lease?.amount_paid_this_cycle || 0);
  const carriedForward = parseFloat(lease?.carried_forward_balance || 0);
  const currentRemaining = currentRent - amountPaidCycle;
  const totalOwed = currentRemaining + carriedForward;
  const hasCarriedBalance = carriedForward > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 rounded-2xl p-6 text-white shadow-md shadow-indigo-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1 min-w-0">
          <RealTimeGreeting
            name={user?.full_name || user?.username || 'Tenant'}
            subtitle={lease ? `${lease.property_name} • Room ${lease.room_number}` : 'Awaiting Landlord Room Assignment'}
          />
        </div>

        {/* Next due alert box */}
        {lease && (
          <div className={`rounded-2xl p-5 border-2 transition-all
            ${colour.border} ${colour.bg}
            ${colour.urgent ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}>

            <p className="text-xs font-bold text-slate-500
                          uppercase tracking-wider mb-1">
              Rent Due Date
            </p>

            <p className={`text-3xl font-black mt-1
              ${colour.text}
              ${colour.urgent ? 'animate-pulse' : ''}`}>
              {colour.label}
            </p>

            <p className="text-sm text-slate-500 mt-1">
              {formatDate(lease?.end_date)}
            </p>

            {colour.urgent && days !== null && days > 0 && (
              <p className="text-xs text-red-500 font-bold mt-2">
                ⚠ Less than 20 days until your rent is due
              </p>
            )}
            {colour.urgent && days !== null && days <= 0 && (
              <p className="text-xs text-red-700 font-bold mt-2">
                ⚠ Your rent is past due — please pay immediately
              </p>
            )}
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
              <p className="text-xs text-white/60 mt-1">Secure Paystack checkout — pay the outstanding balance.</p>
            </div>

            {/* Paid / Remaining mini-breakdown */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-white/70">
                <span>Paid this cycle</span>
                <span className="font-bold text-green-300">₦{amountPaidCycle.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-white/70">
                <span>Remaining balance</span>
                <span className="font-bold text-red-300">₦{totalOwed.toLocaleString()}</span>
              </div>
              {/* Mini progress bar */}
              <div className="h-1.5 bg-white/20 rounded-full mt-2">
                <div
                  className="h-1.5 rounded-full bg-green-400 transition-all duration-500"
                  style={{ width: currentRent > 0 ? `${Math.min(100, (amountPaidCycle / currentRent) * 100)}%` : '0%' }}
                />
              </div>
            </div>

            <div className="flex justify-between items-baseline mt-4 pt-3 border-t border-white/15">
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Balance Due</p>
                <span className="text-2xl font-black">{formatCurrency(totalOwed > 0 ? totalOwed : 0)}</span>
              </div>
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
        <div className={`rounded-2xl p-4 border-2 ${colour.border}
                     bg-white transition-all`}>
          <p className="text-xs font-bold text-slate-500
                        uppercase tracking-wider">Days Until Due</p>
          <p className={`text-3xl font-black mt-1 ${colour.text}`}>
            {days === null ? '—' : Math.abs(days)}
          </p>
          <p className={`text-xs font-bold mt-0.5 ${colour.text}`}>
            {days === null ? 'No lease found'
             : days < 0 ? 'OVERDUE'
             : days === 0 ? 'Due Today'
             : days <= 20 ? 'days left ⚠'
             : 'days remaining'}
          </p>
        </div>
        <StatCard label="Reminders Logged" value={notifications.length} icon={Bell} iconColor="text-purple-600" iconBg="bg-purple-50" />
      </div>

      {lease && (
        <div className="bg-white rounded-2xl border-2 border-red-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount Owed</p>
              <p className="text-4xl font-black text-red-700 mt-1">₦{totalOwed.toLocaleString()}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-black ${totalOwed <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {totalOwed <= 0 ? 'Fully Paid ✓' : 'Balance Due'}
            </span>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            {hasCarriedBalance && (
              <div className="flex justify-between items-center bg-red-50 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold text-red-700">Previous Unpaid Balance</p>
                  <p className="text-xs text-slate-500 mt-0.5">Carried forward from last period</p>
                </div>
                <p className="text-sm font-black text-red-700">₦{carriedForward.toLocaleString()}</p>
              </div>
            )}

            <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-bold text-slate-700">Current Cycle Rent</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatDate(lease?.start_date)} → {formatDate(lease?.end_date)}</p>
              </div>
              <p className="text-sm font-black text-slate-800">₦{currentRent.toLocaleString()}</p>
            </div>

            <div className="flex justify-between items-center bg-green-50 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-bold text-green-700">Amount Paid (This Cycle)</p>
                <p className="text-xs text-slate-500 mt-0.5">Verified Paystack payments</p>
              </div>
              <p className="text-sm font-black text-green-700">− ₦{amountPaidCycle.toLocaleString()}</p>
            </div>

            <div className="border-t-2 border-dashed border-slate-200 my-2" />

            <div className="flex justify-between items-center bg-red-700 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-black text-white">Total Balance Remaining</p>
                {hasCarriedBalance && (
                  <p className="text-xs text-red-200 mt-0.5">₦{carriedForward.toLocaleString()} previous + ₦{currentRemaining.toLocaleString()} current</p>
                )}
              </div>
              <p className="text-xl font-black text-white">₦{totalOwed.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Payment Progress</span>
              <span>{currentRent > 0 ? Math.round((amountPaidCycle / currentRent) * 100) : 0}% paid this cycle</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full">
              <div
                className="h-2.5 rounded-full bg-green-500 transition-all duration-500"
                style={{ width: currentRent > 0 ? `${Math.min(100, (amountPaidCycle / currentRent) * 100)}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      )}

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
                  { label: 'Yearly Rent', value: formatCurrency(lease.rent_amount), blue: true },
                  { label: 'Agreement Period', value: `${formatDate(lease.start_date)} — ${formatDate(lease.end_date)}` },
                  { label: 'Rent Due Date', value: `${formatDate(lease.end_date)}` },
                  { label: 'Landlord Email', value: lease.landlord_email }
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-3">
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
                <span className="text-blue-600">{leaseProgressPercent}% elapsed</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${leaseProgressPercent}%` }}
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
