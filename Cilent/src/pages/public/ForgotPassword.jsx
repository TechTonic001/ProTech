// src/pages/public/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('OTP sent to your email');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-8 shadow-2xl shadow-slate-950/20">
        <h2 className="text-3xl font-semibold text-white mb-6">Forgot Password</h2>
        <p className="text-sm text-slate-400 mb-6">Enter your account email and we will send an OTP to reset your password.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm text-slate-300">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
            />
          </label>
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold transition hover:bg-blue-500 disabled:opacity-60">
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
        <div className="mt-6 text-sm text-slate-400">
          <Link to="/login" className="hover:text-white">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
