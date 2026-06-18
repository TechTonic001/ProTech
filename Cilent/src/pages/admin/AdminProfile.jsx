// src/pages/admin/AdminProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldAlert, 
  ArrowLeft,
  Edit2,
  Save,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const [profile, setProfile] = useState(null);
  
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getProfile();
      const user = res.data.user;
      setProfile(user);
      
      setForm({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
      });
    } catch (err) {
      toast.error(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error('Full Name is required');
      return;
    }
    
    try {
      setSaving(true);
      const res = await authAPI.updateProfile({
        full_name: form.full_name,
        phone_number: form.phone_number,
      });
      setProfile(res.data.user);
      setEditing(false);
      toast.success('Admin profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update admin profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
    });
  };

  if (loading) return <LoadingSpinner fullPage size="lg" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-2">
      {/* Back to dashboard */}
      <button 
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Admin Profile</h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Manage system administrator details and diagnostics parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main profile edit card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {/* Cover Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 px-6 py-8 text-white relative">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl font-black shadow-md">
                A
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold leading-tight">{profile?.full_name || 'System Admin'}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">@{profile?.username}</p>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-red-500/30">
                  Root Controller
                </div>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">Administrator Info</h3>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs font-bold text-slate-650 hover:text-slate-900 transition flex items-center gap-1 uppercase tracking-wider"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                {editing ? (
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none text-slate-800"
                    />
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700">
                    {profile?.full_name || 'System Administrator'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                {editing ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none text-slate-800"
                    />
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700">
                    {profile?.phone_number || '—'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-350" />
                  <div className="pl-9 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-400 select-none truncate">
                    {profile?.email}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Identifier ID</label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-450 select-none">
                  @{profile?.username}
                </div>
              </div>
            </div>

            {editing && (
              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl shadow-xs transition duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right side info panel */}
        <div className="space-y-6">
          <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-red-900 uppercase tracking-widest border-b border-red-100 pb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-650" />
              Root Access Notice
            </h3>
            <p className="text-[11px] text-red-800 font-semibold leading-relaxed">
              Your account has platform-wide superuser visibility. Do not share your credentials or key references. All diagnostic actions are audited in system telemetry logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
