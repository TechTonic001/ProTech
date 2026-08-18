// src/pages/landlord/LandlordDashboard.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  dashboardAPI,
  paymentAPI,
  approvalAPI,
} from "../../utils/api";
import { useSSE } from '../../hooks/useSSE';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from "../../utils/formatters";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import SkeletonCard from "../../components/ui/SkeletonCard";
import RealTimeGreeting from "../../components/ui/RealTimeGreeting";
import {
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  DoorOpen,
  UserCheck,
  CreditCard,
  Plus,
  Copy,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const LandlordDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardState, setDashboardState] = useState(null);
  const [recentPaymentsState, setRecentPaymentsState] = useState([]);
  const [recentLeasesState, setRecentLeasesState] = useState([]);

  const { data: bundle, isLoading: loading } = useQuery({
    queryKey: ['landlord-dashboard-bundle'],
    queryFn: async () => {
      const [dashRes, payRes, pendingRes] = await Promise.all([
        dashboardAPI.getLandlord(),
        paymentAPI.getHistory(),
        approvalAPI.getPending(),
      ]);
      const dashboard = dashRes.data || {};
      const recentLeases = Array.isArray(dashboard.recent_leases)
        ? dashboard.recent_leases
        : (typeof dashboard.recent_leases === 'string'
          ? JSON.parse(dashboard.recent_leases)
          : []);
      const result = {
        dashboard: { ...dashboard, recent_leases: recentLeases },
        payments: payRes.data.data || [],
        pendingApprovals: pendingRes.data.data || [],
      };
      setDashboardState(result.dashboard);
      setRecentPaymentsState(result.payments);
      setRecentLeasesState(recentLeases);
      return result;
    },
    staleTime: 1000 * 60 * 2,
    cacheTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const dashboard = bundle?.dashboard || dashboardState || {};
  const payments = bundle?.payments || recentPaymentsState || [];
  const pendingApprovals = bundle?.pendingApprovals || [];
  const pendingApprovalsCount = pendingApprovals.length;

  const overdueLeases = useMemo(() => {
    const leases = dashboard.recent_leases || recentLeasesState || [];
    return leases.filter((l) => l.is_overdue);
  }, [dashboard.recent_leases, recentLeasesState]);

  const uniqueOverdueTenants = useMemo(() => {
    const seen = new Set();
    return overdueLeases.filter((lease) => {
      if (seen.has(lease.tenant_id)) return false;
      seen.add(lease.tenant_id);
      return true;
    });
  }, [overdueLeases]);

  useSSE({
    payment_received: (data) => {
      toast.success(`💳 ${data.tenant_name || 'Tenant'} paid ₦${parseFloat(data.amount_paid || 0).toLocaleString('en-NG')} for Room ${data.room_number || ''}`, { duration: 6000 });
      const nextLeases = (recentLeasesState || []).map((lease) => lease.lease_id === data.lease_id ? { ...lease, amount_paid: data.amount_paid_total, remaining: data.remaining, is_overdue: false, is_fully_paid: data.is_fully_paid } : lease).filter((lease) => !(data.is_fully_paid && lease.lease_id === data.lease_id));
      setRecentLeasesState(nextLeases);
      setDashboardState((prev) => {
        if (!prev) return prev;
        const nextRecentLeases = (prev.recent_leases || []).map((lease) => lease.lease_id === data.lease_id ? { ...lease, amount_paid: data.amount_paid_total, remaining: data.remaining, is_overdue: false, is_fully_paid: data.is_fully_paid } : lease).filter((lease) => !(data.is_fully_paid && lease.lease_id === data.lease_id));
        const overdueCount = data.is_fully_paid ? Math.max(0, (parseInt(prev.overdue_count, 10) || 0) - 1) : (parseInt(prev.overdue_count, 10) || 0);
        return {
          ...prev,
          revenue_this_month: (parseFloat(prev.revenue_this_month || 0) + parseFloat(data.amount_paid || 0)).toFixed(2),
          overdue_count: overdueCount,
          recent_leases: nextRecentLeases,
        };
      });
    },
  }, !!user);

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  const getDueStatusStyle = (daysRemaining, isFullyPaid) => {
    if (isFullyPaid) return {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: 'Paid ✓',
    };

    const d = parseInt(daysRemaining ?? 0, 10);
    if (d < 0) return {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} OVERDUE`,
      pulse: true,
    };
    if (d === 0) return {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: 'Due TODAY',
      pulse: true,
    };
    if (d <= 7) return {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      label: `${d} day${d === 1 ? '' : 's'} left`,
    };
    if (d <= 20) return {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      label: `${d} days left`,
    };
    return {
      bg: 'bg-green-50',
      text: 'text-green-600',
      label: `${d} days left`,
    };
  };

  const leases = dashboard.recent_leases || recentLeasesState || [];
  const [expandedLease, setExpandedLease] = useState(null);

  const stats = useMemo(
    () => ({
      properties:     parseInt(dashboard.total_properties, 10) || 0,
      activeTenants:  parseInt(dashboard.active_tenants, 10) || 0,
      monthlyRevenue: parseFloat(dashboard.revenue_this_month) || 0,
      overdueTenants: parseInt(dashboard.overdue_count, 10) || 0,
    }),
    [dashboard]
  );

  // Recent payments — take only the first 5 from the current page
  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);

  // BarChart revenue data — last 6 months aggregation — O(payments)
  const chartData = useMemo(() => {
    const monthlySums = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      monthlySums[label] = { month: label, Revenue: 0 };
    }
    for (const p of payments) {
      if (p.payment_status !== "success") continue;
      const pDate  = new Date(p.payment_date);
      const mLabel = `${MONTH_NAMES[pDate.getMonth()]} ${pDate.getFullYear()}`;
      if (monthlySums[mLabel]) {
        monthlySums[mLabel].Revenue += parseFloat(p.amount_paid);
      }
    }
    return Object.values(monthlySums);
  }, [payments, now]);

  const occupancyData = useMemo(() => {
    const occupiedRooms = parseInt(dashboard.occupied_rooms, 10) || 0;
    const vacantRooms   = parseInt(dashboard.vacant_rooms, 10) || 0;
    const totalRooms    = occupiedRooms + vacantRooms;
    if (totalRooms === 0) {
      return [
        { name: "Occupied", value: 0, color: "#1565C0" },
        { name: "Vacant",   value: 0, color: "#E3F2FD" },
      ];
    }
    return [
      { name: "Occupied", value: occupiedRooms, color: "#1565C0" },
      { name: "Vacant",   value: vacantRooms,   color: "#E3F2FD" },
    ];
  }, [dashboard]);

  // Occupancy percentage — derived from already-memoized occupancyData
  const currentOccupancyPercent = useMemo(() => {
    const total    = occupancyData.reduce((sum, d) => sum + d.value, 0);
    const occupied = occupancyData.find((d) => d.name === "Occupied")?.value || 0;
    if (total === 0) return "0%";
    return `${Math.round((occupied / total) * 100)}%`;
  }, [occupancyData]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner + Landlord Code */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 relative overflow-hidden shadow-md shadow-emerald-400/10">
        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] items-start">
          <div className="relative z-10">
            <RealTimeGreeting
              name={user?.full_name || `@${user?.username}`}
              subtitle="Manage listings, collections and tenant workflows — quick snapshot."
            />
          </div>
{/* {UNIQUE LANDLORD CODE} */}
          <div className="bg-white/95 rounded-3xl border-2 border-emerald-200 p-5 shadow-sm flex flex-col justify-between gap-4 min-h-[170px]">
            <div>
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Your Unique Landlord Code
              </p>
              <p className="text-3xl sm:text-4xl font-black text-emerald-800 font-mono mt-3 tracking-wider break-all">
                {user?.landlord_code || "PT-XXXXXX"}
              </p>
              <p className="text-[12px] sm:text-sm text-slate-600 mt-3 leading-relaxed">
                Share this code with tenants — they need it to register.
              </p>
            </div>
            <button
              onClick={() => {
                if (user?.landlord_code) {
                  navigator.clipboard.writeText(user.landlord_code);
                  toast.success("Code copied to clipboard!");
                } else {
                  toast.error("No landlord code found");
                }
              }}
              className="self-start bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl font-semibold text-sm flex items-center gap-2 transition"
            >
              <Copy className="w-4 h-4" />
              Copy Code
            </button>
          </div>
        </div>

        {/* Decorative Grid Illustration */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2 select-none opacity-20">
          <div className="w-14 h-28 bg-white/20 rounded-xl p-2 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
            </div>
            <div className="flex justify-between">
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
            </div>
            <div className="flex justify-between">
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
            </div>
          </div>
          <div className="w-14 h-36 bg-white/20 rounded-xl p-2 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
            </div>
            <div className="flex justify-between">
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
            </div>
            <div className="flex justify-between">
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
            </div>
            <div className="flex justify-between">
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
              <div className="w-3 h-3 bg-white/40 rounded-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
          {
            title: "Add Property",
            sub: "Register a new hostel",
            icon: Building2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            path: "/landlord/properties",
          },
          {
            title: "Manage Rooms",
            sub: "View room status",
            icon: DoorOpen,
            color: "text-teal-600",
            bg: "bg-teal-50",
            path: "/landlord/rooms",
          },
          {
            title: "Approvals",
            sub: "Review requests",
            icon: UserCheck,
            color: "text-amber-600",
            bg: "bg-amber-50",
            path: "/landlord/approvals",
            badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
          },
          {
            title: "Payments",
            sub: "View all records",
            icon: CreditCard,
            color: "text-cyan-600",
            bg: "bg-cyan-50",
            path: "/landlord/payments",
          },
          // {
          //   title: "Bank Setup",
          //   sub: "Configure settlements",
          //   icon: Plus,
          //   color: "text-sky-600",
          //   bg: "bg-sky-50",
          //   path: "/landlord/bank-setup",
          // },
        ].map((act) => (
          <div
            key={act.path}
            onClick={() => navigate(act.path)}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-lg hover:shadow-slate-100 hover:border-blue-100 cursor-pointer transition duration-200 flex flex-col relative"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.bg} ${act.color}`}
            >
              <act.icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-3">
              {act.title}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{act.sub}</p>
            {act.badge && (
              <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {act.badge}
              </span>
            )}
            <ArrowRight className="w-4 h-4 text-slate-300 mt-4 ml-auto self-end" />
          </div>
        ))}
      </div>

      {/* Statistics Grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Properties"
          value={stats.properties}
          icon={Building2}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          onClick={() => navigate('/landlord/properties')}
          className="ring-2 ring-green-400 shadow-lg hover:ring-green-400"
          subtext={`${dashboard.occupied_rooms || 0} rooms occupied`}
        />
        <StatCard
          label="Active Tenants"
          value={stats.activeTenants}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          onClick={() => navigate('/landlord/rooms?tab=assigned')}
          className="ring-2 ring-blue-400 shadow-lg hover:ring-blue-400"
          subtext={`${dashboard.vacant_rooms || 0} rooms vacant`}
        />
        <StatCard
          label="Revenue This Month"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={TrendingUp}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          onClick={() => navigate('/landlord/payments')}
          className="ring-2 ring-amber-400 shadow-lg hover:ring-amber-400"
          subtext="Verified Paystack payments"
        />
        <StatCard
          label="Overdue Rent"
          value={stats.overdueTenants}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
          onClick={() => document.getElementById('overdue-section')?.scrollIntoView({ behavior: 'smooth' })}
          className={`ring-2 ${stats.overdueTenants > 0 ? 'ring-red-400 shadow-lg hover:ring-red-400' : 'ring-green-300'}`}
          pulse={stats.overdueTenants > 0}
          subtext={stats.overdueTenants > 0 ? 'Requires attention' : 'All tenants current'}
          trendValue={stats.overdueTenants > 0 ? `${stats.overdueTenants} tenants late` : null}
          trendDirection="down"
        />
      </div>

      {/* ── Overdue Tenants Section (Issue 1C) ─────────────────────────────── */}
      {uniqueOverdueTenants.length > 0 && (
        <div id="overdue-section" className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Overdue Tenants</h3>
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {uniqueOverdueTenants.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {uniqueOverdueTenants.map((lease) => {
              const overdueDays = Math.abs(parseInt(lease.days_remaining ?? 0, 10));
              const totalOwedAmt = parseFloat(lease.total_owed || lease.remaining || 0);
              return (
                <div
                  key={lease.lease_id}
                  className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-sm shadow-red-50 hover:shadow-red-100 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-sm font-black text-red-600 shrink-0">
                        {lease.tenant_name?.charAt(0).toUpperCase() || 'T'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{lease.tenant_name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold truncate">
                          @{lease.tenant_username} · {lease.property_name} — Room {lease.room_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-red-700 font-black text-sm animate-pulse">
                        {overdueDays} day{overdueDays === 1 ? '' : 's'} OVERDUE
                      </p>
                      <p className="text-xs text-green-600 font-bold mt-1">
                        Paid: ₦{parseFloat(lease.amount_paid_this_cycle || 0).toLocaleString('en-NG')}
                      </p>
                      <p className="text-xs text-red-700 font-black">
                        Balance: ₦{totalOwedAmt.toLocaleString('en-NG')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-900">Lease Status</h3>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Active tenants</span>
        </div>
        {leases.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No active lease rows available.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Tenant</th>
                <th className="pb-3">Room</th>
                <th className="pb-3 text-green-600">Paid</th>
                <th className="pb-3 text-red-500">Balance Due</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {leases.map((lease) => {
                const status = getDueStatusStyle(lease.days_remaining, lease.is_fully_paid);
                const amtPaid = parseFloat(lease.amount_paid_this_cycle || 0);
                const debt = {
                  carried: parseFloat(lease.carried_forward_balance || 0),
                  // current_cycle_remaining = rent_amount - amount_paid_this_cycle (no carried debt)
                  currentRemaining: parseFloat(lease.current_cycle_remaining ?? lease.remaining ?? 0),
                  total: parseFloat(lease.total_owed || lease.remaining || 0),
                };
                const rentAmt = parseFloat(lease.rent_amount || 0);
                const paidPct = rentAmt > 0 ? Math.min(100, Math.round((amtPaid / rentAmt) * 100)) : 0;
                const isExpanded = expandedLease === lease.lease_id;
                return (
                  <React.Fragment key={lease.lease_id}>
                    <tr className="hover:bg-slate-50 transition duration-150 cursor-pointer" onClick={() => setExpandedLease(isExpanded ? null : lease.lease_id)}>
                      <td className="py-3 text-slate-800 font-bold">{lease.tenant_name}</td>
                      <td className="py-3 text-slate-500">{lease.room_number}</td>
                      {/* Paid this cycle */}
                      <td className="py-3">
                        <span className="text-green-700 font-black text-xs">₦{amtPaid.toLocaleString()}</span>
                        {amtPaid > 0 && rentAmt > 0 && (
                          <div className="w-16 h-1 bg-slate-100 rounded-full mt-1">
                            <div className="h-1 bg-green-500 rounded-full" style={{ width: `${paidPct}%` }} />
                          </div>
                        )}
                      </td>
                      {/* Balance remaining */}
                      <td className="py-3">
                        {debt.total <= 0 ? (
                          <span className="text-green-600 font-black text-xs">Cleared ✓</span>
                        ) : (
                          <span className="text-red-700 font-black text-xs">₦{debt.total.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${status.bg} ${status.text} ${status.pulse ? 'animate-pulse' : ''}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-[11px] font-bold">{isExpanded ? '▲ Hide' : '▼ Details'}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-4 bg-slate-50">
                          {/* Payment progress bar */}
                          <div className="mt-3 mb-3">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                              <span>Payment Progress (this cycle)</span>
                              <span>{paidPct}% paid</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full">
                              <div
                                className="h-2 rounded-full bg-green-500 transition-all duration-500"
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                          </div>
                          <div className="grid gap-3 mt-2" style={{ gridTemplateColumns: `repeat(${2 + (debt.carried > 0 ? 1 : 0)}, 1fr)` }}>
                            {/* Green — Amount paid this cycle */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Paid This Cycle</p>
                              <p className="text-base font-black text-green-700 mt-1">₦{amtPaid.toLocaleString()}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {paidPct}% of ₦{rentAmt.toLocaleString()}
                              </p>
                            </div>
                            {/* Red — Current cycle still owed */}
                            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cycle Remaining</p>
                              <p className="text-base font-black text-slate-800 mt-1">₦{debt.currentRemaining.toLocaleString()}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                After ₦{amtPaid.toLocaleString()} paid
                              </p>
                            </div>
                            {/* Carried forward — only shows when > 0 */}
                            {debt.carried > 0 && (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Previous Debt</p>
                                <p className="text-base font-black text-red-700 mt-1">₦{debt.carried.toLocaleString()}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Carried forward</p>
                              </div>
                            )}
                          </div>
                          {/* Total owed banner */}
                          <div className="mt-3 bg-red-700 rounded-xl px-4 py-3 flex justify-between items-center">
                            <div>
                              <p className="text-[10px] text-red-200 uppercase tracking-wider font-bold">Total Balance Due</p>
                              {debt.carried > 0 && (
                                <p className="text-[10px] text-red-300 mt-0.5">
                                  ₦{debt.currentRemaining.toLocaleString()} cycle + ₦{debt.carried.toLocaleString()} previous
                                </p>
                              )}
                            </div>
                            <p className="text-xl font-black text-white">₦{debt.total.toLocaleString()}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue BarChart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Monthly Revenue
            </h3>
            <p className="text-xs text-slate-500">
              Rent collections aggregated over the last 6 months
            </p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(tick) => `₦${tick.toLocaleString("en-US")}`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    borderColor: "#e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                  }}
                />
                <Bar dataKey="Revenue" fill="#1565C0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Rate PieChart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Occupancy Rate</h3>
            <p className="text-xs text-slate-500">
              Hostel room occupancy split
            </p>
          </div>
          <div className="relative h-[160px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {occupancyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, "Rooms"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-900 leading-none">
                {currentOccupancyPercent}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Occupied
              </span>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-xs font-semibold text-slate-600 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span>
                Occupied (
                {occupancyData.find((d) => d.name === "Occupied")?.value || 0})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-100" />
              <span>
                Vacant (
                {occupancyData.find((d) => d.name === "Vacant")?.value || 0})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments Table */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs lg:col-span-2 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Recent Payments
            </h3>
            <button
              onClick={() => navigate("/landlord/payments")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              View All
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No payments processed yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Tenant</th>
                  <th className="pb-3">Hostel/Room</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {recentPayments.map((p) => (
                  <tr
                    key={p.payment_id}
                    className="hover:bg-slate-50/50 transition duration-150"
                  >
                    <td className="py-3 text-slate-800">
                      <div className="font-bold">
                        {p.tenant_name || "Tenant"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        @{p.tenant_username}
                      </div>
                    </td>
                    <td className="py-3 text-slate-500">
                      {p.hostel_name || p.property_name} (Room {p.room_number})
                    </td>
                    <td className="py-3 font-bold text-slate-800">
                      {formatCurrency(p.amount_paid)}
                    </td>
                    <td className="py-3">
                      <Badge status={p.payment_status}>
                        {p.payment_status}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-400">
                      {formatDate(p.payment_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Info feeds */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Activity Guide
          </h3>
          <div className="space-y-4 text-xs leading-relaxed text-slate-500 font-medium">
            <div className="p-3.5 bg-blue-50/50 border border-blue-100/50 rounded-xl">
              <h4 className="font-bold text-blue-800 text-[11px] uppercase tracking-wider mb-1">
                💡 Pro-tip: Tenant Onboarding
              </h4>
              Provide your unique landlord code{" "}
              <span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-700 font-bold">
                {user?.landlord_code || "PT-XXXXXX"}
              </span>{" "}
              to your tenants. Once they submit their registration, review and
              approve them inside the approvals tab.
            </div>
            <div className="p-3.5 bg-green-50/50 border border-green-100/50 rounded-xl">
              <h4 className="font-bold text-green-800 text-[11px] uppercase tracking-wider mb-1">
                💳 Paystack Bank Settlement
              </h4>
              Ensure your bank credentials are configured inside the{" "}
              <span className="font-bold">Bank Setup</span> tab to enable
              automatic Paystack payouts directly to your settlement accounts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;
