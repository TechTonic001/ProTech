// src/pages/landlord/LandlordPayments.jsx
import React, { useEffect, useState } from 'react';
import { paymentAPI } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { 
  CreditCard, 
  Printer, 
  CheckCircle2, 
  FileText,
  Search,
  ListFilter
} from 'lucide-react';
import toast from 'react-hot-toast';

const LandlordPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentAPI.getHistory();
      setPayments(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load payments history');
    } finally {
      setLoading(false);
    }
  };

  const openReceipt = async (paystackRef) => {
    setReceiptLoading(true);
    try {
      const res = await paymentAPI.getReceipt(paystackRef);
      setSelectedReceipt(res.data.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load receipt details');
    } finally {
      setReceiptLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = 
      (p.tenant_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.paystack_ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.hostel_name || p.property_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      p.payment_status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalRevenue = payments
    .filter(p => p.payment_status === 'success')
    .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl lg:text-2xl font-black text-slate-900">Payment Records</h2>
          <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-full">
            {filteredPayments.length} of {payments.length}
          </span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-right">
          <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Aggregate Revenue</div>
          <div className="text-lg font-black text-green-700">{formatCurrency(totalRevenue)}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs select-none">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tenant, reference, or hostel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition font-bold text-slate-600"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No transactions found"
          message="No payments match your current filter rules or no transactions have been registered on the system yet."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Tenant</th>
                <th className="px-6 py-4">Hostel / Room</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Paystack Ref</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredPayments.map((p, idx) => (
                <tr key={p.payment_id} className={`hover:bg-slate-50/50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{p.tenant_name}</div>
                    <div className="text-[10px] text-slate-400">@{p.tenant_username}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {p.hostel_name || p.property_name} (Room {p.room_number})
                  </td>
                  <td className="px-6 py-4 font-black text-slate-800">{formatCurrency(p.amount_paid)}</td>
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{p.paystack_ref}</td>
                  <td className="px-6 py-4">
                    <Badge status={p.payment_status}>{p.payment_status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{formatDate(p.payment_date)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openReceipt(p.paystack_ref)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipt Dialog Modal */}
      <Modal
        isOpen={!!selectedReceipt || receiptLoading}
        onClose={() => setSelectedReceipt(null)}
        title={selectedReceipt ? 'Official Payment Receipt' : 'Loading Receipt...'}
      >
        {receiptLoading ? (
          <LoadingSpinner />
        ) : selectedReceipt ? (
          <div className="p-0 animate-fade-in">
            {/* Print Area Wrapper */}
            <div id="receipt-modal-card" className="print:block">
              {/* Header banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-center text-white select-none">
                <p className="text-2xl font-black text-white tracking-tight uppercase">
                  {selectedReceipt.hostel_name || 'ProTech'}
                </p>
                <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-extrabold mt-1">
                  Official Rent Receipt
                </p>
                <div className="inline-block mt-3 px-3 py-1 bg-white/10 rounded-lg">
                  <p className="text-xs font-mono font-bold text-slate-300">
                    {selectedReceipt.receipt_number || selectedReceipt.paystack_ref}
                  </p>
                </div>
                <p className="text-3xl font-black text-white mt-4 tracking-tight">
                  {formatCurrency(selectedReceipt.amount_paid)}
                </p>
              </div>

              {/* Body Details */}
              <div className="divide-y divide-slate-100 border-b border-slate-100 font-semibold">
                {[
                  { label: 'Hostel Address', value: selectedReceipt.hostel_address },
                  { label: 'Tenant Name', value: selectedReceipt.tenant_name },
                  { label: 'Username', value: selectedReceipt.tenant_username ? `@${selectedReceipt.tenant_username}` : null },
                  { label: 'Room Info', value: selectedReceipt.room_number ? `${selectedReceipt.room_number} (${selectedReceipt.room_type || 'Single'})` : null },
                  { label: 'Rent Period', value: selectedReceipt.payment_date ? new Date(selectedReceipt.payment_date).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : null },
                  { label: 'Paystack Ref', value: selectedReceipt.paystack_ref, mono: true },
                  { label: 'Payment Date', value: formatDate(selectedReceipt.payment_date) },
                  { label: 'Receipt Emailed To', value: selectedReceipt.tenant_email }
                ].filter(r => r.value).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3.5 px-6 text-xs">
                    <span className="text-slate-400 uppercase tracking-wider font-bold">{item.label}</span>
                    <span className={`text-right max-w-[60%] truncate ${item.mono ? 'font-mono text-slate-500' : 'text-slate-900 font-bold'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Verified Footer tag */}
              <div className="bg-green-50 p-4 border-t border-green-100 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-xs text-green-700 font-bold">
                  Verified by Paystack — Funds sent to landlord bank
                </span>
              </div>
            </div>

            {/* Print Action Toolbar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

    </div>
  );
};

export default LandlordPayments;
