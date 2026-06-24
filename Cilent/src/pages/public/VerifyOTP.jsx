// src/pages/public/VerifyOTP.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Mail, Loader2, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';
import { authAPI } from '../../utils/api';
import OTPInput from '../../components/ui/OTPInput';
import PasswordStrength from '../../components/ui/PasswordStrength';
import toast from 'react-hot-toast';
import { validatePassword } from '../../utils/validatePassword';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (timeLeft <= 0) {
      setExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setTimeLeft(600);
      setExpired(false);
      setOtp('');
      toast.success('New OTP sent successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (otp.length !== 6) {
      nextErrors.otp = 'Please enter the 6-digit code';
    }
    if (!newPassword) {
      nextErrors.password = 'New password is required';
    } else {
      const { isValid } = validatePassword(newPassword);
      if (!isValid) nextErrors.password = 'Password does not meet all requirements.';
    }
    if (confirmPassword !== newPassword) {
      nextErrors.confirm = 'Passwords do not match';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (expired) {
      toast.error('The verification code has expired. Please resend a new code.');
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.resetPassword({
        email,
        otp_code: otp,
        new_password: newPassword
      });
      toast.success('Password updated successfully');
      navigate('/reset-success');
    } catch (err) {
      setErrors({ api: err.message || 'Verification failed' });
      toast.error(err.message || 'Failed to reset password');
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
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">✓</div>
            <span className="text-[10px] text-blue-600 font-bold mt-1">Email</span>
          </div>
          <div className="h-0.5 bg-blue-600 flex-1 mx-2 -mt-4" />
          <div className="flex items-center flex-col">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</div>
            <span className="text-[10px] text-blue-600 font-bold mt-1">Verify OTP</span>
          </div>
          <div className="h-0.5 bg-slate-200 flex-1 mx-2 -mt-4" />
          <div className="flex items-center flex-col">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center">3</div>
            <span className="text-[10px] text-slate-400 font-medium mt-1">Reset</span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4 border border-green-100/50">
            <Mail className="w-8 h-8 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Check your email</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            We sent a 6-digit code to <span className="font-semibold text-slate-800">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* OTP Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">
              Verification Code
            </label>
            <OTPInput 
              value={otp} 
              onChange={(val) => {
                setOtp(val);
                if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
              }} 
              hasError={!!errors.otp} 
            />
            
            {errors.otp && <p className="text-xs text-red-500 mt-1">{errors.otp}</p>}

            {/* Timer and Resend */}
            <div className="flex justify-between items-center text-xs mt-2">
              {expired ? (
                <span className="text-red-500 font-bold">Code expired</span>
              ) : (
                <span className={`font-semibold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
                  Code expires in {formatTime()}
                </span>
              )}
              
              <button
                type="button"
                disabled={!expired || loading}
                onClick={handleResend}
                className={`font-bold hover:underline ${expired ? 'text-blue-600 cursor-pointer' : 'text-slate-400 cursor-not-allowed'}`}
              >
                Resend Code
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 my-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center mb-3">
              Then set your new password
            </span>
          </div>

          {/* New Password */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                }}
                className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition duration-150
                  ${errors.password ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            <PasswordStrength password={newPassword} />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirm) setErrors(prev => ({ ...prev, confirm: '' }));
                }}
                className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition duration-150
                  ${errors.confirm ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
          </div>

          {errors.api && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              {errors.api}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition duration-150 hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default VerifyOTP;
