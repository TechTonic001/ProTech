// src/components/ui/DeleteConfirmModal.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

/**
 * DeleteConfirmModal
 *
 * Props:
 *   isOpen    {boolean}  - Controls visibility
 *   onClose   {function} - Called when Cancel is clicked
 *   onConfirm {function} - Called with (reason: string) when delete confirmed
 *   itemType  {string}   - Human-readable type, e.g. "property" or "tenant"
 *   itemName  {string}   - The specific name of the item being deleted
 *   isLoading {boolean}  - Shows a spinner on the delete button while in flight
 */
const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemType = 'item',
  itemName = '',
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');

  // Reset reason when modal opens
  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const capitalised = itemType.charAt(0).toUpperCase() + itemType.slice(1);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl shadow-slate-900/20 w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Red top bar */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-600 w-full" />

        {/* Content */}
        <div className="p-6 pt-5">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
          </div>

          {/* Title */}
          <h2
            id="delete-modal-title"
            className="text-lg font-black text-slate-900 text-center mb-1"
          >
            Delete {capitalised}?
          </h2>

          {/* Item name */}
          <p className="text-center text-sm text-slate-600 font-medium mb-5">
            You are about to remove{' '}
            <span className="font-black text-slate-900">"{itemName}"</span>.{' '}
            This action will hide the {itemType} from your dashboard.
          </p>

          {/* 30-day warning */}
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-red-800 leading-relaxed">
              <span className="font-black">⚠ Recovery window:</span> You have{' '}
              <span className="font-black">30 days</span> to recover this {itemType} from
              your Recycle Bin before it is permanently deleted.
            </p>
          </div>

          {/* Reason textarea */}
          <div className="mb-6">
            <label
              htmlFor="delete-reason"
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5"
            >
              Reason for removal{' '}
              <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="delete-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              placeholder={`Why are you removing this ${itemType}?`}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm
                         text-slate-700 placeholder-slate-300 resize-none
                         focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-300
                         disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              id="delete-modal-cancel"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold
                         text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>

            {/* Delete button — includes full item name so landlord must read it */}
            <button
              id="delete-modal-confirm"
              onClick={() => onConfirm(reason.trim() || null)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                         bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-black
                         transition duration-150 shadow-sm shadow-red-200 disabled:opacity-60
                         disabled:cursor-not-allowed"
              title={`Permanently remove "${itemName}" after 30 days`}
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">
                {isLoading ? 'Deleting…' : `Yes, Delete "${itemName}"`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
