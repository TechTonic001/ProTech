// src/pages/landlord/LandlordDashboard.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  propertyAPI,
  leaseAPI,
  paymentAPI,
  approvalAPI,
} from "../../utils/api";
import { formatCurrency, formatDate } from "../../utils/formatters";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
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
  const [loading, setLoading] = useState(true);

  // Raw data from API — populated once
  const [properties,   setProperties]   = useState([]);
  const [leases,       setLeases]       = useState([]);
  const [payments,     setPayments]     = useState([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [overdueLeases, setOverdueLeases] = useState([]);

  // ─── Data Fetching ────────────────────────────────────────────────────────
  // useCallback so the function reference is stable (safe to call from effects)
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [propRes, leaseRes, payRes, approvalRes, overdueRes] = await Promise.all([
        propertyAPI.getAll(),
        leaseAPI.getAll(),
        paymentAPI.getHistory(),
        approvalAPI.getPending(),
        leaseAPI.getOverdue().catch(() => ({ data: { data: [] } })),
      ]);

      setProperties(propRes.data.data   || []);
      setLeases(leaseRes.data.data      || []);
      setPayments(payRes.data.data      || []);
      setPendingApprovalsCount((approvalRes.data.data || []).length);
      setOverdueLeases(overdueRes.data.data || []);
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ─── Derived Stats ────────────────────────────────────────────────────────
  // All computed values use useMemo so they only re-run when their inputs change,
  // not on every component re-render.

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  // Active leases — O(n)
  const activeLeases = useMemo(
    () => leases.filter((l) => l.lease_status === "active"),
    [leases]
  );

  // Current month revenue — O(n)
  const currentMonthRevenue = useMemo(
    () =>
      payments
        .filter((p) => {
          const pDate = new Date(p.payment_date);
          return (
            p.payment_status === "success" &&
            pDate.getMonth() === currentMonth &&
            pDate.getFullYear() === currentYear
          );
        })
        .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0),
    [payments, currentMonth, currentYear]
  );

  // ── OPTIMIZED: Overdue count O(n²) → O(n) ─────────────────────────────────
  // BEFORE: nested .some() inside .filter() — O(leases × payments) every render
  // AFTER:  build a Set of paid lease keys in O(payments), then filter in O(leases)
  const overdueCount = useMemo(() => {
    const todayDay = now.getDate();

    // Step 1: Build a lookup Set of "lease_id|month|year" for every successful
    //         payment in the current month — O(payments)
    const paidThisMonthSet = new Set();
    for (const p of payments) {
      if (p.payment_status !== "success") continue;
      const pDate = new Date(p.payment_date);
      if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
        paidThisMonthSet.add(p.lease_id);
      }
    }

    // Step 2: Filter active leases — O(leases), each lookup is O(1)
    return activeLeases.filter((l) => {
      const isPastDue = todayDay > (l.due_day || 5);
      return isPastDue && !paidThisMonthSet.has(l.lease_id);
    }).length;
  }, [activeLeases, payments, currentMonth, currentYear, now]);

  // Stats object assembled from already-memoized values
  const stats = useMemo(
    () => ({
      properties:     properties.length,
      activeTenants:  activeLeases.length,
      monthlyRevenue: currentMonthRevenue,
      overdueTenants: overdueCount,
    }),
    [properties.length, activeLeases.length, currentMonthRevenue, overdueCount]
  );

  // Recent payments — take only the first 5 from the current page
  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);

  // BarChart revenue data — last 6 months aggregation — O(payments)
  const revenueData = useMemo(() => {
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

  // PieChart occupancy data
  const occupancyData = useMemo(() => {
    let totalRooms   = properties.reduce((sum, p) => sum + (p.total_rooms || 0), 0);
    let occupiedRooms = activeLeases.length;
    let vacantRooms   = Math.max(0, totalRooms - occupiedRooms);
    if (totalRooms === 0) { totalRooms = 10; vacantRooms = 10; occupiedRooms = 0; }
    return [
      { name: "Occupied", value: occupiedRooms, color: "#1565C0" },
      { name: "Vacant",   value: vacantRooms,   color: "#E3F2FD" },
    ];
  }, [properties, activeLeases]);

  // Occupancy percentage — derived from already-memoized occupancyData
  const currentOccupancyPercent = useMemo(() => {
    const total    = occupancyData.reduce((sum, d) => sum + d.value, 0);
    const occupied = occupancyData.find((d) => d.name === "Occupied")?.value || 0;
    if (total === 0 || total === 10) return "0%";
    return `${Math.round((occupied / total) * 100)}%`;
  }, [occupancyData]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-8">
      {/* Welcome Banner + Landlord Code */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 relative overflow-hidden shadow-md shadow-blue-500/10">
        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] items-start">
          <div className="relative z-10">
            <RealTimeGreeting
              name={user?.full_name || `@${user?.username}`}
              subtitle="Here is your property overview for today."
            />
          </div>
{/* {UNIQUE LANDLORD CODE} */}
          <div className="bg-amber-50 rounded-3xl border-2 border-amber-300 p-5 shadow-xs flex flex-col justify-between gap-4 min-h-[170px]">
            <div>
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Your Unique Landlord Code
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 font-mono mt-3 tracking-wider break-all">
                {user?.landlord_code || "PT-XXXXXX"}
              </p>
              <p className="text-[1px] sm:text-xs text-amber-600 mt-3 leading-relaxed">
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
              className="self-start bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-2xl font-semibold text-sm flex items-center gap-2 transition"
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
            color: "text-blue-600",
            bg: "bg-blue-50",
            path: "/landlord/properties",
          },
          {
            title: "Manage Rooms",
            sub: "View room status",
            icon: DoorOpen,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
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
            color: "text-green-600",
            bg: "bg-green-50",
            path: "/landlord/payments",
          },
        ].map((act, i) => (
          <div
            key={i}
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
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Active Tenants"
          value={stats.activeTenants}
          icon={Users}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          label="Revenue This Month"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={TrendingUp}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Overdue Rent"
          value={stats.overdueTenants}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
          trendValue={
            stats.overdueTenants > 0
              ? `${stats.overdueTenants} tenants late`
              : null
          }
          trendDirection="down"
          extraBadge={
            stats.overdueTenants > 0 ? (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            ) : null
          }
        />
      </div>

      {/* ── Overdue Tenants Section (Issue 1C) ─────────────────────────────── */}
      {overdueLeases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Overdue Tenants</h3>
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {overdueLeases.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {overdueLeases.map((lease) => (
              <div
                key={lease.lease_id}
                className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-sm shadow-red-50 hover:shadow-red-100 transition"
              >
                {/* Tenant header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-sm font-black text-red-600">
                    {lease.tenant_name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{lease.tenant_name}</p>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">
                      {lease.property_name} — Room {lease.room_number}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-[10px] font-black text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                    {lease.days_overdue}d overdue
                  </span>
                </div>
                {/* Balance */}
                <div className="flex justify-between items-center pt-2 border-t border-red-100">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Balance Due</span>
                  <span className="text-sm font-black text-red-600">
                    ₦{parseFloat(lease.balance_due || lease.rent_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <BarChart data={revenueData}>
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
