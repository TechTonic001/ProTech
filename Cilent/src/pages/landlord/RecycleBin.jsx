// src/pages/landlord/RecycleBin.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { propertyAPI, tenantAPI } from '../../utils/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { Trash2, RotateCcw, User, Building2, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Countdown badge ────────────────────────────────────────────────────────────
const DaysRemaining = ({ days }) => {
  const urgent = days <= 3;
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider
        ${urgent
          ? 'bg-red-100 text-red-700 border border-red-200'
          : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}
    >
      <Clock className="w-3 h-3" />
      {urgent ? (
        <span>⚠ Deleting in {days}d — restore now!</span>
      ) : (
        <span>Permanent deletion in {days} days</span>
      )}
    </div>
  );
};

// ── RecycleBin page ────────────────────────────────────────────────────────────
const RecycleBin = () => {
  const [deletedTenants,    setDeletedTenants]    = useState([]);
  const [deletedProperties, setDeletedProperties] = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [restoringId,       setRestoringId]       = useState(null);

  // ── Fetch both deleted lists ──────────────────────────────────────────────
  const fetchDeleted = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantRes, propRes] = await Promise.all([
        tenantAPI.getDeleted(),
        propertyAPI.getDeleted(),
      ]);
      setDeletedTenants(tenantRes.data.data || []);
      setDeletedProperties(propRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeleted();
  }, [fetchDeleted]);

  // ── Restore tenant ─────────────────────────────────────────────────────────
  const handleRestoreTenant = async (tenant) => {
    try {
      setRestoringId(`tenant-${tenant.user_id}`);
      await tenantAPI.restore(tenant.user_id);
      toast.success(`${tenant.full_name} has been restored`);
      await fetchDeleted();
    } catch (err) {
      toast.error(err.message || 'Failed to restore tenant');
    } finally {
      setRestoringId(null);
    }
  };

  // ── Restore property ───────────────────────────────────────────────────────
  const handleRestoreProperty = async (property) => {
    try {
      setRestoringId(`property-${property.property_id}`);
      await propertyAPI.restore(property.property_id);
      toast.success(`${property.property_name} has been restored`);
      await fetchDeleted();
    } catch (err) {
      toast.error(err.message || 'Failed to restore property');
    } finally {
      setRestoringId(null);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  const totalItems = deletedTenants.length + deletedProperties.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Recycle Bin</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {totalItems === 0
                ? 'No deleted items — everything is active'
                : `${totalItems} item${totalItems === 1 ? '' : 's'} pending permanent deletion`}
            </p>
          </div>
          {totalItems > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {totalItems}
            </span>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 font-semibold leading-relaxed">
          Deleted items are kept for <strong>30 days</strong> before being permanently removed.
          Items within <strong>3 days</strong> of expiry are flagged in red. Restore them before
          the window closes — permanent deletion cannot be undone.
        </p>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Recycle bin is empty"
          message="Deleted tenants and properties will appear here. You have 30 days to restore them."
        />
      ) : (
        <>
          {/* ── Deleted Tenants ──────────────────────────────────────────── */}
          {deletedTenants.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Deleted Tenants
                </h2>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {deletedTenants.length}
                </span>
              </div>
              <div className="space-y-3">
                {deletedTenants.map((tenant) => {
                  const isRestoring = restoringId === `tenant-${tenant.user_id}`;
                  const isUrgent    = tenant.days_remaining <= 3;
                  return (
                    <div
                      key={tenant.user_id}
                      className={`bg-white rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition
                        ${isUrgent ? 'border-red-300 shadow-sm shadow-red-100' : 'border-slate-100 shadow-xs'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0
                        ${isUrgent ? 'bg-red-500' : 'bg-slate-400'}`}
                      >
                        {tenant.full_name?.charAt(0).toUpperCase() || 'T'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-black text-slate-900">{tenant.full_name}</span>
                          <span className="text-[11px] text-slate-400 font-semibold">@{tenant.username}</span>
                          {isUrgent && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">
                              ⚠ Deleting soon
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium flex flex-wrap gap-x-3 gap-y-1">
                          <span>{tenant.property_name ? `${tenant.property_name} — Room ${tenant.room_number}` : 'No room assigned'}</span>
                          <span>•</span>
                          <span>Deleted {tenant.days_since_deletion}d ago</span>
                        </div>
                        <div className="mt-2">
                          <DaysRemaining days={tenant.days_remaining} />
                        </div>
                        {tenant.deletion_reason && (
                          <p className="mt-1.5 text-[11px] text-slate-400 italic">
                            Reason: {tenant.deletion_reason}
                          </p>
                        )}
                      </div>

                      {/* Restore button */}
                      <button
                        id={`restore-tenant-${tenant.user_id}`}
                        onClick={() => handleRestoreTenant(tenant)}
                        disabled={isRestoring}
                        className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700
                                   disabled:bg-green-400 text-white text-xs font-black rounded-xl
                                   transition duration-150 active:scale-95 flex-shrink-0"
                      >
                        {isRestoring ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        {isRestoring ? 'Restoring…' : 'Restore'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Deleted Properties ───────────────────────────────────────── */}
          {deletedProperties.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Deleted Properties
                </h2>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {deletedProperties.length}
                </span>
              </div>
              <div className="space-y-3">
                {deletedProperties.map((prop) => {
                  const isRestoring = restoringId === `property-${prop.property_id}`;
                  const isUrgent    = prop.days_remaining <= 3;
                  return (
                    <div
                      key={prop.property_id}
                      className={`bg-white rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition
                        ${isUrgent ? 'border-red-300 shadow-sm shadow-red-100' : 'border-slate-100 shadow-xs'}`}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                        ${isUrgent ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-black text-slate-900">{prop.property_name}</span>
                          {isUrgent && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">
                              ⚠ Deleting soon
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium flex flex-wrap gap-x-3 gap-y-1">
                          <span>{prop.address}</span>
                          <span>•</span>
                          <span>{prop.total_rooms} rooms</span>
                          <span>•</span>
                          <span>Deleted {prop.days_since_deletion}d ago</span>
                        </div>
                        <div className="mt-2">
                          <DaysRemaining days={prop.days_remaining} />
                        </div>
                      </div>

                      {/* Restore button */}
                      <button
                        id={`restore-property-${prop.property_id}`}
                        onClick={() => handleRestoreProperty(prop)}
                        disabled={isRestoring}
                        className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700
                                   disabled:bg-green-400 text-white text-xs font-black rounded-xl
                                   transition duration-150 active:scale-95 flex-shrink-0"
                      >
                        {isRestoring ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        {isRestoring ? 'Restoring…' : 'Restore'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default RecycleBin;
