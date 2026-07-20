// src/pages/landlord/NotificationSettings.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationAPI } from '../../utils/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  Bell, Clock, ArrowLeft, Save, RefreshCw,
  Calendar, AlertCircle, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Toggle Switch component ───────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange, id, disabled }) => (
  <button
    id={id}
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
      ${checked ? 'bg-blue-600' : 'bg-slate-200'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200
        ${checked ? 'translate-x-6' : 'translate-x-1'}
      `}
    />
  </button>
);

// ── Row for each reminder toggle ──────────────────────────────────────────────
const ReminderRow = ({ label, checked, onChange, id, saving }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0">
    <label
      htmlFor={id}
      className="text-sm font-semibold text-slate-700 cursor-pointer select-none flex items-center gap-2.5"
    >
      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      {label}
    </label>
    <ToggleSwitch id={id} checked={checked} onChange={onChange} disabled={saving} />
  </div>
);

// ── Radio button for overdue frequency ───────────────────────────────────────
const FrequencyRadio = ({ value, current, onChange, label, description, saving }) => (
  <label
    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition duration-150
      ${current === value
        ? 'border-blue-500 bg-blue-50/60'
        : 'border-slate-200 hover:border-slate-300 bg-white'}
      ${saving ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <input
      type="radio"
      name="frequency_overdue"
      value={value}
      checked={current === value}
      onChange={() => onChange(value)}
      disabled={saving}
      className="mt-0.5 accent-blue-600"
    />
    <div>
      <div className="text-sm font-bold text-slate-800">{label}</div>
      {description && (
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
      )}
    </div>
  </label>
);

// ── Main component ─────────────────────────────────────────────────────────────
const NotificationSettings = () => {
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [savedOnce, setSavedOnce]   = useState(false);

  const [settings, setSettings] = useState({
    remind_30_days:    false,
    remind_14_days:    false,
    remind_7_days:     true,
    remind_3_days:     false,
    remind_1_day:      true,
    remind_on_due:     true,
    send_time:         '08:00',
    frequency_overdue: 'daily',
  });

  // ── Load current settings on mount ────────────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await notificationAPI.getSettings();
        const data = res.data.data;
        if (data) {
          setSettings({
            remind_30_days:    data.remind_30_days    ?? false,
            remind_14_days:    data.remind_14_days    ?? false,
            remind_7_days:     data.remind_7_days     ?? true,
            remind_3_days:     data.remind_3_days     ?? false,
            remind_1_day:      data.remind_1_day      ?? true,
            remind_on_due:     data.remind_on_due     ?? true,
            send_time:         data.send_time         || '08:00',
            frequency_overdue: data.frequency_overdue || 'daily',
          });
        }
      } catch (err) {
        toast.error('Failed to load notification settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // ── Generic toggle handler ─────────────────────────────────────────────────
  const handleToggle = (key) => (val) => setSettings((prev) => ({ ...prev, [key]: val }));

  // ── Save settings ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      await notificationAPI.updateSettings(settings);
      setSavedOnce(true);
      toast.success('Notification settings saved!', { icon: '🔔' });
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link
          to="/landlord/notifications"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          title="Back to notifications"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900">Notification Settings</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Choose when your tenants receive rent reminders
          </p>
        </div>
      </div>

      {/* Saved indicator */}
      {savedOnce && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          Settings are active — the engine picks them up on the next hourly tick
        </div>
      )}

      {/* ── Section 1: Reminder Schedule ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Reminder Schedule
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Select which days before the due date tenants receive reminders
            </p>
          </div>
        </div>
        <div className="px-6 py-2">
          <ReminderRow
            id="remind_30_days"
            label="30 days before due date"
            checked={settings.remind_30_days}
            onChange={handleToggle('remind_30_days')}
            saving={saving}
          />
          <ReminderRow
            id="remind_14_days"
            label="14 days before due date"
            checked={settings.remind_14_days}
            onChange={handleToggle('remind_14_days')}
            saving={saving}
          />
          <ReminderRow
            id="remind_7_days"
            label="7 days before due date"
            checked={settings.remind_7_days}
            onChange={handleToggle('remind_7_days')}
            saving={saving}
          />
          <ReminderRow
            id="remind_3_days"
            label="3 days before due date"
            checked={settings.remind_3_days}
            onChange={handleToggle('remind_3_days')}
            saving={saving}
          />
          <ReminderRow
            id="remind_1_day"
            label="1 day before due date"
            checked={settings.remind_1_day}
            onChange={handleToggle('remind_1_day')}
            saving={saving}
          />
          <ReminderRow
            id="remind_on_due"
            label="On the due date itself"
            checked={settings.remind_on_due}
            onChange={handleToggle('remind_on_due')}
            saving={saving}
          />
        </div>
      </div>

      {/* ── Section 2: Send Time ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Send Time
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              What time should reminders be sent?
            </p>
          </div>
        </div>
        <div className="px-6 py-5">
          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
            Preferred send time
          </label>
          <input
            id="send_time"
            type="time"
            value={settings.send_time}
            onChange={(e) => setSettings((prev) => ({ ...prev, send_time: e.target.value }))}
            disabled={saving}
            className="block w-44 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          <p className="mt-2 text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Time is in West Africa Time (WAT, UTC+1). The engine runs hourly and fires when the hour matches.
          </p>
        </div>
      </div>

      {/* ── Section 3: Overdue Frequency ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Overdue Reminders
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              After rent is due, send follow-up reminders:
            </p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          <FrequencyRadio
            value="daily"
            current={settings.frequency_overdue}
            onChange={(v) => setSettings((prev) => ({ ...prev, frequency_overdue: v }))}
            label="Every day"
            description="Send a reminder each day until rent is paid"
            saving={saving}
          />
          <FrequencyRadio
            value="every_2_days"
            current={settings.frequency_overdue}
            onChange={(v) => setSettings((prev) => ({ ...prev, frequency_overdue: v }))}
            label="Every 2 days"
            description="Send a reminder every other day"
            saving={saving}
          />
          <FrequencyRadio
            value="weekly"
            current={settings.frequency_overdue}
            onChange={(v) => setSettings((prev) => ({ ...prev, frequency_overdue: v }))}
            label="Once a week"
            description="Send a single reminder each week"
            saving={saving}
          />
        </div>
      </div>

      {/* ── Save button ───────────────────────────────────────────────────── */}
      <div className="flex justify-end pb-6">
        <button
          id="save-notification-settings"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                     text-white text-sm font-black rounded-xl transition duration-150 shadow-md shadow-blue-200
                     active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving…' : 'Save Notification Settings'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
