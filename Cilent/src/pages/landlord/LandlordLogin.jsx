import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  KeyRound,
  AtSign
} from 'lucide-react';
import AuthLayout from '../../components/shared/AuthLayout';

const LandlordLogin = () => {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!form.identifier || !form.password) {
      const nextErrors = {};
      if (!form.identifier) nextErrors.identifier = 'Email or Username is required';
      if (!form.password) nextErrors.password = 'Password is required';
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        identifier: form.identifier.trim(),
        password: form.password,
      });

      const resData = response.data?.data || response.data;
      const { accessToken, user } = resData;

      if (accessToken && user) {
        if (user.role !== 'landlord') {
          throw new Error('This account is not a landlord account');
        }
        login(accessToken, user);
        toast.success('Welcome back, Landlord!');
        navigate('/landlord/dashboard');
      } else {
        throw new Error('Unexpected response payload');
      }
    } catch (err) {
      toast.error(err.message || 'Login failed');
      setErrors({ api: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      accentColor="blue"
      roleLabel="LANDLORD PORTAL"
      roleIcon="🏠"
      tagline="Manage your hostel with ease"
    >
      <div className="font-outfit space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Landlord Sign In</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your ProTech landlord dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errors.api && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errors.api}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <AtSign className="w-4 h-4" />
              </span>
              <input
                type="text"
                name="identifier"
                value={form.identifier}
                onChange={handleInputChange}
                placeholder="Enter email or username"
                className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition placeholder:text-slate-400 ${errors.identifier ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
              />
            </div>
            {errors.identifier && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.identifier}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleInputChange}
                placeholder="Enter password"
                className={`w-full px-4 py-3 pl-11 pr-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition placeholder:text-slate-400 ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition flex items-center cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          <div className="flex justify-between items-center mt-2">
            <label className="flex items-center select-none cursor-pointer">
              <input
                type="checkbox"
                className="accent-blue-600 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-slate-600 ml-2 font-medium">Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-bold text-blue-600 hover:text-blue-700 transition"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition shadow-lg shadow-blue-500/25 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
        </form>

        <div className="text-center pt-5 border-t border-slate-100 space-y-3">
          <div className="text-sm text-slate-500 font-medium">
            New landlord?{' '}
            <Link to="/landlord/register" className="font-bold text-blue-600 hover:text-blue-700">
              Register here
            </Link>
          </div>
          <div>
            <Link to="/tenant/login" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition">
              Are you a tenant? Login here
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LandlordLogin;
