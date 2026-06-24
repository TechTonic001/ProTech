import { useState, useContext } from 'react';
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
  User,
  Mail,
  Phone,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import AuthLayout from '../../components/shared/AuthLayout';
import PasswordStrength from '../../components/ui/PasswordStrength';
import { validatePassword } from '../../utils/validatePassword';

const LandlordRegister = () => {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [landlordCode, setLandlordCode] = useState(null);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username || formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    }
    if (!formData.full_name || formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Please enter your full name.';
    }
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.phone_number || formData.phone_number.trim().length < 10) {
      newErrors.phone_number = 'Please enter a valid phone number.';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else {
      const { isValid } = validatePassword(formData.password);
      if (!isValid) newErrors.password = 'Password does not meet all requirements.';
    }
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/register', {
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        password: formData.password,
        role: 'landlord',
      });

      const resData = response.data?.data || response.data;
      const { token, user } = resData;

      if (token && user) {
        login(token, user);
        setLandlordCode(user.landlord_code);
        toast.success('Account created successfully!');
        setTimeout(() => navigate('/landlord/dashboard'), 5000);
      } else {
        throw new Error('Unexpected response from server. Please try again.');
      }
    } catch (err) {
      const message =
        err.response?.data?.error || err.message || 'Registration failed. Please try again.';

      if (message.toLowerCase().includes('email')) {
        setErrors({ email: message });
      } else if (message.toLowerCase().includes('username')) {
        setErrors({ username: message });
      } else {
        setErrors({ api: message });
        toast.error(message);
      }
      setIsSubmitting(false);
    }
  };

  // ── Success screen ──
  if (landlordCode) {
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Created!</h1>
            <p className="text-slate-500 text-sm mt-1">Welcome to ProTech</p>
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
            <button
              onClick={() => {
                navigator.clipboard.writeText(landlordCode);
                toast.success('Code copied!');
              }}
              className="mt-2 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition"
            >
              <Copy className="w-4 h-4" /> Copy Code
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Redirecting to your dashboard in a few seconds...
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ── Registration form ──
  return (
    <AuthLayout
      accentColor="blue"
      roleLabel="LANDLORD PORTAL"
      roleIcon="🏠"
      tagline="Manage your hostel with ease"
    >
      <div className="font-outfit space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Join ProTech as a landlord</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* API-level error banner */}
          {errors.api && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errors.api}</span>
            </div>
          )}

          {/* Username + Full Name */}
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
                  id="reg-username"
                  type="text"
                  autoComplete="username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="your_username"
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
                    errors.username ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.username && (
                <p className="text-[10px] text-red-500 mt-0.5">{errors.username}</p>
              )}
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
                  id="reg-fullname"
                  type="text"
                  autoComplete="name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Your full name"
                  className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
                    errors.full_name ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.full_name && (
                <p className="text-[10px] text-red-500 mt-0.5">{errors.full_name}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-3.5 h-3.5" />
              </span>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="your@email.com"
                className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-[10px] text-red-500 mt-0.5">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Phone className="w-3.5 h-3.5" />
              </span>
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone_number}
                onChange={(e) => handleChange('phone_number', e.target.value)}
                placeholder="08012345678"
                className={`w-full px-3 py-2.5 pl-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
                  errors.phone_number ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.phone_number && (
              <p className="text-[10px] text-red-500 mt-0.5">{errors.phone_number}</p>
            )}
          </div>

          {/* Password + Confirm */}
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
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Min. 8 chars"
                  className={`w-full px-3 py-2.5 pl-9 pr-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
                    errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-500 mt-0.5">{errors.password}</p>
              )}
              <PasswordStrength password={formData.password} />
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
                  id="reg-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirm_password}
                  onChange={(e) => handleChange('confirm_password', e.target.value)}
                  placeholder="Repeat password"
                  className={`w-full px-3 py-2.5 pl-9 pr-9 border rounded-xl text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition ${
                    errors.confirm_password ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-[10px] text-red-500 mt-0.5">{errors.confirm_password}</p>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm rounded-xl transition duration-150 shadow-lg shadow-blue-500/25 disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
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
