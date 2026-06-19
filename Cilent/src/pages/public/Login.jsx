// src/pages/public/Login.jsx
import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import {
  Lock,
  Bell,
  Smartphone,
  AtSign,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  LogIn,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Star,
  UserPlus,
  CheckCircle2,
  Info,
  KeyRound
} from 'lucide-react';

const initialSignIn = {
  identifier: '',
  password: '',
};

const initialRegister = {
  username: '',
  full_name: '',
  email: '',
  phone_number: '',
  password: '',
  confirm_password: '',
  role: '',
  hostel_name: '',
  hostel_address: '',
  landlord_code: '',
};

const Login = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  
  const [mode, setMode] = useState(roleParam ? 'register' : 'signin');
  const [signIn, setSignIn] = useState(initialSignIn);
  const [register, setRegister] = useState({
    ...initialRegister,
    role: roleParam === 'landlord' || roleParam === 'tenant' ? roleParam : '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  
  // Visibility toggles for password fields
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Success state for tenant registration
  const [successTenantInfo, setSuccessTenantInfo] = useState(null);

  // Tab switch animation state
  const [opacityClass, setOpacityClass] = useState('opacity-100 translate-y-0');

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Handle Tab Switch with exit-entry transition
  const handleTabChange = (newTab) => {
    if (newTab === mode || loading) return;
    
    // Clear alerts and validation errors
    setErrors({});
    setPendingApproval(false);
    setSuccessTenantInfo(null);
    
    setOpacityClass('opacity-0 -translate-y-2');
    setTimeout(() => {
      setMode(newTab);
      setOpacityClass('opacity-100 translate-y-0');
    }, 200);
  };

  // Clear single field error when typing
  const handleSignInChange = (e) => {
    const { name, value } = e.target;
    setSignIn((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegister((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Password Strength Evaluation
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(register.password);
  const strengthLabels = ['Unavailable', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['text-slate-400', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600'];
  const segmentColors = ['bg-slate-200', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  // Form Validations
  const validateSignIn = () => {
    const nextErrors = {};
    if (!signIn.identifier) nextErrors.identifier = 'Email or Username is required';
    if (!signIn.password) nextErrors.password = 'Password is required';
    
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateRegister = () => {
    const nextErrors = {};

    if (!register.role) {
      nextErrors.role = 'Please select a role';
      setErrors(nextErrors);
      return false;
    }

    if (!register.username) {
      nextErrors.username = 'Username is required';
    } else if (!/^\w{3,}$/.test(register.username)) {
      nextErrors.username = 'Min 3 characters. Letters, numbers & underscores only';
    }

    if (!register.full_name) {
      nextErrors.full_name = 'Full name is required';
    } else if (register.full_name.trim().length < 2) {
      nextErrors.full_name = 'Enter at least 2 characters';
    }

    if (!register.email) {
      nextErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(register.email)) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!register.phone_number) {
      nextErrors.phone_number = 'Phone number is required';
    } else if (!/^\d{10,}$/.test(register.phone_number.replace(/\D/g, ''))) {
      nextErrors.phone_number = 'Enter at least 10 digits';
    }

    if (!register.password) {
      nextErrors.password = 'Password is required';
    } else if (register.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    if (!register.confirm_password) {
      nextErrors.confirm_password = 'Confirm your password';
    } else if (register.confirm_password !== register.password) {
      nextErrors.confirm_password = 'Passwords do not match';
    }

    if (register.role === 'landlord') {
      if (!register.hostel_name || !register.hostel_name.trim()) {
        nextErrors.hostel_name = 'Hostel name is required';
      }
      if (!register.hostel_address || !register.hostel_address.trim()) {
        nextErrors.hostel_address = 'Hostel address is required';
      }
    }

    if (register.role === 'tenant') {
      if (!register.landlord_code || !register.landlord_code.trim()) {
        nextErrors.landlord_code = "Please enter your landlord's unique code to register.";
      } else if (!/^PT-[A-Z0-9]{6}$/i.test(register.landlord_code)) {
        nextErrors.landlord_code = 'Code must match PT-XXXXXX format';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Submissions
  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setPendingApproval(false);

    if (!validateSignIn()) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        identifier: signIn.identifier,
        password: signIn.password,
      });

      // Handle backend returning token and user details inside data key or directly
      const resData = response.data?.data || response.data;
      const { token, user } = resData;

      if (token && user) {
        login(token, user);
        toast.success('Welcome back!');
        
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'landlord') {
          navigate('/landlord/dashboard');
        } else if (user.role === 'tenant') {
          navigate('/tenant/dashboard');
        } else {
          navigate('/');
        }
      } else {
        throw new Error('Unexpected authentication response payload');
      }
    } catch (error) {
      const message = error.message || 'Login failed';
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('pending landlord approval') || lowerMessage.includes('pending') || lowerMessage.includes('approval')) {
        setPendingApproval(true);
      } else if (lowerMessage.includes('invalid credentials') || lowerMessage.includes('credentials') || lowerMessage.includes('unauthorized')) {
        setErrors({ identifier: 'Invalid credentials' });
      } else {
        toast.error('Server error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateRegister()) return;

    setLoading(true);
    try {
      const payload = {
        username: register.username,
        full_name: register.full_name,
        email: register.email,
        phone_number: register.phone_number,
        password: register.password,
        role: register.role,
      };

      if (register.role === 'landlord') {
        payload.hostel_name = register.hostel_name;
        payload.hostel_address = register.hostel_address;
      } else if (register.role === 'tenant') {
        payload.landlord_code = register.landlord_code;
      }

      const response = await api.post('/auth/register', payload);

      if (register.role === 'landlord') {
        toast.success('Account created! Please sign in.');
        setSignIn((prev) => ({ ...prev, identifier: register.email }));
        setRegister(initialRegister);
        setMode('signin');
      } else {
        // Success state for tenant
        setSuccessTenantInfo({
          landlord_hostel: response.data.landlord_hostel || 'your landlord',
          email: register.email,
        });
        setRegister(initialRegister);
      }
    } catch (error) {
      const message = error.message || 'Registration failed';
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('email is already registered') || lowerMessage.includes('email already') || lowerMessage.includes('email exists')) {
        setErrors({ email: 'Email already registered' });
      } else if (lowerMessage.includes('username is already taken') || lowerMessage.includes('username already') || lowerMessage.includes('username taken')) {
        setErrors({ username: 'Username already taken' });
      } else if (lowerMessage.includes('landlord not found') || lowerMessage.includes('landlord code not found') || lowerMessage.includes('landlord_code') || lowerMessage.includes('landlord code')) {
        setErrors({ landlord_code: 'This code was not found. Double-check with your landlord.' });
      } else {
        toast.error('Registration failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-outfit min-h-screen flex flex-col lg:flex-row bg-white selection:bg-blue-500 selection:text-white">
      {/* Custom styles inject */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;900&display=swap');
        
        .font-outfit {
          font-family: 'Outfit', sans-serif;
        }

        @keyframes breathe {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(2%, -4%) scale(1.08);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-breathe {
          animation: breathe 8s ease-in-out infinite alternate;
        }

        @keyframes slideDown {
          from {
            height: 0;
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            height: auto;
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-down {
          animation: slideDown 150ms ease-out forwards;
        }

        @keyframes bounceIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
            opacity: 1;
          }
          80% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }
        
        .animate-bounce-in {
          animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />

      {/* COMPACT NAVY TOP BAR (Tablet / Mobile only) */}
      <div className="lg:hidden bg-[#0A1628] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 select-none">
        <div className="flex items-center gap-3">
          <div className="bg-white/15 p-2 rounded-xl flex items-center justify-center text-2xl">
            🏠
          </div>
          <span className="text-2xl font-black tracking-tight">ProTech</span>
        </div>
        <span className="bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
          PWA ENABLED
        </span>
      </div>

      {/* LEFT COLUMN - Decorative Brand Panel (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 lg:h-screen flex-col justify-between p-12 bg-gradient-to-br from-[#0A1628] via-[#0F2A5E] to-[#1565C0] text-white relative overflow-hidden select-none">
        {/* Subtle breathing radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22)_0%,transparent_65%)] animate-breathe pointer-events-none" />

        <div className="flex flex-col justify-between h-full max-w-md mx-auto py-8 z-10 relative">
          {/* Logo Area */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 justify-center mb-4">
              <div className="bg-white/15 p-3 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-black/10">
                🏠
              </div>
              <span className="text-5xl font-black text-white tracking-tight">ProTech</span>
            </div>
            <span className="bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-full shadow-md shadow-amber-400/20">
              PWA ENABLED
            </span>
          </div>

          {/* Tagline & Features */}
          <div className="flex flex-col items-center my-auto">
            <h2 className="text-xl text-white/80 italic font-light text-center">
              Smart Hostel Management
            </h2>
            <div className="w-12 h-0.5 bg-amber-400 mx-auto my-6" />

            {/* Feature List */}
            <div className="space-y-6 text-left w-full mt-2">
              {/* Item 1 */}
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/30 rounded-xl p-2.5 flex-shrink-0 flex items-center justify-center w-11 h-11 border border-blue-500/10">
                  <Lock className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">Bank-Grade Security</h4>
                  <p className="text-white/50 text-xs">Paystack verified payments</p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-4">
                <div className="bg-amber-500/30 rounded-xl p-2.5 flex-shrink-0 flex items-center justify-center w-11 h-11 border border-amber-500/10">
                  <Bell className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">Automated Reminders</h4>
                  <p className="text-white/50 text-xs">30, 7, and 1 day email alerts</p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start gap-4">
                <div className="bg-green-500/30 rounded-xl p-2.5 flex-shrink-0 flex items-center justify-center w-11 h-11 border border-green-500/10">
                  <Smartphone className="w-5 h-5 text-green-300" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">Works on Any Phone</h4>
                  <p className="text-white/50 text-xs">No app download required</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Text */}
          <div className="text-white/30 text-xs text-center tracking-wider">
            SQI College of ICT, Ogbomoso
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Form Panel */}
      <div className="w-full lg:w-1/2 lg:h-screen lg:overflow-y-auto bg-white flex flex-col px-6 py-8 md:px-10 md:py-12 lg:px-12 lg:py-14">
        <div className="w-full max-w-[420px] mx-auto my-auto flex flex-col">
          {/* Success screen replacing form panel (Tenant Success State) */}
          {successTenantInfo ? (
            <div className="text-center p-6 bg-white rounded-2xl">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce-in" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-4">Account Created!</h2>
              <p className="text-slate-600 mt-2 text-sm">
                Request sent to the landlord of <span className="font-semibold">{successTenantInfo.landlord_hostel}</span>
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Check your email at <span className="font-medium text-slate-700">{successTenantInfo.email}</span>
              </p>
              <p className="text-slate-400 text-xs mt-1">
                You'll receive another email once approved.
              </p>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left mt-6">
                <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> What happens next:
                </h4>
                <ol className="text-xs text-blue-600 list-decimal pl-4 space-y-1">
                  <li>Your landlord reviews your request</li>
                  <li>You receive an approval email</li>
                  <li>Log in and start paying rent</li>
                </ol>
              </div>

              {/* Back to Sign In button */}
              <button
                type="button"
                onClick={() => handleTabChange('signin')}
                className="w-full border-2 border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] rounded-xl py-3 mt-6 font-semibold text-sm transition-all duration-150 cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <div className={`transition-all duration-200 ease-out ${opacityClass}`}>
              {/* Form Heading */}
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {mode === 'signin' ? 'Welcome back' : 'Create account'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  {mode === 'signin'
                    ? 'Sign in to your ProTech dashboard'
                    : 'Join ProTech and manage rent smarter'}
                </p>
              </div>

              {/* Pill Switcher */}
              <div className="bg-slate-100 rounded-xl p-1 grid grid-cols-2 gap-1 mt-8">
                <button
                  type="button"
                  onClick={() => handleTabChange('signin')}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer text-center ${
                    mode === 'signin'
                      ? 'bg-white text-slate-900 shadow-sm shadow-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('register')}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer text-center ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-sm shadow-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Register
                </button>
              </div>

              {/* Forms Section */}
              <div className="mt-8">
                {/* SIGN IN FORM */}
                {mode === 'signin' && (
                  <form onSubmit={handleSignInSubmit} className="space-y-5">
                    {/* Username/Email Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email or Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <AtSign className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          name="identifier"
                          value={signIn.identifier}
                          onChange={handleSignInChange}
                          placeholder="Enter your email or username"
                          className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                            errors.identifier ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      {errors.identifier && (
                        <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{errors.identifier}</span>
                        </div>
                      )}
                    </div>

                    {/* Password Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          type={showSignInPassword ? 'text' : 'password'}
                          name="password"
                          value={signIn.password}
                          onChange={handleSignInChange}
                          placeholder="Enter your password"
                          className={`w-full px-4 py-3 pl-11 pr-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                            errors.password ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 flex items-center"
                        >
                          {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{errors.password}</span>
                        </div>
                      )}
                    </div>

                    {/* Remember me & Forgot Password */}
                    <div className="flex justify-between items-center mt-2 mb-6">
                      <label className="flex items-center select-none cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-blue-600 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-600 ml-2">Remember me</span>
                      </label>
                      <span
                        onClick={() => navigate('/forgot-password')}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Forgot password?
                      </span>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] hover:scale-[1.01] transition-all duration-150 shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <LogIn className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Pending Approval Banner */}
                    {pendingApproval && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4 flex items-start gap-3 animate-slide-down">
                        <AlertTriangle className="text-amber-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-amber-800 font-semibold text-sm">Pending Approval</h4>
                          <p className="text-amber-700 text-xs mt-1">
                            Your account is waiting for landlord approval. Check your email for updates.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Switch to Register */}
                    <div className="text-center mt-6 pt-6 border-t border-slate-100">
                      <span className="text-sm text-slate-500">Don't have an account? </span>
                      <span
                        onClick={() => handleTabChange('register')}
                        className="text-sm font-semibold text-blue-600 cursor-pointer hover:text-blue-700"
                      >
                        Create one now
                      </span>
                    </div>
                  </form>
                )}

                {/* REGISTER FORM */}
                {mode === 'register' && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-5">
                    {/* Role Selector Card */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                        I am a...
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Landlord Card */}
                        <div
                          onClick={() => {
                            setRegister((prev) => ({ ...prev, role: 'landlord' }));
                            if (errors.role) setErrors((prev) => ({ ...prev, role: '' }));
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all duration-150 ${
                            register.role === 'landlord'
                              ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <Building2
                            className={`w-6 h-6 mx-auto transition-colors duration-150 ${
                              register.role === 'landlord' ? 'text-blue-600' : 'text-slate-400'
                            }`}
                          />
                          <h4
                            className={`text-sm font-bold mt-2 transition-colors duration-150 ${
                              register.role === 'landlord' ? 'text-blue-700' : 'text-slate-600'
                            }`}
                          >
                            Landlord
                          </h4>
                          <p
                            className={`text-xs mt-0.5 transition-colors duration-150 ${
                              register.role === 'landlord' ? 'text-blue-500' : 'text-slate-400'
                            }`}
                          >
                            I own a hostel
                          </p>
                        </div>

                        {/* Tenant Card */}
                        <div
                          onClick={() => {
                            setRegister((prev) => ({ ...prev, role: 'tenant' }));
                            if (errors.role) setErrors((prev) => ({ ...prev, role: '' }));
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all duration-150 ${
                            register.role === 'tenant'
                              ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <User
                            className={`w-6 h-6 mx-auto transition-colors duration-150 ${
                              register.role === 'tenant' ? 'text-indigo-600' : 'text-slate-400'
                            }`}
                          />
                          <h4
                            className={`text-sm font-bold mt-2 transition-colors duration-150 ${
                              register.role === 'tenant' ? 'text-indigo-700' : 'text-slate-600'
                            }`}
                          >
                            Tenant
                          </h4>
                          <p
                            className={`text-xs mt-0.5 transition-colors duration-150 ${
                              register.role === 'tenant' ? 'text-indigo-500' : 'text-slate-400'
                            }`}
                          >
                            I rent a room
                          </p>
                        </div>
                      </div>
                      {errors.role && (
                        <div className="text-xs text-red-500 mt-1.5 flex items-center gap-1 animate-slide-down">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{errors.role}</span>
                        </div>
                      )}
                    </div>

                    {/* Role Specific Fields */}
                    {register.role && (
                      <div className="space-y-4 animate-slide-down">
                        {/* Landlord Unique Code (TENANT ONLY) */}
                        {register.role === 'tenant' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                              Landlord's Unique Code
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <KeyRound className="w-4 h-4" />
                              </span>
                              <input
                                type="text"
                                name="landlord_code"
                                value={register.landlord_code}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setRegister((prev) => ({ ...prev, landlord_code: val }));
                                  if (errors.landlord_code) {
                                    setErrors((prev) => ({ ...prev, landlord_code: '' }));
                                  }
                                }}
                                placeholder="e.g. PT-7K3X9M"
                                className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                                  errors.landlord_code ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                                }`}
                              />
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 mt-2 flex items-start gap-2 border border-blue-100 shadow-xs">
                              <KeyRound className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-blue-600 leading-normal">
                                Ask your landlord for their unique ProTech code.
                                It looks like PT-7K3X9M and is different for every
                                landlord — this ensures you connect to the right one.
                              </p>
                            </div>
                            {errors.landlord_code && (
                              <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                <span>{errors.landlord_code}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Username & Full Name Row */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Username */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                              Username
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <AtSign className="w-4 h-4" />
                              </span>
                              <input
                                type="text"
                                name="username"
                                value={register.username}
                                onChange={handleRegisterChange}
                                placeholder="your_username"
                                className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                                  errors.username ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                                }`}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 select-none">Used to log in</p>
                            {errors.username && (
                              <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                <span>{errors.username}</span>
                              </div>
                            )}
                          </div>

                          {/* Full Name */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                              Full Name
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <User className="w-4 h-4" />
                              </span>
                              <input
                                type="text"
                                name="full_name"
                                value={register.full_name}
                                onChange={handleRegisterChange}
                                placeholder="Your full name"
                                className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                                  errors.full_name ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                                }`}
                              />
                            </div>
                            {errors.full_name && (
                              <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                <span>{errors.full_name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Email Address */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                            Email Address
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                              <Mail className="w-4 h-4" />
                            </span>
                            <input
                              type="email"
                              name="email"
                              value={register.email}
                              onChange={handleRegisterChange}
                              placeholder="your@email.com"
                              className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                                  errors.email ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                              }`}
                            />
                          </div>
                          <p className="text-xs text-blue-500 flex items-center gap-1 mt-1 select-none">
                            <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> Notifications and OTP codes sent here
                          </p>
                          {errors.email && (
                            <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              <span>{errors.email}</span>
                            </div>
                          )}
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                            Phone Number
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                              <Phone className="w-4 h-4" />
                            </span>
                            <input
                              type="tel"
                              name="phone_number"
                              value={register.phone_number}
                              onChange={handleRegisterChange}
                              placeholder="+234 800 000 0000"
                              className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                                errors.phone_number ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                              }`}
                            />
                          </div>
                          {errors.phone_number && (
                            <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              <span>{errors.phone_number}</span>
                            </div>
                          )}
                        </div>

                        {/* Password & Confirm Password Row */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Password */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                              Password
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <Lock className="w-4 h-4" />
                              </span>
                              <input
                                type={showRegisterPassword ? 'text' : 'password'}
                                name="password"
                                value={register.password}
                                onChange={handleRegisterChange}
                                placeholder="Min. 8 characters"
                                className={`w-full px-4 py-3 pl-11 pr-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                                  errors.password ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowRegisterPassword((prev) => !prev)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 flex items-center"
                              >
                                {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>

                            {/* Password Strength Meter */}
                            {register.password && (
                              <div className="mt-2 animate-slide-down">
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4].map((index) => (
                                    <div
                                      key={index}
                                      className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                                        index <= strength ? segmentColors[strength] : 'bg-slate-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className={`text-[10px] font-bold mt-1 ${strengthColors[strength]}`}>
                                  {strengthLabels[strength]}
                                </p>
                              </div>
                            )}

                            {errors.password && (
                              <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                <span>{errors.password}</span>
                              </div>
                            )}
                          </div>

                          {/* Confirm Password */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                              Confirm Password
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <Lock className="w-4 h-4" />
                              </span>
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirm_password"
                                value={register.confirm_password}
                                onChange={handleRegisterChange}
                                placeholder="Repeat password"
                                className={`w-full px-4 py-3 pl-11 pr-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                                  errors.confirm_password ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 flex items-center"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            {errors.confirm_password && (
                              <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                <span>{errors.confirm_password}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Landlord Specific Fields */}
                        {register.role === 'landlord' && (
                          <div className="space-y-4 animate-slide-down">
                            {/* Hostel Name */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Hostel Name
                              </label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                  <Building2 className="w-4 h-4" />
                                </span>
                                <input
                                  type="text"
                                  name="hostel_name"
                                  value={register.hostel_name}
                                  onChange={handleRegisterChange}
                                  placeholder="e.g. Halleluyah Court"
                                  className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 ${
                                    errors.hostel_name ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                                  }`}
                                />
                              </div>
                              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1 select-none">
                                <Star className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" /> This appears on every tenant receipt
                              </p>
                              {errors.hostel_name && (
                                <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  <span>{errors.hostel_name}</span>
                                </div>
                              )}
                            </div>

                            {/* Hostel Address */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Hostel Address
                              </label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-3 text-slate-400">
                                  <MapPin className="w-4 h-4" />
                                </span>
                                <textarea
                                  name="hostel_address"
                                  value={register.hostel_address}
                                  onChange={handleRegisterChange}
                                  placeholder="No. 5 Oke-Ola Street, Ogbomoso, Oyo State"
                                  rows={2}
                                  className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-150 placeholder:text-slate-400 resize-none ${
                                    errors.hostel_address ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-200'
                                  }`}
                                />
                              </div>
                              {errors.hostel_address && (
                                <div className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-slide-down">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  <span>{errors.hostel_address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 active:scale-[0.98] hover:scale-[1.01] transition-all duration-150 shadow-lg shadow-indigo-500/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
                        >
                          {loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Creating account...</span>
                            </>
                          ) : (
                            <>
                              <span>Create Account</span>
                              <UserPlus className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Switch to Sign In */}
                    <div className="text-center mt-6 pt-6 border-t border-slate-100">
                      <span className="text-sm text-slate-500">Already have an account? </span>
                      <span
                        onClick={() => handleTabChange('signin')}
                        className="text-sm font-semibold text-blue-600 cursor-pointer hover:text-blue-700"
                      >
                        Sign in here
                      </span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
