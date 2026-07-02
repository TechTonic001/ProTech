import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatCard from '../../components/ui/StatCard';
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp,
  MapPin,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentProperties, setRecentProperties] = useState([]);

  useEffect(() => {
    loadAdminDashboard();
  }, []);

  const loadAdminDashboard = async () => {
    try {
      setLoading(true);
      const [statsRes, paymentsRes, propertiesRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getPayments(),
        adminAPI.getProperties()
      ]);

      setStats(statsRes.data.data);
      setRecentPayments(paymentsRes.data.data?.slice(0, 5) || []);
      setRecentProperties(propertiesRes.data.data?.slice(0, 5) || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage size="lg" />;

  // useMemo: these arrays are derived from stats and only need to rebuild when
  // stats changes — not on every unrelated state update or re-render
  const roleData = useMemo(() => [
    { name: 'Landlords', value: stats?.total_landlords || 0, color: '#3B82F6' },
    { name: 'Tenants',   value: stats?.total_tenants   || 0, color: '#8B5CF6' },
  ], [stats?.total_landlords, stats?.total_tenants]);

  const revenueTrendData = useMemo(() => [
    { month: 'Jan', revenue: (stats?.total_revenue || 0) * 0.15 },
    { month: 'Feb', revenue: (stats?.total_revenue || 0) * 0.30 },
    { month: 'Mar', revenue: (stats?.total_revenue || 0) * 0.45 },
    { month: 'Apr', revenue: (stats?.total_revenue || 0) * 0.60 },
    { month: 'May', revenue: (stats?.total_revenue || 0) * 0.85 },
    { month: 'Jun', revenue: stats?.total_revenue || 0 },
  ], [stats?.total_revenue]);

  const totalUsers = useMemo(
    () => roleData.reduce((acc, curr) => acc + curr.value, 0),
    [roleData]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">System Control Desk</h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Cross-platform statistics, transaction monitoring, and analytics</p>
      </div>

      {/* Global Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Landlords" 
          value={stats?.total_landlords || 0} 
          icon={Building2} 
          iconColor="text-blue-600" 
          iconBg="bg-blue-50" 
        />
        <StatCard 
          label="Total Tenants" 
          value={stats?.total_tenants || 0} 
          icon={Users} 
          iconColor="text-purple-600" 
          iconBg="bg-purple-50" 
        />
        <StatCard 
          label="Properties Tracked" 
          value={stats?.total_properties || 0} 
          icon={MapPin} 
          iconColor="text-emerald-600" 
          iconBg="bg-emerald-50" 
        />
        <StatCard 
          label="Platform Revenue" 
          value={formatCurrency(stats?.total_revenue || 0)} 
          icon={CreditCard} 
          iconColor="text-amber-600" 
          iconBg="bg-amber-50" 
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Revenue Transaction Curve</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Aggregated platform cashflow flow</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-extrabold bg-green-50 border border-green-150 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-4 h-4" />
              <span>+18.4%</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} contentStyle={{ fontSize: '11px', borderRadius: '12px', borderColor: '#F1F5F9' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User breakdown Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-1">User Account Segments</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">Ratio of Platform Roles</p>
          </div>
          
          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="block text-2xl font-black text-slate-800 leading-none">
                {totalUsers}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Total Users</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-50 text-center">
            {roleData.map((role) => (
              <div key={role.name} className="space-y-0.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                  {role.name}
                </span>
                <span className="block text-lg font-black text-slate-700">{role.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Recent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments table */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Recent Split-Route Payments</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Live platform transactions feed</p>
              </div>
              <button 
                onClick={() => navigate('/admin/payments')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold uppercase">
                No platform payments found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-50">
                      <th className="py-2.5">Tenant</th>
                      <th className="py-2.5">Hostel Name</th>
                      <th className="py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                    {recentPayments.map((p) => (
                      <tr key={p.payment_id} className="hover:bg-slate-50/50">
                        <td className="py-3">
                          <span className="font-extrabold text-slate-800 block">{p.tenant_name}</span>
                          <span className="text-[10px] text-slate-400">@{p.tenant_username}</span>
                        </td>
                        <td className="py-3 max-w-[120px] truncate">
                          {p.property_name || p.hostel_name}
                        </td>
                        <td className="py-3 text-right font-extrabold text-slate-850">
                          {formatCurrency(p.amount_paid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent properties registered */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Recently Registered Properties</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Latest real-estate hostel additions</p>
              </div>
              <button 
                onClick={() => navigate('/admin/properties')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentProperties.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold uppercase">
                No platform properties found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-50">
                      <th className="py-2.5">Property Name</th>
                      <th className="py-2.5">Landlord</th>
                      <th className="py-2.5 text-right">Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                    {recentProperties.map((p) => (
                      <tr key={p.property_id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-extrabold text-slate-800">
                          {p.property_name}
                        </td>
                        <td className="py-3">
                          <span className="font-extrabold block">{p.landlord_name}</span>
                          <span className="text-[10px] text-slate-405">@{p.landlord_username}</span>
                        </td>
                        <td className="py-3 text-right max-w-[150px] truncate text-slate-450">
                          {p.property_address}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
