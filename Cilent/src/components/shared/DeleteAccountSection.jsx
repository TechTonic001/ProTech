// src/components/shared/DeleteAccountSection.jsx
// Reusable permanent account deletion danger-zone section.
// Drop inside any Profile page.
//
// Two-step confirmation:
//   1. User types "DELETE MY ACCOUNT" exactly.
//   2. User enters their current password.
//
// On success: clears localStorage + hard redirects to landing page.

import { useState } from 'react';
import { authAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';

const REQUIRED_TEXT = 'DELETE MY ACCOUNT';

const DeleteAccountSection = () => {
  const [open,        setOpen]        = useState(false);
  const [password,    setPassword]    = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [error,       setError]       = useState('');

  const canSubmit =
    confirmText === REQUIRED_TEXT &&
    password.trim().length >= 6 &&
    !deleting;

  const handleDelete = async (e) => {
    e.preventDefault();
    setError('');

    if (confirmText !== REQUIRED_TEXT) {
      setError(`Type exactly: ${REQUIRED_TEXT}`);
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setDeleting(true);
    try {
      await authAPI.deleteAccount({ password, confirm_text: confirmText });
      localStorage.removeItem('protech_token');
      localStorage.removeItem('protech_user');
      toast.success('Account permanently deleted.', { duration: 5000 });
      window.location.href = '/';
    } catch (err) {
      const responseError = err.response?.data?.error || err.response?.data?.message;
      const msg = responseError && responseError.toLowerCase().includes('incorrect password')
        ? 'Incorrect password. Please verify your password and try again before deleting your account.'
        : responseError || err.message || 'Deletion failed. Please try again.';
      setError(msg);
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setPassword('');
    setConfirmText('');
    setError('');
    setShowPwd(false);
  };

  return (
    <div className="mt-8 border-t border-red-100 pt-6">
      {!open ? (
        // ── Danger zone summary ─────────────────────────────────────────────
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
              Permanently remove your account and all associated data. This
              action <strong>cannot be undone</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-shrink-0 px-4 py-2 border-2 border-red-200 text-red-600 hover:bg-red-50
                       font-bold text-xs rounded-xl transition-all active:scale-95"
          >
            Delete Account
          </button>
        </div>
      ) : (
        // ── Confirmation form ────────────────────────────────────────────────
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 space-y-5">

          {/* Warning banner */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-800">This is permanent and irreversible</h3>
              <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                All your data — leases, payments, rooms, properties — will be permanently deleted.
                There is no recovery option.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-100 border border-red-200 rounded-xl px-3 py-2 font-semibold">
              {error}
            </p>
          )}

          <form onSubmit={handleDelete} className="space-y-4">

            {/* Confirmation text */}
            <div>
              <label className="block text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1.5">
                Type &ldquo;{REQUIRED_TEXT}&rdquo; to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={REQUIRED_TEXT}
                autoComplete="off"
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-mono tracking-wider
                            focus:outline-none transition-all ${
                  confirmText === REQUIRED_TEXT
                    ? 'border-red-500 bg-white text-red-800'
                    : 'border-red-200 bg-white text-slate-800'
                }`}
              />
              {confirmText && confirmText !== REQUIRED_TEXT && (
                <p className="text-[10px] text-red-500 mt-1">
                  Must match exactly: {REQUIRED_TEXT}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1.5">
                Your Current Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 border-2 border-red-200 rounded-xl text-sm
                             focus:outline-none focus:border-red-400 bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm
                           rounded-xl transition-all active:scale-[0.98] disabled:opacity-40
                           disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Permanently Delete
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={deleting}
                className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold
                           text-sm rounded-xl hover:bg-slate-50 transition-all active:scale-[0.98]
                           disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountSection;
