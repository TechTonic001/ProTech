// src/pages/public/PaymentVerify.jsx
import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PaymentVerify = () => {
  const [status, setStatus] = useState('verifying');
  const [paymentData, setPaymentData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');

    const verify = async () => {
      if (!reference) {
        setStatus('error');
        return;
      }

      // Wait 3 seconds for webhook to process
      await new Promise((r) => setTimeout(r, 3000));

      try {
        const res = await api.get(`/payments/verify/${reference}`);
        if (res?.data?.payment?.status === 'success') {
          setPaymentData(res.data.payment);
          setStatus('success');
          toast.success('Payment confirmed!');
        } else {
          setStatus('pending');
        }
      } catch (error) {
        setStatus('pending');
      }
    };

    verify();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8 text-center">
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
            <p className="text-slate-700 font-medium">Verifying your payment...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="text-green-600">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Payment Confirmed!</h2>
            <p className="text-slate-600">Your receipt has been emailed to you.</p>
            {paymentData && (
              <div className="bg-slate-50 rounded-lg p-4 text-left text-sm text-slate-700 space-y-2">
                <p><strong>Reference:</strong> {paymentData.reference}</p>
                <p><strong>Amount:</strong> ₦{paymentData.amount?.toLocaleString()}</p>
                <p><strong>Date:</strong> {new Date(paymentData.created_at).toLocaleDateString()}</p>
              </div>
            )}
            <button onClick={() => navigate('/tenant/history')} className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-500 transition">
              View Payment History
            </button>
          </div>
        )}

        {status === 'pending' && (
          <div className="space-y-6">
            <div className="text-yellow-600">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Processing Payment</h2>
            <p className="text-slate-600">If you completed payment, your receipt will arrive by email shortly.</p>
            <button onClick={() => navigate('/tenant/dashboard')} className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-500 transition">
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="text-red-600">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Verification Error</h2>
            <p className="text-slate-600">Unable to verify payment reference. Please contact support.</p>
            <button onClick={() => navigate('/tenant/dashboard')} className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-500 transition">
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentVerify;
