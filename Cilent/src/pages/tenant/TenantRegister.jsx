import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  UserPlus,
  User,
  Mail,
  Phone,
  KeyRound,
  CheckCircle2,
  Info
} from 'lucide-react';
import AuthLayout from '../../components/shared/AuthLayout';

const TenantRegister = () => {
  const [form, setForm] = useState({
    landlord_code: '',
    username: '',
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Success state for tenant registration
  const [successInfo, setSuccessInfo] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCodeChange = (e) => {
    const val = e.target.value.toUpperCase();
    setForm((prev) => ({ ...prev, landlord_code: val }));
    if (errors.landlord_code) {
      setErrors((prev) => ({ ...prev, landlord_code: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.landlord_code || !form.landlord_code.trim()) {
      nextErrors.landlord_code = "Please enter your landlord's unique code to register.";
    } else if (!/^PT-[A-Z0-9]{6}$/i.test(form.landlord_code)) {
      nextErrors.landlord_code = 'Code must match PT-XXXXXX format';
    }
    if (!form.username) nextErrors.username = 'Username is required';
    if (!form.full_name) nextErrors.full_name = 'Full name is required';
    if (!form.email) {
      nextErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!form.phone_number) nextErrors.phone_number = 'Phone number is required';
    if (!form.password) {
      nextErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      nextErrors.password = 'Must be at least 8 characters';
    }
    if (form.confirm_password !== form.password) {
      nextErrors.confirm_password = 'Passwords do not match';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        username: form.username,
        full_name: form.full_name,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
        role: 'tenant',
        landlord_code: form.landlord_code
      });

      setSuccessInfo({
        landlord_hostel: response.data.landlord_hostel || 'your landlord',
        email: form.email
      });
      toast.success('Registration request submitted!');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
      setErrors({ api: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (successInfo) {
    return (
      <AuthLayout
        accentColor="indigo"
        roleLabel="TENANT PORTAL"
        roleIcon="👤"
        tagline="Pay rent the smart way"
      >
        <div className="font-outfit text-center p-6 space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 animate-[bounceIn_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Request Submitted!</h2>
            <p className="text-slate-600 mt-2 text-sm">
              Request sent to the landlord of <span className="font-semibold text-slate-900">{successInfo.landlord_hostel}</span>
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Check your email at <span className="font-medium text-slate-700">{successInfo.email}</span>
            </p>
            <p className="text-slate-400 text-xs mt-1">
              You'll receive another email once approved.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
            <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> What happens next:
            </h4>
            <ol className="text-xs text-blue-600 list-decimal pl-4 space-y-1">
              <li>Your landlord reviews your request</li>
              <li>You receive an approval email</li>
              <li>Log in and start paying rent</li>
            </ol>
          </div>

          <Link
            to="/tenant/login"
            className="block w-full border-2 border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] rounded-xl py-3 font-semibold text-sm transition text-center"
          >
            Back to Sign In
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      accentColor="indigo"
      roleLabel="TENANT PORTAL"
      roleIcon="👤"
      tagline="Pay rent the smart way"
    >
      <div className="font-outfit space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tenant Registration</h1>
          <p className="text-slate-500 text-sm mt-1">Join your hostel space and track payments</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.api && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errors.api}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Landlord's Unique Code
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="text"
                name="landlord_code"
                value={form.landlord_code}
                onChange={handleCodeChange}
                placeholder="e.g. PT-7K3X9M"
                className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition placeholder:text-slate-400 ${
                  errors.landlord_code ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
              />
            </div>
            <div className="bg-blue-50 rounded-lg p-3 mt-1.5 flex items-start gap-2 border border-blue-100">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-600 leading-normal font-semibold">
                Ask your landlord for their code (e.g. PT-XXXXXX) to connect.
              </p>
            </div>
            {errors.landlord_code && <p className="text-xs text-red-500 mt-1">{errors.landlord_code}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleInputChange}
                  placeholder="username"
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition ${
                    errors.username ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.username && <p className="text-[10px] text-red-500 mt-0.5">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition ${
                    errors.full_name ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.full_name && <p className="text-[10px] text-red-500 mt-0.5">{errors.full_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition ${
                    errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.email && <p className="text-[10px] text-red-500 mt-0.5">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleInputChange}
                  placeholder="08012345678"
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition ${
                    errors.phone_number ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.phone_number && <p className="text-[10px] text-red-500 mt-0.5">{errors.phone_number}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="Min. 8 chars"
                  className={`w-full px-3 py-2.5 pl-9 pr-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition ${
                    errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-500 mt-0.5">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleInputChange}
                  placeholder="Re-enter password"
                  className={`w-full px-3 py-2.5 pl-9 pr-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition ${
                    errors.confirm_password ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-[10px] text-red-500 mt-0.5">{errors.confirm_password}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-sm rounded-xl transition duration-150 shadow-lg shadow-indigo-500/25 disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Register Account</span>
                <UserPlus className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-100">
          <span className="text-sm text-slate-500 font-medium">Already have an account? </span>
          <Link to="/tenant/login" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
            Login here
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default TenantRegister;
