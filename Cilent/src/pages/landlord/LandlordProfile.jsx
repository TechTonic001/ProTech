// src/pages/landlord/LandlordProfile.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const LandlordProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    hostel_name: '',
    hostel_address: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      const user = res.data.user;
      setProfile(user);
      setForm({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        hostel_name: user.hostel_name || '',
        hostel_address: user.hostel_address || '',
      });
    } catch (err) {
      toast.error(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', form);
      setProfile(res.data.user);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-slate-100 text-slate-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="text-slate-500">Update your landlord profile and hostel information.</p>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center text-2xl font-black text-slate-900">
                {(profile?.full_name || 'L')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-bold text-white">{profile?.full_name}</p>
                <p className="text-sm text-white/60">@{profile?.username}</p>
                <span className="inline-block mt-1 px-3 py-0.5 bg-amber-400/20 text-amber-400 text-xs font-bold rounded-full uppercase">
                  {profile?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Basic Info (read-only fields) */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Account Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'Username', value: `@${profile?.username}`, disabled: true },
                  { label: 'Email', value: profile?.email, disabled: true },
                ].map((f, i) => (
                  <div key={i}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{f.label}</label>
                    <p className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-100">{f.value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Editable Info */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Personal Information</h3>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                    ✏️ Edit
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                  {editing ? (
                    <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-4 py-3 bg-white rounded-xl text-sm border border-slate-300 focus:border-blue-400 outline-none" />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-800 border border-slate-100">{profile?.full_name || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
                  {editing ? (
                    <input type="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className="w-full px-4 py-3 bg-white rounded-xl text-sm border border-slate-300 focus:border-blue-400 outline-none" />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-800 border border-slate-100">{profile?.phone_number || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Hostel Details */}
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">🏠 Hostel Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Hostel Name</label>
                  {editing ? (
                    <>
                      <input type="text" value={form.hostel_name} onChange={(e) => setForm({ ...form, hostel_name: e.target.value })} placeholder="e.g. Halleluyah Court" className="w-full px-4 py-3 bg-white rounded-xl text-sm border border-slate-300 focus:border-blue-400 outline-none" />
                      <p className="text-xs text-slate-400 mt-1">This name appears on all tenant payment receipts.</p>
                    </>
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-800 border border-slate-100 font-medium">{profile?.hostel_name || <span className="text-slate-400 italic">Not set — click Edit to add</span>}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Hostel Address</label>
                  {editing ? (
                    <textarea value={form.hostel_address} onChange={(e) => setForm({ ...form, hostel_address: e.target.value })} placeholder="e.g. No. 5 Oke-Ola Street, Ogbomoso" rows={3} className="w-full px-4 py-3 bg-white rounded-xl text-sm border border-slate-300 focus:border-blue-400 outline-none resize-none" />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-800 border border-slate-100">{profile?.hostel_address || <span className="text-slate-400 italic">Not set — click Edit to add</span>}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Save / Cancel */}
            {editing && (
              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-500 transition disabled:opacity-60">
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button onClick={() => { setEditing(false); setForm({ full_name: profile?.full_name || '', phone_number: profile?.phone_number || '', hostel_name: profile?.hostel_name || '', hostel_address: profile?.hostel_address || '' }); }} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordProfile;
