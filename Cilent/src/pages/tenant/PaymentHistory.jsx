// src/pages/tenant/PaymentHistory.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await api.get('/payments/history');
      setPayments(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const openReceipt = async (paystack_ref) => {
    setReceiptLoading(true);
    try {
      const res = await api.get(`/payments/receipt/${paystack_ref}`);
      setReceipt(res.data.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load receipt');
    } finally {
      setReceiptLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatAmount = (a) => '₦' + Number(a || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-slate-100 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold">Payment History</h1>
        <p className="text-slate-500">See your rent payment records and download receipts.</p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">
            <p className="text-lg">No payments yet.</p>
            <p className="text-sm mt-2">Your payment records will appear here after your first rent payment.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Hostel</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.payment_id} className="border-b last:border-b-0 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 font-medium">{p.hostel_name || p.property_name || '—'}</td>
                    <td className="px-4 py-3">{p.room_number || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{formatAmount(p.amount_paid)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${p.payment_status === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.paystack_ref}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openReceipt(p.paystack_ref)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline"
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Receipt Modal ── */}
      {(receipt || receiptLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { if (!receiptLoading) setReceipt(null); }}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" id="receipt-print" onClick={(e) => e.stopPropagation()}>
            {receiptLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : receipt ? (
              <>
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center">
                  <p className="text-2xl font-extrabold text-white">{receipt.hostel_name || 'ProTech'}</p>
                  <p className="text-xs text-white/60 uppercase tracking-[0.2em] mt-1">Official Rent Receipt</p>
                  <div className="inline-block mt-3 px-3 py-1 bg-amber-400/20 rounded-full">
                    <p className="text-xs font-mono font-bold text-amber-400">{receipt.receipt_number || receipt.paystack_ref}</p>
                  </div>
                  <p className="text-3xl font-black text-white mt-4">{formatAmount(receipt.amount_paid)}</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3">
                  {[
                    { label: 'Hostel Name', value: receipt.hostel_name },
                    { label: 'Hostel Address', value: receipt.hostel_address },
                    { label: 'Tenant', value: receipt.tenant_name },
                    { label: 'Username', value: receipt.tenant_username ? `@${receipt.tenant_username}` : null },
                    { label: 'Room', value: receipt.room_number ? `${receipt.room_number}${receipt.room_type ? ` — ${receipt.room_type}` : ''}` : null },
                    { label: 'Amount Paid', value: formatAmount(receipt.amount_paid), green: true },
                    { label: 'Paystack Ref', value: receipt.paystack_ref, mono: true },
                    { label: 'Email Sent To', value: receipt.tenant_email },
                    { label: 'Payment Date', value: formatDate(receipt.payment_date) },
                  ].filter(r => r.value).map((r, i) => (
                    <div key={i} className="flex justify-between items-start text-sm border-b border-slate-100 pb-2 last:border-b-0">
                      <span className="text-slate-500 font-medium">{r.label}</span>
                      <span className={`text-right max-w-[60%] ${r.green ? 'text-green-700 font-bold' : r.mono ? 'font-mono text-xs text-slate-600' : 'text-slate-900 font-semibold'}`}>{r.value}</span>
                    </div>
                  ))}

                  {/* Verified badge */}
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                    <p className="text-sm text-green-700 font-semibold">✓ Verified by Paystack — Funds sent to landlord bank</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => window.print()} className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition">
                      🖨 Print Receipt
                    </button>
                    <button onClick={() => setReceipt(null)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">
                      ✕ Close
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
