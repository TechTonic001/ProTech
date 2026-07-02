// src/pages/admin/AdminPayments.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { 
  CreditCard, 
  User, 
  Building2, 
  Calendar,
  Hash,
  ArrowLeft 
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getPayments();
      setPayments(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch global transactions log');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage size="lg" />;

  // useMemo: totalCollected only recalculates when the payments array reference changes
  const totalCollected = useMemo(
    () =>
      payments
        .filter(p => p.payment_status === 'success')
        .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0),
    [payments]
  );

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Platform Payments</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Audit log of rent payments and platform gateway commissions</p>
        </div>
        <div className="bg-slate-900 text-white rounded-xl px-4 py-2 self-stretch sm:self-auto flex items-center justify-between gap-6 border border-slate-800">
          <div className="text-left">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Transacted</span>
            <span className="text-base font-black text-emerald-400 mt-0.5">{formatCurrency(totalCollected)}</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-left">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Volume</span>
            <span className="text-base font-black text-blue-400 mt-0.5">{payments.length} Payments</span>
          </div>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title="No Transactions Logged"
          description="There are currently no transactions processed through the system gateway."
          icon={CreditCard}
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/admin/dashboard')}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4">Payment Reference</th>
                  <th className="p-4">Tenant Info</th>
                  <th className="p-4">Recipient Hostel</th>
                  <th className="p-4">Transaction Details</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                {payments.map((p) => {
                  const isSuccess = p.payment_status === 'success';
                  return (
                    <tr key={p.payment_id} className="hover:bg-slate-50/30 transition">
                      {/* Ref & Receipt */}
                      <td className="p-4 space-y-1">
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {p.receipt_number || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tracking-tight">
                          Ref: {p.paystack_ref}
                        </div>
                      </td>

                      {/* Tenant details */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800 block">{p.tenant_name}</span>
                            <span className="text-[9px] text-slate-405 font-bold uppercase">@{p.tenant_username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Property/Landlord info */}
                      <td className="p-4 space-y-0.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {p.property_name || p.hostel_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Room {p.room_number || '—'}
                        </div>
                      </td>

                      {/* Amount and date */}
                      <td className="p-4 space-y-1">
                        <div className="font-black text-slate-900 text-sm">
                          {formatCurrency(p.amount_paid)}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                          {formatDate(p.payment_date)}
                        </div>
                      </td>

                      {/* Status tag */}
                      <td className="p-4">
                        <Badge status={isSuccess ? 'paid' : 'pending'}>
                          {p.payment_status?.toUpperCase() || 'SUCCESS'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
