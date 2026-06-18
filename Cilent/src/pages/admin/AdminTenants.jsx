// src/pages/admin/AdminTenants.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { 
  Users, 
  Mail, 
  Phone, 
  Home, 
  Calendar,
  ArrowLeft 
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminTenants = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getTenants();
      setTenants(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch tenants list');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage size="lg" />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in p-2">
      {/* Back to dashboard */}
      <button 
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">System Tenants</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Management of registered hostel tenants and lease statuses</p>
        </div>
        <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-1.5 hidden sm:block">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{tenants.length} Tenants</span>
        </div>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          title="No Tenants Found"
          description="There are currently no registered tenants on the platform."
          icon={Users}
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/admin/dashboard')}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4">Tenant Profile</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Hostel Allocation</th>
                  <th className="p-4">Approval Status</th>
                  <th className="p-4">Registration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                {tenants.map((tenant) => (
                  <tr key={tenant.user_id} className="hover:bg-slate-50/30 transition">
                    {/* Profile */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-650 flex items-center justify-center font-bold text-sm">
                          {tenant.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm block">{tenant.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">@{tenant.username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="p-4 space-y-1 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{tenant.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-450">
                        <Phone className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                        <span>{tenant.phone_number || '—'}</span>
                      </div>
                    </td>

                    {/* Hostel Room Allocation */}
                    <td className="p-4 space-y-0.5">
                      {tenant.property_name ? (
                        <>
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            Room {tenant.room_number}
                          </div>
                          <div className="text-[10px] text-slate-450 truncate max-w-[200px]">
                            {tenant.property_name}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Awaiting room assignment</span>
                      )}
                    </td>

                    {/* Approval Badge */}
                    <td className="p-4">
                      <Badge status={tenant.is_approved ? 'approved' : 'pending'}>
                        {tenant.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>

                    {/* Created date */}
                    <td className="p-4 text-slate-450">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                        <span>{formatDate(tenant.created_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTenants;
