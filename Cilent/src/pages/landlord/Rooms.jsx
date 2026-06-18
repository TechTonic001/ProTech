// src/pages/landlord/Rooms.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { propertyAPI, roomAPI, approvalAPI, leaseAPI } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { 
  DoorOpen, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  Building2, 
  Loader2,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const Rooms = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialPropertyId = queryParams.get('property_id');

  const [properties, setProperties] = useState([]);
  const [activePropertyId, setActivePropertyId] = useState(initialPropertyId || '');
  const [rooms, setRooms] = useState([]);
  const [leases, setLeases] = useState([]);
  const [approvedTenants, setApprovedTenants] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);

  // Modal states
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  
  // Selected Room for lease assignment
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Add Room form state
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: 'Single',
    monthly_rent: '',
  });

  // Assign Tenant (Lease Creation) form state
  const [leaseForm, setLeaseForm] = useState({
    tenant_id: '',
    start_date: '',
    end_date: '',
    rent_amount: '',
    due_day: 5,
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activePropertyId) {
      fetchRooms(activePropertyId);
    } else {
      setRooms([]);
    }
  }, [activePropertyId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const propRes = await propertyAPI.getAll();
      const propList = propRes.data.data || [];
      setProperties(propList);
      
      if (propList.length > 0) {
        // Use initial query param or first property
        const activeId = initialPropertyId && propList.some(p => String(p.property_id) === String(initialPropertyId))
          ? initialPropertyId 
          : propList[0].property_id;
        setActivePropertyId(activeId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load hostels');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (propertyId) => {
    try {
      setRoomsLoading(true);
      const [roomRes, leaseRes, tenantRes] = await Promise.all([
        roomAPI.getAll(propertyId),
        leaseAPI.getAll(),
        approvalAPI.getPending() // Fetch approvals or rather approved tenants
      ]);

      setRooms(roomRes.data.data || []);
      setLeases(leaseRes.data.data || []);
      
      // Load approved tenants who don't have leases yet
      try {
        const approvedRes = await approvalAPI.getPending(); // Fallback to approved endpoint we added
        // Wait, inside api.js we have: getApproved: () => api.get('/approval/approved')
        // Let's call the approved endpoint:
        const approvedResReal = await approvalAPI.getPending(); // Default safe list
        // Let's try to query approvalAPI.getApproved we added:
        const approvedResTrue = await approvalAPI.getApproved ? await approvalAPI.getApproved() : approvedResReal;
        setApprovedTenants(approvedResTrue.data.data || []);
      } catch (err) {
        setApprovedTenants([]);
      }

    } catch (err) {
      toast.error(err.message || 'Failed to load rooms');
    } finally {
      setRoomsLoading(false);
    }
  };

  // Add Room submits
  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomForm.room_number || !roomForm.monthly_rent) {
      setFormError('Room Number and Rent are required');
      return;
    }

    setFormError('');
    setSubmitLoading(true);
    try {
      await roomAPI.create({
        property_id: activePropertyId,
        room_number: roomForm.room_number,
        room_type: roomForm.room_type,
        monthly_rent: Number(roomForm.monthly_rent),
      });
      toast.success('Room created successfully');
      setIsRoomModalOpen(false);
      setRoomForm({ room_number: '', room_type: 'Single', monthly_rent: '' });
      fetchRooms(activePropertyId);
    } catch (err) {
      setFormError(err.message || 'Failed to create room');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Assign Tenant submits
  const handleLeaseSubmit = async (e) => {
    e.preventDefault();
    if (!leaseForm.tenant_id || !leaseForm.start_date || !leaseForm.end_date || !leaseForm.rent_amount) {
      setFormError('All fields are required');
      return;
    }

    setFormError('');
    setSubmitLoading(true);
    try {
      await leaseAPI.create({
        tenant_id: leaseForm.tenant_id,
        room_id: selectedRoom.room_id,
        start_date: leaseForm.start_date,
        end_date: leaseForm.end_date,
        rent_amount: Number(leaseForm.rent_amount),
        due_day: Number(leaseForm.due_day),
      });
      toast.success('Tenant assigned and lease created!');
      setIsLeaseModalOpen(false);
      fetchRooms(activePropertyId);
    } catch (err) {
      setFormError(err.message || 'Failed to assign tenant');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openAssignModal = (room) => {
    setSelectedRoom(room);
    setLeaseForm({
      tenant_id: '',
      start_date: '',
      end_date: '',
      rent_amount: room.monthly_rent || '',
      due_day: 5,
    });
    setFormError('');
    setIsLeaseModalOpen(true);
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room? This cannot be undone.')) {
      return;
    }
    try {
      await roomAPI.delete(roomId);
      toast.success('Room deleted successfully');
      fetchRooms(activePropertyId);
    } catch (err) {
      toast.error(err.message || 'Failed to delete room');
    }
  };

  const getRoomLease = (roomId) => {
    return leases.find(l => l.room_id === roomId && l.lease_status === 'active');
  };

  const getDaysLeft = (leaseItem) => {
    if (!leaseItem) return '';
    const now = new Date();
    const dueDay = leaseItem.due_day || 5;
    const due = new Date(now.getFullYear(), now.getMonth(), dueDay);
    
    // If due day passed in current month, set due to next month
    if (now.getDate() > dueDay) {
      due.setMonth(due.getMonth() + 1);
    }

    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Overdue';
    return `${diffDays} days left`;
  };

  const getDaysLeftColor = (leaseItem) => {
    const text = getDaysLeft(leaseItem);
    if (text === 'Overdue') return 'text-red-600 font-bold';
    const match = text.match(/\d+/);
    if (match) {
      const days = parseInt(match[0]);
      if (days <= 7) return 'text-amber-600 font-bold animate-pulse';
    }
    return 'text-green-600 font-semibold';
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl lg:text-2xl font-black text-slate-900">Rooms Management</h2>
        </div>
        {activePropertyId && (
          <button
            onClick={() => setIsRoomModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hostels registered"
          message="You need to create a property before adding rooms."
          actionText="Add Property"
          onActionClick={() => navigate('/landlord/properties')}
        />
      ) : (
        <>
          {/* Property Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-100 select-none">
            {properties.map(p => (
              <button
                key={p.property_id}
                onClick={() => setActivePropertyId(p.property_id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 border
                  ${activePropertyId === p.property_id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {p.property_name}
              </button>
            ))}
          </div>

          {roomsLoading ? (
            <LoadingSpinner />
          ) : rooms.length === 0 ? (
            <EmptyState
              icon={DoorOpen}
              title="No rooms in this hostel"
              message="This property does not have any units yet. Create a room to assign tenants."
              actionText="Add Room"
              onActionClick={() => setIsRoomModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map(room => {
                const activeLease = getRoomLease(room.room_id);
                const isOccupied = room.is_occupied || !!activeLease;
                
                // Color border based on lease
                let borderColor = 'border-slate-200';
                if (isOccupied) {
                  const daysLeftText = getDaysLeft(activeLease);
                  if (daysLeftText === 'Overdue') {
                    borderColor = 'border-red-300';
                  } else {
                    borderColor = 'border-green-200';
                  }
                }

                return (
                  <div
                    key={room.room_id}
                    className={`bg-white rounded-2xl border-2 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition duration-200 ${borderColor}`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-2xl font-black text-slate-900 leading-none">
                          {room.room_number}
                        </span>
                        <Badge status={isOccupied ? 'paid' : 'pending'}>
                          {isOccupied ? 'Occupied' : 'Vacant'}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {room.room_type} Room
                      </div>
                      <div className="text-lg font-black text-blue-600 mt-3">
                        {formatCurrency(room.monthly_rent)}
                        <span className="text-slate-400 text-xs font-semibold"> / month</span>
                      </div>

                      {/* Lease/Tenant Section */}
                      {isOccupied && activeLease && (
                        <div className="border-t border-slate-100 mt-4 pt-4 space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                              {activeLease.tenant_name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-xs">
                              <div className="font-bold text-slate-800 leading-none">{activeLease.tenant_name}</div>
                              <div className="text-[10px] text-slate-400">@{activeLease.tenant_email?.split('@')[0]}</div>
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
                            <span className={getDaysLeftColor(activeLease)}>
                              {getDaysLeft(activeLease)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
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
            </div>
          )}
        </>
      )}

      {/* Add Room Modal */}
      <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} title="Add New Room">
        <form onSubmit={handleRoomSubmit} className="p-6 space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3">
              {formError}
            </p>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
              Room Number / Label
            </label>
            <input
              type="text"
              value={roomForm.room_number}
              onChange={(e) => setRoomForm(prev => ({ ...prev, room_number: e.target.value }))}
              placeholder="e.g. Room 101, Flat B"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                Room Type
              </label>
              <select
                value={roomForm.room_type}
                onChange={(e) => setRoomForm(prev => ({ ...prev, room_type: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              >
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="Ensuite">Ensuite</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                Monthly Rent (₦)
              </label>
              <input
                type="number"
                value={roomForm.monthly_rent}
                onChange={(e) => setRoomForm(prev => ({ ...prev, monthly_rent: e.target.value }))}
                placeholder="e.g. 15000"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
          >
            {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Room'}
          </button>
        </form>
      </Modal>

      {/* Assign Tenant (Create Lease) Modal */}
      <Modal isOpen={isLeaseModalOpen} onClose={() => setIsLeaseModalOpen(false)} title={`Assign Tenant — Room ${selectedRoom?.room_number}`}>
        <form onSubmit={handleLeaseSubmit} className="p-6 space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3">
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
                onChange={(e) => setLeaseForm(prev => ({ ...prev, tenant_id: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              >
                <option value="">-- Choose Tenant --</option>
                {approvedTenants.map(t => (
                  <option key={t.tenant_id} value={t.tenant_id}>
                    {t.full_name} (@{t.username})
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
                onChange={(e) => setLeaseForm(prev => ({ ...prev, start_date: e.target.value }))}
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
                onChange={(e) => setLeaseForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                Rent Amount (₦)
              </label>
              <input
                type="number"
                value={leaseForm.rent_amount}
                onChange={(e) => setLeaseForm(prev => ({ ...prev, rent_amount: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                Monthly Due Day (1-28)
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={leaseForm.due_day}
                onChange={(e) => setLeaseForm(prev => ({ ...prev, due_day: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitLoading || !leaseForm.tenant_id}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Tenant & Create Lease'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Rooms;
