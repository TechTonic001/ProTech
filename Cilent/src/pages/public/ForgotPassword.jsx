// src/pages/public/ForgotPassword.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { authAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success('Reset OTP sent to your email');
      navigate('/verify-otp', { state: { email } });
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
      toast.error(err.message || 'Error processing request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F2A5E] to-[#1565C0] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transition duration-200">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 select-none">
          <div className="flex items-center flex-col">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</div>
            <span className="text-[10px] text-blue-600 font-bold mt-1">Email</span>
          </div>
          <div className="h-0.5 bg-slate-200 flex-1 mx-2 -mt-4" />
          <div className="flex items-center flex-col">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center">2</div>
            <span className="text-[10px] text-slate-400 font-medium mt-1">Verify OTP</span>
          </div>
          <div className="h-0.5 bg-slate-200 flex-1 mx-2 -mt-4" />
          <div className="flex items-center flex-col">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center">3</div>
            <span className="text-[10px] text-slate-400 font-medium mt-1">Reset</span>
          </div>
        </div>

        {/* Brand/Heading */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100/50">
            <KeyRound className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Forgot your password?</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Enter your registered email address and we'll send you a 6-digit verification code.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition duration-150
                  ${error ? 'border-red-300 bg-red-50/50 focus:ring-red-200' : 'border-slate-200'}`}
              />
            </div>
            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm rounded-xl transition duration-150 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending Reset Code...
              </>
            ) : (
              'Send Reset Code'
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
