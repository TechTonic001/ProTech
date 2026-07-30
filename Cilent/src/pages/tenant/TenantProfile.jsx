// src/pages/tenant/TenantProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, leaseAPI } from '../../utils/api';
import DeleteAccountSection from '../../components/shared/DeleteAccountSection';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  formatDate,
  dueDateLabel,
} from '../../utils/dateUtils';
import {
  User,
  Mail,
  Phone,
  ArrowLeft,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TenantProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState(null);
  const [lease, setLease] = useState(null);

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
      const [profileRes, leaseRes] = await Promise.all([
        authAPI.getProfile(),
        leaseAPI.getMyLease().catch(() => ({ data: null })),
      ]);

      const user = profileRes.data.user;
      setProfile(user);
      setLease(leaseRes.data || null);

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
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
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
      <button
        onClick={() => navigate('/tenant/dashboard')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Profile Settings</h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
          Manage your personal credentials and verify your lease status
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 px-6 py-8 text-white relative">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-indigo-550 border border-white/10 flex items-center justify-center text-3xl font-black shadow-md">
                {(profile?.full_name || 'T')[0].toUpperCase()}
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold leading-tight">{profile?.full_name}</h2>
                <p className="text-xs text-indigo-300 font-bold uppercase tracking-wide">@{profile?.username}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">Personal Account Data</h3>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 uppercase tracking-wider"
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
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none text-slate-800"
                    />
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700">
                    {profile?.full_name || '—'}
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
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none text-slate-800"
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-350" />
                  <div className="pl-9 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-400 truncate">
                    {profile?.email}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Username</label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-450">
                  @{profile?.username}
                </div>
              </div>
            </div>

            {editing && (
              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button type="submit" disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={handleCancel}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="space-y-6">
          {lease ? (
            <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">My Lease</h3>
              {[
                ['Property', lease.property_name],
                ['Room', `${lease.room_number} — ${lease.room_type || 'Standard'}`],
                ['Lease Start', formatDate(lease.start_date)],
                ['Lease End', formatDate(lease.end_date)],
                ['Due Date', formatDate(lease.end_date)],
                ['Next Due Date', formatDate(lease.end_date)],
                ['Monthly Rent', `₦${Number(lease.rent_amount || 0).toLocaleString()}`],
                ['Balance Remaining', `₦${(Number(lease.rent_amount || 0) - Number(lease.amount_paid_this_cycle || 0)).toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-slate-800">{value}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1">
                <span className="text-sm text-slate-500">Payment Status</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${dueDateLabel(lease.end_date).includes('overdue')
                    ? 'bg-red-100 text-red-700'
                    : dueDateLabel(lease.end_date).includes('today')
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                  {dueDateLabel(lease.end_date)}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center text-slate-400 text-xs">
              No active lease assignment. Details will appear here once a landlord assigns you to a room.
            </div>
          )}
        </div>
      </div>
      <DeleteAccountSection />
    </div>
  );
};

export default TenantProfile;
