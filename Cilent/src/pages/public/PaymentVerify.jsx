// src/pages/public/PaymentVerify.jsx
import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const PaymentVerify = () => {
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');

    const verify = async () => {
      try {
        await new Promise((r) => setTimeout(r, 3000));
        const res = await api.get(`/payments/verify/${reference}`);
        if (res?.data?.data && res.data.data.payment_status === 'success') {
          setStatus('success');
          setMessage('Payment Confirmed! Your receipt has been emailed to you.');
        } else {
          setStatus('pending');
          setMessage('Payment processing... If you completed payment, your receipt will arrive by email shortly.');
        }
      } catch (error) {
        setStatus('pending');
        setMessage('Payment processing... If you completed payment, your receipt will arrive by email shortly.');
      }
    };

    if (reference) verify();
    else {
      setStatus('error');
      setMessage('No reference provided');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-xl w-full p-8 bg-white rounded-xl shadow">
        <h2 className="text-2xl font-semibold mb-4">{status === 'verifying' ? 'Verifying your payment...' : status === 'success' ? 'Payment Confirmed' : 'Payment Status'}</h2>
        <p className={`mb-6 ${status === 'success' ? 'text-green-600' : 'text-yellow-600'}`}>{message}</p>
        {status === 'success' ? (
          <button onClick={() => navigate('/tenant/history')} className="px-4 py-2 bg-green-600 text-white rounded">Go to Payment History</button>
        ) : (
          <button onClick={() => navigate('/tenant/dashboard')} className="px-4 py-2 bg-yellow-600 text-white rounded">Go to Dashboard</button>
        )}
      </div>
    </div>
  );
};

export default PaymentVerify;
