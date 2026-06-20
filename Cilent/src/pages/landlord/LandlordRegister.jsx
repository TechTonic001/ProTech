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
  UserPlus,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Star,
  CheckCircle2
} from 'lucide-react';
import AuthLayout from '../../components/shared/AuthLayout';

const LandlordRegister = () => {
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
    hostel_name: '',
    hostel_address: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Success card states
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [landlordCode, setLandlordCode] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
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
    if (!form.hostel_name || !form.hostel_name.trim()) {
      nextErrors.hostel_name = 'Hostel name is required';
    }
    if (!form.hostel_address || !form.hostel_address.trim()) {
      nextErrors.hostel_address = 'Hostel address is required';
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
        role: 'landlord',
        hostel_name: form.hostel_name,
        hostel_address: form.hostel_address
      });

      const resData = response.data;
      if (resData.token && resData.user) {
        login(resData.token, resData.user);
        setLandlordCode(resData.user.landlord_code);
        setShowSuccessCard(true);
        toast.success('Registration successful!');
        
        setTimeout(() => {
          navigate('/landlord/dashboard');
        }, 5000);
      } else {
        throw new Error('Unexpected registration response payload');
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed');
      setErrors({ api: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (showSuccessCard) {
    return (
      <AuthLayout
        accentColor="blue"
        roleLabel="LANDLORD PORTAL"
        roleIcon="🏠"
        tagline="Manage your hostel with ease"
      >
        <div className="font-outfit space-y-6 text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hostel Registered!</h1>
            <p className="text-slate-500 text-sm mt-1">Your account has been created and verified.</p>
          </div>

          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center space-y-2">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Your Unique Landlord Code
            </p>
            <p className="text-3xl font-black text-slate-900 font-mono tracking-wider">
              {landlordCode}
            </p>
            <p className="text-xs text-amber-600">
              Save this — your tenants need it to register
            </p>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Redirecting to your dashboard in a few seconds...
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      accentColor="blue"
      roleLabel="LANDLORD PORTAL"
      roleIcon="🏠"
      tagline="Manage your hostel with ease"
    >
      <div className="font-outfit space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Landlord Space</h1>
          <p className="text-slate-500 text-sm mt-1">Register your building and start collecting rent</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.api && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errors.api}</span>
            </div>
          )}

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
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
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
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
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
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
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
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
                    errors.phone_number ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.phone_number && <p className="text-[10px] text-red-500 mt-0.5">{errors.phone_number}</p>}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hostel / Building Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Building2 className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                name="hostel_name"
                value={form.hostel_name}
                onChange={handleInputChange}
                placeholder="e.g. Halleluyah Court"
                className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
                  errors.hostel_name ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
              />
            </div>
            <p className="text-[9px] text-amber-600 flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 text-amber-600" /> This appears on every tenant receipt
            </p>
            {errors.hostel_name && <p className="text-[10px] text-red-500 mt-0.5">{errors.hostel_name}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hostel Address
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              <textarea
                name="hostel_address"
                value={form.hostel_address}
                onChange={handleInputChange}
                placeholder="No. 5 Oke-Ola Street, Ogbomoso"
                rows={2}
                className={`w-full px-3 py-2 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition resize-none ${
                  errors.hostel_address ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.hostel_address && <p className="text-[10px] text-red-500 mt-0.5">{errors.hostel_address}</p>}
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
                  className={`w-full px-3 py-2.5 pl-9 pr-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
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
                  className={`w-full px-3 py-2.5 pl-9 pr-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
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
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm rounded-xl transition duration-150 shadow-lg shadow-blue-500/25 disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Register Space</span>
                <UserPlus className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-100">
          <span className="text-sm text-slate-500 font-medium">Already have an account? </span>
          <Link to="/landlord/login" className="text-sm font-bold text-blue-600 hover:text-blue-700">
            Login here
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LandlordRegister;
