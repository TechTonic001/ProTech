import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyAPI, roomAPI, approvalAPI, leaseAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SkeletonCard from '../../components/ui/SkeletonCard';
import {
  DoorOpen,
  Calendar,
  Clock,
  Tag,
  Building2,
  Trash2,
  ChevronDown,
  ChevronUp,
  PencilLine,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_VISIBLE_COUNT = 50;

const compareRoomNumbers = (roomA, roomB) => {
  const numericA = Number.parseInt(String(roomA.room_number || '').replace(/\D/g, ''), 10);
  const numericB = Number.parseInt(String(roomB.room_number || '').replace(/\D/g, ''), 10);

  if (Number.isFinite(numericA) && Number.isFinite(numericB) && numericA !== numericB) {
    return numericA - numericB;
  }

  return String(roomA.room_number || '').localeCompare(String(roomB.room_number || ''));
};

const Rooms = () => {
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [leases, setLeases] = useState([]);
  const [approvedTenants, setApprovedTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [visibleCounts, setVisibleCounts] = useState({});

  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoomNumber, setEditingRoomNumber] = useState('');
  const [formError, setFormError] = useState('');

  const [leaseForm, setLeaseForm] = useState({
    tenant_id: '',
    start_date: '',
    end_date: '',
    due_day: 5,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const propertyRes = await propertyAPI.getAll();
      const propertyList = propertyRes.data.data || [];
      setProperties(propertyList);

      const [leaseRes, approvedRes, roomResponses] = await Promise.all([
        leaseAPI.getAll(),
        approvalAPI.getApproved ? approvalAPI.getApproved() : approvalAPI.getPending(),
        Promise.all(
          propertyList.map(async (property) => {
            try {
              const res = await roomAPI.getAll(property.property_id);
              return (res.data.data || []).map((room) => ({
                ...room,
                property_id: property.property_id,
                property_name: property.property_name,
              }));
            } catch {
              return [];
            }
          })
        ),
      ]);

      setRooms(roomResponses.flat());
      setLeases(leaseRes.data.data || []);
      setApprovedTenants(approvedRes.data.data || []);

      setExpandedGroups((current) => {
        if (Object.keys(current).length > 0) return current;
        return propertyList.reduce((accumulator, property) => {
          accumulator[property.property_name] = true;
          return accumulator;
        }, {});
      });
    } catch (err) {
      toast.error(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groupedRooms = useMemo(() => {
    return rooms.reduce((accumulator, room) => {
      const groupName = room.property_name || 'Unassigned';
      if (!accumulator[groupName]) accumulator[groupName] = [];
      accumulator[groupName].push(room);
      return accumulator;
    }, {});
  }, [rooms]);

  const getRoomLease = useCallback(
    (roomId) => leases.find((lease) => lease.room_id === roomId && lease.lease_status === 'active'),
    [leases]
  );

  const toggleGroup = (groupName) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupName]: !current[groupName],
    }));
  };

  const getVisibleCount = (groupName) => visibleCounts[groupName] || DEFAULT_VISIBLE_COUNT;

  const incrementVisibleCount = (groupName) => {
    setVisibleCounts((current) => ({
      ...current,
      [groupName]: (current[groupName] || DEFAULT_VISIBLE_COUNT) + DEFAULT_VISIBLE_COUNT,
    }));
  };

  const beginRoomEdit = (room) => {
    setEditingRoomId(room.room_id);
    setEditingRoomNumber(room.room_number || '');
  };

  const saveRoomEdit = async (room) => {
    const nextName = editingRoomNumber.trim() || room.room_number;
    if (!nextName) {
      setEditingRoomId(null);
      setEditingRoomNumber('');
      return;
    }

    try {
      await roomAPI.update(room.room_id, { room_number: nextName });
      setRooms((current) => current.map((item) => (
        item.room_id === room.room_id
          ? { ...item, room_number: nextName }
          : item
      )));
      toast.success('Room updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update room');
    } finally {
      setEditingRoomId(null);
      setEditingRoomNumber('');
    }
  };

  const openAssignModal = (room) => {
    setSelectedRoom(room);
    setLeaseForm({
      tenant_id: '',
      start_date: '',
      end_date: '',
      due_day: 5,
    });
    setFormError('');
    setIsLeaseModalOpen(true);
  };

  const handleLeaseSubmit = async (event) => {
    event.preventDefault();

    if (!leaseForm.tenant_id || !leaseForm.start_date || !leaseForm.end_date) {
      setFormError('All fields are required');
      return;
    }

    setFormError('');
    try {
      await leaseAPI.create({
        tenant_id: leaseForm.tenant_id,
        room_id: selectedRoom.room_id,
        start_date: leaseForm.start_date,
        end_date: leaseForm.end_date,
        rent_amount: Number(selectedRoom.yearly_rent || 0),
        due_day: Number(leaseForm.due_day),
      });

      setRooms((current) => current.map((room) => (
        room.room_id === selectedRoom.room_id
          ? { ...room, is_occupied: 1 }
          : room
      )));
      toast.success('Tenant assigned and lease created!');
      setIsLeaseModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to assign tenant');
      toast.error(err.message || 'Failed to assign tenant');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room? This cannot be undone.')) {
      return;
    }

    try {
      await roomAPI.delete(roomId);
      setRooms((current) => current.filter((room) => room.room_id !== roomId));
      toast.success('Room deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete room');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No hostels registered"
        message="You need to create a property before the rooms for it can be generated automatically."
        actionText="Add Hostel"
        onActionClick={() => navigate('/landlord/properties')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl lg:text-2xl font-black text-slate-900">Rooms Management</h2>
          <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-full">
            {rooms.length}
          </span>
        </div>
      </div>

      {Object.keys(groupedRooms).length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No rooms yet"
          message="Create a property with a room count to auto-generate Room 1, Room 2, and so on."
          actionText="Add Property"
          onActionClick={() => navigate('/landlord/properties')}
        />
      ) : (
        <div>
          {Object.entries(groupedRooms).map(([propertyName, propertyRooms]) => {
            const isExpanded = expandedGroups[propertyName] !== false;
            const visibleCount = getVisibleCount(propertyName);

            return (
              <div key={propertyName} className="mb-4">
                <button
                  onClick={() => toggleGroup(propertyName)}
                  className="w-full flex justify-between items-center bg-slate-100 px-5 py-3 rounded-xl font-bold text-slate-900 text-sm"
                >
                  <span>{propertyName}</span>
                  <span className="text-slate-400 flex items-center gap-2">
                    {propertyRooms.length} rooms
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3 px-1">
                    {propertyRooms
                      .slice()
                      .sort(compareRoomNumbers)
                      .slice(0, visibleCount)
                      .map((room) => {
                      const activeLease = getRoomLease(room.room_id);
                      const isOccupied = room.is_occupied || !!activeLease;

                      return (
                        <div key={room.room_id} className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition duration-200">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                {editingRoomId === room.room_id ? (
                                  <input
                                    autoFocus
                                    value={editingRoomNumber}
                                    onChange={(event) => setEditingRoomNumber(event.target.value)}
                                    onBlur={() => saveRoomEdit(room)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        saveRoomEdit(room);
                                      }
                                      if (event.key === 'Escape') {
                                        setEditingRoomId(null);
                                        setEditingRoomNumber('');
                                      }
                                    }}
                                    className="w-full text-lg font-black text-slate-900 border border-blue-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => beginRoomEdit(room)}
                                    className="text-left inline-flex items-center gap-1 text-lg font-black text-slate-900 leading-none hover:text-blue-600"
                                  >
                                    {room.room_number}
                                    <PencilLine className="w-3.5 h-3.5 text-slate-300" />
                                  </button>
                                )}
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {room.room_type} Room
                                </div>
                              </div>
                              <Badge status={isOccupied ? 'paid' : 'pending'}>
                                {isOccupied ? 'Occupied' : 'Vacant'}
                              </Badge>
                            </div>

                            <div className="text-lg font-black text-blue-600 mt-3">
                              {formatCurrency(room.yearly_rent)}
                              <span className="text-slate-400 text-xs font-semibold"> / year</span>
                            </div>

                            {isOccupied && activeLease && (
                              <div className="border-t border-slate-100 mt-4 pt-4 space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                    {activeLease.tenant_name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="text-xs min-w-0">
                                    <div className="font-bold text-slate-800 leading-none truncate">{activeLease.tenant_name}</div>
                                    <div className="text-[10px] text-slate-400 truncate">@{activeLease.tenant_username || activeLease.tenant_email?.split('@')[0]}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{activeLease.tenant_email}</div>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                                  <span className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold">
                                    <Calendar className="w-3.5 h-3.5" /> Due day
                                  </span>
                                  <span className="font-bold text-slate-800">{activeLease.due_day}th of month</span>
                                </div>

                                <div className="flex justify-between items-center text-xs font-medium">
                                  <span className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold">
                                    <Clock className="w-3.5 h-3.5" /> Status
                                  </span>
                                  <span className="text-green-600 font-semibold">Active</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-50 flex gap-2 items-center">
                            {!isOccupied ? (
                              <button
                                onClick={() => openAssignModal(room)}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
                              >
                                Assign Tenant
                              </button>
                            ) : (
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 p-2 rounded-lg text-center w-full">
                                Lease Active
                              </div>
                            )}

                            {!isOccupied && (
                              <button
                                onClick={() => handleDeleteRoom(room.room_id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Delete Room"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {propertyRooms.length > visibleCount && (
                      <button
                        onClick={() => incrementVisibleCount(propertyName)}
                        className="col-span-full w-full py-2 text-sm text-blue-600 font-bold border border-blue-200 rounded-xl mt-2 hover:bg-blue-50"
                      >
                        Show {Math.min(DEFAULT_VISIBLE_COUNT, propertyRooms.length - visibleCount)} more rooms
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isLeaseModalOpen} onClose={() => setIsLeaseModalOpen(false)} title={`Assign Tenant — Room ${selectedRoom?.room_number}`}>
        <form onSubmit={handleLeaseSubmit} className="p-6 space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3 animate-slide-down">
              {formError}
            </p>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
              Select Approved Tenant
            </label>
            {approvedTenants.length === 0 ? (
              <div className="text-xs text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-200">
                No approved tenants available. Ensure tenants register with your username and you approve them under the "Approvals" tab first.
              </div>
            ) : (
              <select
                value={leaseForm.tenant_id}
                onChange={(event) => setLeaseForm((current) => ({ ...current, tenant_id: event.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              >
                <option value="">-- Choose Tenant --</option>
                {approvedTenants.map((tenant) => (
                  <option key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.full_name} (@{tenant.username})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={leaseForm.start_date}
                onChange={(event) => setLeaseForm((current) => ({ ...current, start_date: event.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={leaseForm.end_date}
                onChange={(event) => setLeaseForm((current) => ({ ...current, end_date: event.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-bold text-blue-700">Annual Rent</p>
            <p className="text-sm text-blue-600 mt-1">
              {selectedRoom ? formatCurrency(selectedRoom.yearly_rent || 0) : '—'} will be used automatically for this lease.
            </p>
          </div>

          <button
            type="submit"
            disabled={!leaseForm.tenant_id}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Assign Tenant & Create Lease
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Rooms;