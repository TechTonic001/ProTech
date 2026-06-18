// src/pages/landlord/TenantApprovals.jsx
import React, { useEffect, useState } from 'react';
import { approvalAPI } from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { 
  UserCheck, 
  AlertTriangle, 
  Mail, 
  Phone, 
  CheckCircle2, 
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

const TenantApprovals = () => {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const [pendingRes, approvedRes] = await Promise.all([
        approvalAPI.getPending(),
        approvalAPI.getApproved ? approvalAPI.getApproved() : Promise.resolve({ data: { data: [] } })
      ]);

      setPending(pendingRes.data.data || []);
      setApproved(approvedRes.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (approvalId, status) => {
    setActionLoadingId(approvalId);
    try {
      await approvalAPI.process(approvalId, { status });
      toast.success(status === 'approved' ? 'Tenant approved! Email confirmation sent.' : 'Tenant request rejected.');
      loadApprovals();
    } catch (err) {
      toast.error(err.message || 'Failed to process request');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <h2 className="text-xl lg:text-2xl font-black text-slate-900">Tenant Approvals</h2>
        <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-full">
          {pending.length} pending
        </span>
      </div>

      {/* Warning Alert banner */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start select-none">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-bounce" />
          <div>
            <h4 className="text-sm font-bold text-amber-800">{pending.length} tenant(s) waiting for your approval</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Review requests. When approved, tenants will receive an email notice enabling portal access to configure payments and room agreements.
            </p>
          </div>
        </div>
      )}

      {/* Pending approvals section */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Pending Requests</h3>
        
        {pending.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No pending requests"
            message="No tenant registration requests are currently waiting. When tenants register with your username, they will appear here."
          />
        ) : (
          <div className="space-y-3">
            {pending.map((req) => (
              <div
                key={req.approval_id}
                className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-xs"
              >
                {/* Initials Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {req.full_name?.charAt(0).toUpperCase()}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{req.full_name}</h4>
                    <span className="text-xs text-blue-600 font-semibold truncate">@{req.username}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {req.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {req.phone_number || '—'}
                    </span>
                  </div>
                  
                  <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Requested on {formatDate(req.created_at)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 self-end md:self-center">
                  <button
                    disabled={actionLoadingId === req.approval_id}
                    onClick={() => handleProcess(req.approval_id, 'rejected')}
                    className="inline-flex items-center gap-1 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-xl transition disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    disabled={actionLoadingId === req.approval_id}
                    onClick={() => handleProcess(req.approval_id, 'approved')}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition hover:shadow-lg hover:shadow-green-500/25 active:scale-95 disabled:opacity-50"
                  >
                    {actionLoadingId === req.approval_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Tenants list */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Approved / Active Tenants</h3>
        
        {approved.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm font-medium">
            No approved tenants found. Once you approve requests, they will populate here.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Approved Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {approved.map((ten, idx) => (
                  <tr key={ten.approval_id} className={`hover:bg-slate-50/50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                    <td className="px-6 py-4 text-blue-600">@{ten.username}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{ten.full_name}</td>
                    <td className="px-6 py-4 text-slate-500">{ten.email}</td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(ten.approved_at)}</td>
                    <td className="px-6 py-4">
                      <Badge status="paid">Approved</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantApprovals;
