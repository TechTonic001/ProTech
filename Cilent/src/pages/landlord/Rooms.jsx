import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  propertyAPI,
  roomAPI,
  approvalAPI,
  leaseAPI,
} from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import {
  formatDate,
  formatDateShort,
  dueDateLabel,
  daysUntilDue,
} from '../../utils/dateUtils';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import SkeletonCard from '../../components/ui/SkeletonCard';
import { Building2, Trash2 } from 'lucide-react';
import { tenantAPI } from '../../utils/api';

const TABS = ['Available Rooms', 'Assigned Rooms'];

const RoomsSkeletonGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <SkeletonCard key={i} lines={3} />
    ))}
  </div>
);

const EditRoomModal = ({ room, onClose, onSaved }) => {
  const [form, setForm] = useState({
    room_number: room.room_number || '',
    room_type: room.room_type || 'Single',
    monthly_rent: room.monthly_rent || '',
    payment_frequency: room.payment_frequency || 'monthly',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await roomAPI.update(room.room_id, {
        room_number: form.room_number,
        room_type: form.room_type,
        monthly_rent: Number(form.monthly_rent),
        payment_frequency: form.payment_frequency,
      });
      toast.success('Room updated successfully');
      onSaved({ ...room, ...res.data.data });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update room');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit Room ${room.room_number}`}>
      <form onSubmit={handleSave} className="p-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Room Number</label>
          <input
            value={form.room_number}
            onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))}
            className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
            required
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Room Type</label>
          <input
            value={form.room_type}
            onChange={(e) => setForm((f) => ({ ...f, room_type: e.target.value }))}
            className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Rent (₦)</label>
          <input
            type="number"
            value={form.monthly_rent}
            onChange={(e) => setForm((f) => ({ ...f, monthly_rent: e.target.value }))}
            className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
            required
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Payment Frequency</label>
          <select
            value={form.payment_frequency}
            onChange={(e) => setForm((f) => ({ ...f, payment_frequency: e.target.value }))}
            className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="annually">Annually</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </Modal>
  );
};

const RoomEditButton = ({ onClick, label = 'Edit Room', iconOnly = false }) => (
  <button
    type="button"
    onClick={onClick}
    title="Edit room"
    className={
      iconOnly
        ? 'p-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white shadow-sm transition-all active:scale-95'
        : `flex items-center justify-center gap-2 w-full
           bg-green-700 hover:bg-green-800 text-white font-bold text-sm
           px-4 py-2.5 rounded-xl shadow-sm shadow-green-900/25
           active:scale-[0.97] transition-all duration-150`
    }
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
    {!iconOnly && label}
  </button>
);

const AvailableRoomCard = ({ room, onUpdated, onDeleted, onAssign }) => {
  const [showEdit, setShowEdit] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Delete this room permanently?')) return;
    try {
      await roomAPI.delete(room.room_id);
      toast.success('Room deleted');
      onDeleted(room.room_id);
    } catch (err) {
      toast.error(err.message || 'Failed to delete room');
    }
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 hover:border-green-300 hover:shadow-md transition-all flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <span className="font-black text-slate-800 text-sm">{room.room_number}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Available</span>
      </div>
      <div className="text-xs text-slate-500 space-y-1">
        <p>{room.property_name}</p>
        <p>{room.room_type}</p>
        <p className="font-bold text-slate-800 text-sm">
          {formatCurrency(room.monthly_rent)}
          <span className="font-normal text-slate-400">
            /{room.payment_frequency === 'annually' ? 'yr' : 'mo'}
          </span>
        </p>
      </div>
      <RoomEditButton onClick={() => setShowEdit(true)} />
      <button
        type="button"
        onClick={() => onAssign(room)}
        className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
      >
        Assign Tenant
      </button>
      <button
        type="button"
        onClick={handleDelete}
        className="flex items-center justify-center gap-1 text-xs text-red-500 hover:text-red-700"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      {showEdit && (
        <EditRoomModal room={room} onClose={() => setShowEdit(false)} onSaved={onUpdated} />
      )}
    </div>
  );
};

const AssignedRoomCard = ({ room, onRemoved }) => {
  const [showRemove, setShowRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const days = room.end_date ? daysUntilDue(room.end_date) : null;
  const isOverdue = days !== null && days < 0;
  const paid = Number(room.amount_paid_this_cycle || 0);
  const rent = Number(room.rent_amount || room.monthly_rent || 0);
  const pct = rent > 0 ? Math.min(100, (paid / rent) * 100) : 0;

  return (
    <div className={`bg-white rounded-2xl p-5 border-2 transition-all ${isOverdue ? 'border-red-200 shadow-red-50' : 'border-slate-200'
      }`}>
      <div className="flex justify-between items-center mb-4">
        <span className="font-black text-slate-900">{room.room_number}</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isOverdue ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'
          }`}>
          {isOverdue ? 'OVERDUE' : 'Assigned'}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{room.property_name}</p>
      <div className="flex items-center gap-3 mb-4 bg-slate-50 rounded-xl p-3">
        <div className="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
          {room.tenant_name?.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{room.tenant_name}</p>
          <p className="text-xs text-slate-400 truncate">@{room.tenant_username}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowRemove(true)}
          className="ml-auto text-xs font-bold px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white"
        >
          Remove Tenant
        </button>
      </div>
      <DeleteConfirmModal
        isOpen={showRemove}
        onClose={() => setShowRemove(false)}
        itemType="tenant"
        itemName={room.tenant_name}
        isLoading={removing}
        onConfirm={async (reason) => {
          try {
            const tenantId = room.tenant_id || room.tenant?.id || room.tenant?.tenant_id || room.tenant_user_id;
            if (!tenantId) {
              toast.error('No tenant ID found for this assignment.');
              return;
            }

            setRemoving(true);
            await tenantAPI.unassign(tenantId);
            toast.success('Tenant removed from room');
            // Optimistic UI update: mark room unassigned
            if (onRemoved) onRemoved(room.room_id);
            setShowRemove(false);
          } catch (err) {
            toast.error(err.message || 'Failed to remove tenant');
          } finally {
            setRemoving(false);
          }
        }}
      />
      <div className="space-y-2">
        {[
          ['Lease Start', formatDateShort(room.start_date)],
          ['Lease End', formatDateShort(room.end_date)],
          ['Due Date', formatDateShort(room.end_date)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-slate-400">{label}</span>
            <span className="font-semibold text-slate-700">{value}</span>
          </div>
        ))}
        <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-400">Status</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dueDateLabel(room.end_date).includes('overdue')
              ? 'bg-red-100 text-red-700'
              : dueDateLabel(room.end_date).includes('today')
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
            }`}>
            {dueDateLabel(room.end_date)}
          </span>
        </div>
        <div className="pt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Balance</span>
            <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-green-700'}`}>
              ₦{(rent - paid).toLocaleString()} remaining
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full">
            <div
              className={`h-1.5 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-green-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const Rooms = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Available Rooms');
  const [rooms, setRooms] = useState([]);
  const [properties, setProperties] = useState([]);
  const [approvedTenants, setApprovedTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [leaseForm, setLeaseForm] = useState({ tenant_id: '', start_date: '', end_date: '' });
  const [formError, setFormError] = useState('');

  const getUniqueApprovedTenants = (tenants) => {
    const seen = new Set();
    return (tenants || []).filter((tenant) => {
      if (seen.has(tenant.tenant_id)) return false;
      seen.add(tenant.tenant_id);
      return true;
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [roomsRes, propsRes, approvedRes] = await Promise.all([
          roomAPI.getAllWithLeases(),
          propertyAPI.getAll(),
          approvalAPI.getApproved
            ? approvalAPI.getApproved()
            : approvalAPI.getPending(),
        ]);
        const fetchedRooms = roomsRes.data || [];
        const uniqueRoomsById = Array.from(
          fetchedRooms.reduce((map, room) => {
            const existing = map.get(room.room_id);
            if (!existing) {
              map.set(room.room_id, room);
            } else if (!existing.is_occupied && room.is_occupied) {
              map.set(room.room_id, { ...existing, ...room });
            }
            return map;
          }, new Map()).values()
        );
        uniqueRoomsById.sort((a, b) => (Number(a.room_number) || 0) - (Number(b.room_number) || 0));
        setRooms(uniqueRoomsById);
        setProperties(propsRes.data.data || []);
        setApprovedTenants(getUniqueApprovedTenants(approvedRes.data.data || []));
      } catch (err) {
        toast.error(err.message || 'Failed to load rooms.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = rooms.slice();
    if (selectedProperty !== 'all') {
      r = r.filter((room) => room.property_id === parseInt(selectedProperty, 10));
    }
    const available = r.filter((room) => !room.is_occupied || room.is_occupied === 0)
      .sort((a, b) => (Number(a.room_number) || 0) - (Number(b.room_number) || 0));
    const assigned = r.filter((room) => room.is_occupied === 1 || room.is_occupied === true)
      .sort((a, b) => (Number(a.room_number) || 0) - (Number(b.room_number) || 0));
    return { available, assigned };
  }, [rooms, selectedProperty]);

  const openAssignModal = (room) => {
    setSelectedRoom(room);
    setLeaseForm({ tenant_id: '', start_date: '', end_date: '' });
    setFormError('');
    setIsLeaseModalOpen(true);
  };

  const handleLeaseSubmit = async (e) => {
    e.preventDefault();
    if (!leaseForm.tenant_id || !leaseForm.start_date || !leaseForm.end_date) {
      setFormError('All fields are required');
      return;
    }
    try {
      await leaseAPI.create({
        tenant_id: Number(leaseForm.tenant_id),
        room_id: selectedRoom.room_id,
        start_date: leaseForm.start_date,
        end_date: leaseForm.end_date,
        rent_amount: Number(selectedRoom.monthly_rent || 0),
      });
      setRooms((prev) => {
        const updated = prev.map((r) =>
          r.room_id === selectedRoom.room_id
            ? { ...r, is_occupied: 1, tenant_name: approvedTenants.find((t) => t.tenant_id === Number(leaseForm.tenant_id))?.full_name }
            : r
        );
        updated.sort((a, b) => (Number(a.room_number) || 0) - (Number(b.room_number) || 0));
        return updated;
      });
      toast.success('Tenant assigned and lease created!');
      setIsLeaseModalOpen(false);
      setActiveTab('Assigned Rooms');
    } catch (err) {
      setFormError(err.message || 'Failed to assign tenant');
      toast.error(err.message || 'Failed to assign tenant');
    }
  };

  if (!loading && properties.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No hostels registered"
        message="Create a property first to manage rooms."
        actionText="Add Hostel"
        onActionClick={() => navigate('/landlord/properties')}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Rooms</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.assigned.length} assigned · {filtered.available.length} available
          </p>
        </div>
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium bg-white focus:ring-2 focus:ring-green-600 focus:outline-none"
        >
          <option value="all">All Properties</option>
          {properties.map((p) => (
            <option key={p.property_id} value={p.property_id}>{p.property_name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {tab}
            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === tab ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
              }`}>
              {tab === 'Available Rooms' ? filtered.available.length : filtered.assigned.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <RoomsSkeletonGrid />
      ) : activeTab === 'Available Rooms' ? (
        filtered.available.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-3">🏠</div>
            <p className="font-semibold">No available rooms</p>
            <p className="text-sm mt-1">All rooms are currently assigned</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.available.map((room) => (
              <AvailableRoomCard
                key={room.room_id}
                room={room}
                onUpdated={(updated) => setRooms((prev) => prev.map((r) => r.room_id === updated.room_id ? updated : r))}
                onDeleted={(id) => setRooms((prev) => prev.filter((r) => r.room_id !== id))}
                onAssign={openAssignModal}
              />
            ))}
          </div>
        )
      ) : filtered.assigned.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-3">👤</div>
          <p className="font-semibold">No assigned rooms yet</p>
          <p className="text-sm mt-1">Approve a tenant to assign them to a room</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.assigned.map((room) => (
            <AssignedRoomCard
              key={room.room_id}
              room={room}
              onRemoved={(roomId) => setRooms((prev) => prev.map((r) => r.room_id === roomId ? { ...r, is_occupied: 0, tenant_name: null, tenant_username: null } : r))}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={isLeaseModalOpen}
        onClose={() => setIsLeaseModalOpen(false)}
        title={`Assign Tenant — Room ${selectedRoom?.room_number}`}
      >
        <form onSubmit={handleLeaseSubmit} className="p-6 space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3">{formError}</p>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Approved Tenant</label>
            <select
              value={leaseForm.tenant_id}
              onChange={(e) => setLeaseForm((f) => ({ ...f, tenant_id: e.target.value }))}
              className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              required
            >
              <option value="">-- Choose Tenant --</option>
              {approvedTenants.map((t) => (
                <option key={t.tenant_id} value={t.tenant_id}>
                  {t.full_name} (@{t.username})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
              <input type="date" value={leaseForm.start_date}
                onChange={(e) => setLeaseForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
              <input type="date" value={leaseForm.end_date}
                onChange={(e) => setLeaseForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm" required />
            </div>
          </div>
          <button type="submit" disabled={!leaseForm.tenant_id}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-60">
            Assign Tenant & Create Lease
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Rooms;
