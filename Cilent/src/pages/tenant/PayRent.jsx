// src/pages/tenant/PayRent.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaseAPI, paymentAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { 
  CreditCard, 
  ShieldCheck, 
  Building, 
  User, 
  ArrowLeft,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const PayRent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [lease, setLease] = useState(null);

  useEffect(() => {
    fetchActiveLease();
  }, []);

  const fetchActiveLease = async () => {
    try {
      setLoading(true);
      const res = await leaseAPI.getMine();
      // Find active lease
      const active = res.data.data?.find(l => l.lease_status === 'active');
      if (active) {
        setLease(active);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch lease details');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!lease) return;
    try {
      setPaying(true);
      const res = await paymentAPI.initiate(lease.lease_id);
      const { authorization_url } = res.data.data;
      if (authorization_url) {
        toast.loading('Redirecting to Paystack checkout...');
        window.location.href = authorization_url;
      } else {
        throw new Error('Authorization URL missing from checkout response');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start payment process');
      setPaying(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage size="lg" />;

  if (!lease) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <EmptyState
          title="No Active Lease"
          description="You cannot make rent payments because you do not have an active lease. Please contact your landlord to assign you to a room."
          icon={CreditCard}
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/tenant/dashboard')}
        />
      </div>
    );
  }

  const rentAmount = parseFloat(lease.rent_amount || 0);
  const serviceFee = 500.00;
  const totalAmount = rentAmount + serviceFee;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in p-2">
      {/* Back to dashboard */}
      <button 
        onClick={() => navigate('/tenant/dashboard')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Rent Checkout</h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Review your billing and proceed with transaction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Billing details breakdown */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-50">
            Payment Breakdown
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Hostel Rent</span>
              <span className="font-extrabold text-slate-800">{formatCurrency(rentAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider">
                <span>System Service Fee</span>
                <div className="group relative cursor-pointer" title="Covers secure Paystack gateway processing and automated notifications">
                  <Info className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />
                </div>
              </div>
              <span className="font-extrabold text-slate-800">{formatCurrency(serviceFee)}</span>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
              <span className="text-base font-extrabold text-slate-900 uppercase tracking-wider">Total Amount Due</span>
              <span className="text-2xl font-black text-indigo-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Secure disclaimer */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex gap-3 text-xs leading-relaxed text-indigo-700 font-semibold">
            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
            <div>
              <p className="font-bold">Secured by Paystack</p>
              <p className="text-[11px] text-indigo-600/80 mt-0.5">
                Your credentials are never stored. The transaction is fully encrypted and securely split-routed between your landlord's bank account and platform fees.
              </p>
            </div>
          </div>

          <button
            onClick={handleInitiatePayment}
            disabled={paying}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md shadow-indigo-200 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {paying ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Initializing Transaction...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay {formatCurrency(totalAmount)} Now
              </>
            )}
          </button>
        </div>

        {/* Tenant/Hostel info card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-5 border border-slate-800">
            <h3 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Lease Context</h3>

            <div className="space-y-4">
              {/* Hostel */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Building className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hostel</div>
                  <div className="text-sm font-bold mt-0.5">{lease.property_name}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{lease.property_address}</div>
                </div>
              </div>

              {/* Room */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Room Allocation</div>
                  <div className="text-sm font-bold mt-0.5">Room {lease.room_number}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{lease.room_type || 'Standard'} Suite</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-1 text-[10px] text-slate-400 font-semibold uppercase">
              <div>Landlord Email: {lease.landlord_email}</div>
              <div>Rent Period: Monthly</div>
              <div>Due Day: {lease.due_day}th of month</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-[10px] leading-relaxed text-slate-400 font-bold uppercase tracking-wider text-center">
            🔔 Automate rent notification alerts are dispatched to your registered email {lease.tenant_email} 3 days before due date.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayRent;
