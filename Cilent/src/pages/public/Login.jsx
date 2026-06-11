// src/pages/public/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

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
};

const Login = () => {
  const [mode, setMode] = useState('signin');
  const [signIn, setSignIn] = useState(initialSignIn);
  const [register, setRegister] = useState(initialRegister);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [infoBanner, setInfoBanner] = useState('');
  const [warningBanner, setWarningBanner] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateRegister = () => {
    const nextErrors = {};

    if (!register.username) nextErrors.username = 'Username is required';
    else if (!/^\w{3,}$/.test(register.username)) nextErrors.username = 'Use at least 3 letters, numbers, or underscores';

    if (!register.full_name) nextErrors.full_name = 'Full name is required';
    else if (register.full_name.trim().length < 2) nextErrors.full_name = 'Enter at least 2 characters';

    if (!register.email) nextErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(register.email)) nextErrors.email = 'Enter a valid email';

    if (!register.phone_number) nextErrors.phone_number = 'Phone number is required';
    else if (!/^\d{10,}$/.test(register.phone_number)) nextErrors.phone_number = 'Enter at least 10 digits';

    if (!register.password) nextErrors.password = 'Password is required';
    else if (register.password.length < 8) nextErrors.password = 'Password must be at least 8 characters';

    if (!register.confirm_password) nextErrors.confirm_password = 'Confirm your password';
    else if (register.confirm_password !== register.password) nextErrors.confirm_password = 'Passwords do not match';

    if (!register.role) nextErrors.role = 'Choose landlord or tenant';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setWarningBanner('');
    setErrors({});

    try {
      const response = await api.post('/auth/login', { identifier: signIn.identifier, password: signIn.password });
      const { token, user } = response.data;
      localStorage.setItem('protech_token', token);
      localStorage.setItem('protech_user', JSON.stringify(user));
      login(token, user);
      toast.success('Login successful');
      if (user.role === 'landlord') navigate('/landlord/dashboard');
      else if (user.role === 'tenant') navigate('/tenant/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
    } catch (error) {
      const errMsg = error.message || 'Login failed';
      if (errMsg.includes('pending landlord approval')) {
        setWarningBanner(errMsg);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInfoBanner('');
    setWarningBanner('');

    if (!validateRegister()) {
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', {
        username: register.username,
        full_name: register.full_name,
        email: register.email,
        phone_number: register.phone_number,
        password: register.password,
        role: register.role,
      });

      if (register.role === 'landlord') {
        toast.success('Account created! Please sign in.');
        setMode('signin');
        setSignIn((previous) => ({ ...previous, identifier: register.email }));
      } else {
        setInfoBanner(
          `Account created! Your request is pending landlord approval. A confirmation email has been sent to ${register.email}. You will receive another email when your account is approved.`
        );
      }

      setRegister(initialRegister);
      setErrors({});
    } catch (error) {
      const errMsg = error.message || 'Registration failed';
      const lower = errMsg.toLowerCase();
      if (lower.includes('email is already registered')) {
        setErrors({ email: errMsg });
      } else if (lower.includes('username is already taken')) {
        setErrors({ username: errMsg });
      } else {
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-8 shadow-2xl shadow-slate-950/20">
        <div className="mb-8 flex gap-2 rounded-full bg-slate-900 p-1">
          {['signin', 'register'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setMode(tab);
                setWarningBanner('');
                setInfoBanner('');
                setErrors({});
              }}
              className={`flex-1 rounded-full py-3 text-sm font-semibold transition ${
                mode === tab ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab === 'signin' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {warningBanner ? (
          <div className="mb-6 rounded-2xl border border-yellow-400 bg-yellow-50 p-4 text-yellow-700">
            {warningBanner}
          </div>
        ) : null}

        {infoBanner ? (
          <div className="mb-6 rounded-2xl border border-blue-400 bg-blue-50 p-4 text-blue-700">
            {infoBanner}
          </div>
        ) : null}

        {mode === 'signin' ? (
          <form onSubmit={handleSignInSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-300">Email or Username</label>
              <input
                type="text"
                value={signIn.identifier}
                onChange={(e) => setSignIn({ ...signIn, identifier: e.target.value })}
                placeholder="Enter your email or @username"
                required
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
              />
            </div>
            <div className="relative">
              <label className="block text-sm text-slate-300">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={signIn.password}
                onChange={(e) => setSignIn({ ...signIn, password: e.target.value })}
                required
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 text-white outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-300 hover:text-white"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold transition hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-300">Username</label>
              <input
                type="text"
                value={register.username}
                onChange={(e) => setRegister({ ...register, username: e.target.value })}
                required
                className={`mt-2 w-full rounded-2xl border px-4 py-3 bg-slate-950 text-white outline-none focus:border-blue-400 ${
                  errors.username ? 'border-red-500' : 'border-slate-700'
                }`}
              />
              {errors.username ? <p className="mt-2 text-sm text-red-400">{errors.username}</p> : null}
            </div>
            <div>
              <label className="block text-sm text-slate-300">Full Name</label>
              <input
                type="text"
                value={register.full_name}
                onChange={(e) => setRegister({ ...register, full_name: e.target.value })}
                required
                className={`mt-2 w-full rounded-2xl border px-4 py-3 bg-slate-950 text-white outline-none focus:border-blue-400 ${
                  errors.full_name ? 'border-red-500' : 'border-slate-700'
                }`}
              />
              {errors.full_name ? <p className="mt-2 text-sm text-red-400">{errors.full_name}</p> : null}
            </div>
            <div>
              <label className="block text-sm text-slate-300">Email</label>
              <input
                type="email"
                value={register.email}
                onChange={(e) => setRegister({ ...register, email: e.target.value })}
                required
                className={`mt-2 w-full rounded-2xl border px-4 py-3 bg-slate-950 text-white outline-none focus:border-blue-400 ${
                  errors.email ? 'border-red-500' : 'border-slate-700'
                }`}
              />
              {errors.email ? <p className="mt-2 text-sm text-red-400">{errors.email}</p> : null}
            </div>
            <div>
              <label className="block text-sm text-slate-300">Phone Number</label>
              <input
                type="tel"
                value={register.phone_number}
                onChange={(e) => setRegister({ ...register, phone_number: e.target.value })}
                required
                className={`mt-2 w-full rounded-2xl border px-4 py-3 bg-slate-950 text-white outline-none focus:border-blue-400 ${
                  errors.phone_number ? 'border-red-500' : 'border-slate-700'
                }`}
              />
              {errors.phone_number ? <p className="mt-2 text-sm text-red-400">{errors.phone_number}</p> : null}
            </div>
            <div>
              <label className="block text-sm text-slate-300">Password</label>
              <input
                type="password"
                value={register.password}
                onChange={(e) => setRegister({ ...register, password: e.target.value })}
                required
                className={`mt-2 w-full rounded-2xl border px-4 py-3 bg-slate-950 text-white outline-none focus:border-blue-400 ${
                  errors.password ? 'border-red-500' : 'border-slate-700'
                }`}
              />
              {errors.password ? <p className="mt-2 text-sm text-red-400">{errors.password}</p> : null}
            </div>
            <div>
              <label className="block text-sm text-slate-300">Confirm Password</label>
              <input
                type="password"
                value={register.confirm_password}
                onChange={(e) => setRegister({ ...register, confirm_password: e.target.value })}
                required
                className={`mt-2 w-full rounded-2xl border px-4 py-3 bg-slate-950 text-white outline-none focus:border-blue-400 ${
                  errors.confirm_password ? 'border-red-500' : 'border-slate-700'
                }`}
              />
              {errors.confirm_password ? <p className="mt-2 text-sm text-red-400">{errors.confirm_password}</p> : null}
            </div>
            <div>
              <label className="block text-sm text-slate-300">Role</label>
              <select
                value={register.role}
                onChange={(e) => setRegister({ ...register, role: e.target.value })}
                required
                className={`mt-2 w-full rounded-2xl border px-4 py-3 bg-slate-950 text-white outline-none focus:border-blue-400 ${
                  errors.role ? 'border-red-500' : 'border-slate-700'
                }`}
              >
                <option value="">Select role</option>
                <option value="landlord">Landlord</option>
                <option value="tenant">Tenant</option>
              </select>
              {errors.role ? <p className="mt-2 text-sm text-red-400">{errors.role}</p> : null}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold transition hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="mt-6 text-sm text-slate-400 flex justify-between">
          <Link to="/forgot-password" className="hover:text-white">Forgot password?</Link>
          <Link to="/" className="hover:text-white">Back home</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
