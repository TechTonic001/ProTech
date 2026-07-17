import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  Mail
} from 'lucide-react';
import AuthLayout from '../../components/shared/AuthLayout';

const AdminLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
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
    
    if (!form.email || !form.password) {
      const nextErrors = {};
      if (!form.email) nextErrors.email = 'Email address is required';
      if (!form.password) nextErrors.password = 'Password is required';
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        identifier: form.email,
        password: form.password,
        expectedRole: 'admin'
      });

      const resData = response.data?.data || response.data;
      const { accessToken, user } = resData;

      if (accessToken && user) {
        if (user.role !== 'admin') {
          throw new Error('Invalid administrator credentials');
        }
        login(accessToken, user);
        toast.success('Welcome Administrator!');
        navigate('/admin/dashboard');
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
      accentColor="slate"
      roleLabel="SYSTEM ADMINISTRATOR"
      roleIcon="🔒"
      tagline="Platform oversight and control"
    >
      <div className="font-outfit space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Authenticate to access database metrics and approvals</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errors.api && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errors.api}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="admin@protech.com"
                className={`w-full px-4 py-3 pl-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 focus:bg-white transition placeholder:text-slate-400 ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.email}</span>
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
                className={`w-full px-4 py-3 pl-11 pr-11 border rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 focus:bg-white transition placeholder:text-slate-400 ${
                  errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900 active:scale-[0.98] transition shadow-lg shadow-slate-700/20 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <>
                <span>Secure Sign In</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default AdminLogin;
