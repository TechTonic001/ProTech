// src/pages/landlord/LandlordDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { propertyAPI, leaseAPI, paymentAPI, approvalAPI } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
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
  Copy
} from 'lucide-react';
import { toast } from 'react-hot-toast';
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
  Legend
} from 'recharts';

const LandlordDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    properties: 0,
    activeTenants: 0,
    monthlyRevenue: 0,
    overdueTenants: 0
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [revenueData, setRevenueData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [propRes, leaseRes, payRes, approvalRes] = await Promise.all([
        propertyAPI.getAll(),
        leaseAPI.getAll(),
        paymentAPI.getHistory(),
        approvalAPI.getPending()
      ]);

      const properties = propRes.data.data || [];
      const leases = leaseRes.data.data || [];
      const payments = payRes.data.data || [];
      const approvals = approvalRes.data.data || [];

      // Calculate stats
      const activeLeases = leases.filter(l => l.lease_status === 'active');
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const currentMonthRevenue = payments
        .filter(p => {
          const pDate = new Date(p.payment_date);
          return p.payment_status === 'success' && 
                 pDate.getMonth() === currentMonth && 
                 pDate.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

      // Overdue is calculated if rent is overdue (e.g. status includes overdue or unpaid with past due dates)
      const overdueCount = leases.filter(l => {
        if (l.lease_status !== 'active') return false;
        // Simple logic: if due date passed for current month and no payment is logged for it
        const hasPaidCurrentMonth = payments.some(p => {
          const pDate = new Date(p.payment_date);
          return p.lease_id === l.lease_id && 
                 p.payment_status === 'success' && 
                 pDate.getMonth() === currentMonth && 
                 pDate.getFullYear() === currentYear;
        });
        const todayDay = now.getDate();
        return !hasPaidCurrentMonth && todayDay > (l.due_day || 5);
      }).length;

      setStats({
        properties: properties.length,
        activeTenants: activeLeases.length,
        monthlyRevenue: currentMonthRevenue,
        overdueTenants: overdueCount
      });

      setRecentPayments(payments.slice(0, 5));
      setPendingApprovalsCount(approvals.length);

      // BarChart Revenue logic (aggregate last 6 months)
      const monthlySums = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();
        const label = `${monthNames[m]} ${y}`;
        monthlySums[label] = { month: label, Revenue: 0 };
      }

      payments.forEach(p => {
        if (p.payment_status !== 'success') return;
        const pDate = new Date(p.payment_date);
        const mLabel = `${monthNames[pDate.getMonth()]} ${pDate.getFullYear()}`;
        if (monthlySums[mLabel]) {
          monthlySums[mLabel].Revenue += parseFloat(p.amount_paid);
        }
      });
      setRevenueData(Object.values(monthlySums));

      // PieChart Occupancy logic
      let totalRooms = properties.reduce((sum, p) => sum + (p.total_rooms || 0), 0);
      let occupiedRooms = activeLeases.length;
      let vacantRooms = Math.max(0, totalRooms - occupiedRooms);

      // Default if no rooms exist
      if (totalRooms === 0) {
        totalRooms = 10;
        vacantRooms = 10;
      }

      setOccupancyData([
        { name: 'Occupied', value: occupiedRooms, color: '#1565C0' },
        { name: 'Vacant', value: vacantRooms, color: '#E3F2FD' }
      ]);

    } catch (err) {
      console.error('Failed to load dashboard statistics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentOccupancyPercent = () => {
    const total = occupancyData.reduce((sum, d) => sum + d.value, 0);
    const occupied = occupancyData.find(d => d.name === 'Occupied')?.value || 0;
    if (total === 0 || total === 10) return '0%';
    return `${Math.round((occupied / total) * 100)}%`;
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 relative overflow-hidden shadow-md shadow-blue-500/10">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-xl lg:text-2xl font-black text-white">Good morning, @{user?.username} 👋</h2>
          <p className="text-blue-100 text-sm mt-1">Here is your property overview for today.</p>
          <p className="text-blue-200/70 text-xs mt-1.5 font-medium uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Decorative Grid Illustration */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1.5 select-none opacity-20">
          <div className="w-16 h-32 bg-white/20 rounded-md p-2 flex flex-col justify-between">
            <div className="flex justify-between"><div className="w-3 h-3 bg-white/40 rounded-xs" /><div className="w-3 h-3 bg-white/40 rounded-xs" /></div>
            <div className="flex justify-between"><div className="w-3 h-3 bg-white/40 rounded-xs" /><div className="w-3 h-3 bg-white/40 rounded-xs" /></div>
            <div className="flex justify-between"><div className="w-3 h-3 bg-white/40 rounded-xs" /><div className="w-3 h-3 bg-white/40 rounded-xs" /></div>
          </div>
          <div className="w-16 h-40 bg-white/20 rounded-md p-2 flex flex-col justify-between">
            <div className="flex justify-between"><div className="w-3 h-3 bg-white/40 rounded-xs" /><div className="w-3 h-3 bg-white/40 rounded-xs" /></div>
            <div className="flex justify-between"><div className="w-3 h-3 bg-white/40 rounded-xs" /><div className="w-3 h-3 bg-white/40 rounded-xs" /></div>
            <div className="flex justify-between"><div className="w-3 h-3 bg-white/40 rounded-xs" /><div className="w-3 h-3 bg-white/40 rounded-xs" /></div>
            <div className="flex justify-between"><div className="w-3 h-3 bg-white/40 rounded-xs" /><div className="w-3 h-3 bg-white/40 rounded-xs" /></div>
          </div>
        </div>
      </div>

      {/* Unique Landlord Code Card */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Your Unique Landlord Code
          </p>
          <p className="text-3xl font-black text-slate-900 font-mono mt-1 tracking-wider">
            {user?.landlord_code || 'PT-XXXXXX'}
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Share this code with tenants,they need it to register
          </p>
        </div>
        <button
          onClick={() => {
            if (user?.landlord_code) {
              navigator.clipboard.writeText(user.landlord_code);
              toast.success('Code copied to clipboard!');
            } else {
              toast.error('No landlord code found');
            }
          }}
          className="bg-amber-500 hover:bg-amber-600 text-white
                     px-4 py-2 rounded-xl font-semibold text-sm
                     flex items-center gap-2 transition"
        >
          <Copy className="w-4 h-4" />
          Copy Code
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Add Property', sub: 'Register a new hostel', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', path: '/landlord/properties' },
          { title: 'Manage Rooms', sub: 'View room status', icon: DoorOpen, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/landlord/rooms' },
          { 
            title: 'Approvals', 
            sub: 'Review requests', 
            icon: UserCheck, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50', 
            path: '/landlord/approvals',
            badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null 
          },
          { title: 'Payments', sub: 'View all records', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50', path: '/landlord/payments' }
        ].map((act, i) => (
          <div
            key={i}
            onClick={() => navigate(act.path)}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-lg hover:shadow-slate-100 hover:border-blue-100 cursor-pointer transition duration-200 flex flex-col relative"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.bg} ${act.color}`}>
              <act.icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-3">{act.title}</h3>
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
        <StatCard label="Total Properties" value={stats.properties} icon={Building2} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard label="Active Tenants" value={stats.activeTenants} icon={Users} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard label="Revenue This Month" value={formatCurrency(stats.monthlyRevenue)} icon={TrendingUp} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard 
          label="Overdue Rent" 
          value={stats.overdueTenants} 
          icon={AlertTriangle} 
          iconColor="text-red-500" 
          iconBg="bg-red-50" 
          trendValue={stats.overdueTenants > 0 ? `${stats.overdueTenants} tenants late` : null}
          trendDirection="down"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue BarChart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Monthly Revenue</h3>
            <p className="text-xs text-slate-500">Rent collections aggregated over the last 6 months</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(tick) => `₦${tick.toLocaleString('en-US')}`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} 
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
            <p className="text-xs text-slate-500">Hostel room occupancy split</p>
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
                <Tooltip formatter={(value) => [value, 'Rooms']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-900 leading-none">{currentOccupancyPercent()}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Occupied</span>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-xs font-semibold text-slate-600 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span>Occupied ({occupancyData.find(d => d.name === 'Occupied')?.value || 0})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-100" />
              <span>Vacant ({occupancyData.find(d => d.name === 'Vacant')?.value || 0})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments Table */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs lg:col-span-2 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Payments</h3>
            <button 
              onClick={() => navigate('/landlord/payments')}
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
                  <tr key={p.payment_id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="py-3 text-slate-800">
                      <div className="font-bold">{p.tenant_name || 'Tenant'}</div>
                      <div className="text-[10px] text-slate-400">@{p.tenant_username}</div>
                    </td>
                    <td className="py-3 text-slate-500">
                      {p.hostel_name || p.property_name} (Room {p.room_number})
                    </td>
                    <td className="py-3 font-bold text-slate-800">{formatCurrency(p.amount_paid)}</td>
                    <td className="py-3">
                      <Badge status={p.payment_status}>{p.payment_status}</Badge>
                    </td>
                    <td className="py-3 text-slate-400">{formatDate(p.payment_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Info feeds */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Activity Guide</h3>
          <div className="space-y-4 text-xs leading-relaxed text-slate-500 font-medium">
            <div className="p-3.5 bg-blue-50/50 border border-blue-100/50 rounded-xl">
              <h4 className="font-bold text-blue-800 text-[11px] uppercase tracking-wider mb-1">💡 Pro-tip: Tenant Onboarding</h4>
              Provide your unique landlord code <span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-700 font-bold">{user?.landlord_code || 'PT-XXXXXX'}</span> to your tenants. Once they submit their registration, review and approve them inside the approvals tab.
            </div>
            <div className="p-3.5 bg-green-50/50 border border-green-100/50 rounded-xl">
              <h4 className="font-bold text-green-800 text-[11px] uppercase tracking-wider mb-1">💳 Paystack Bank Settlement</h4>
              Ensure your bank credentials are configured inside the <span className="font-bold">Bank Setup</span> tab to enable automatic Paystack payouts directly to your settlement accounts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;
