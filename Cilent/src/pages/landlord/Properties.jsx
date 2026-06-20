// src/pages/landlord/Properties.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Trash2, 
  Megaphone,
  DoorOpen,
  PenTool,
  Loader2,
  ListFilter
} from 'lucide-react';
import toast from 'react-hot-toast';

const Properties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    property_name: '',
    address: '',
    city: 'Ogbomoso',
    total_rooms: 0,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await propertyAPI.getAll();
      setProperties(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setForm({
      property_name: '',
      address: '',
      city: 'Ogbomoso',
      total_rooms: 0,
    });
    setFormError('');
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (prop) => {
    setForm({
      property_name: prop.property_name || '',
      address: prop.address || '',
      city: prop.city || 'Ogbomoso',
      total_rooms: prop.total_rooms || 0,
    });
    setSelectedPropertyId(prop.property_id);
    setFormError('');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.property_name || !form.address) {
      setFormError('Property Name and Address are required.');
      return;
    }

    setFormError('');
    setSubmitLoading(true);
    const oldProperties = [...properties];
    if (modalMode === 'create') {
      const optimisticProperty = {
        property_id: `temp-${Date.now()}`,
        property_name: form.property_name,
        address: form.address,
        city: form.city || 'Ogbomoso',
        total_rooms: parseInt(form.total_rooms) || 0,
        isOptimistic: true
      };
      setProperties(prev => [optimisticProperty, ...prev]);
    }

    try {
      if (modalMode === 'create') {
        await propertyAPI.create(form);
        toast.success('Property created successfully');
      } else {
        await propertyAPI.update(selectedPropertyId, form);
        toast.success('Property updated successfully');
      }
      setIsModalOpen(false);
      fetchProperties();
    } catch (err) {
      if (modalMode === 'create') {
        setProperties(oldProperties);
      }
      setFormError(err.message || 'Error saving property');
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property? This will delete all rooms associated with it.')) {
      return;
    }

    try {
      await propertyAPI.delete(id);
      toast.success('Property deleted successfully');
      fetchProperties();
    } catch (err) {
      toast.error(err.message || 'Failed to delete property');
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl lg:text-2xl font-black text-slate-900">My Properties</h2>
          <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-full">
            {properties.length}
          </span>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition duration-150 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties registered"
          message="Begin by registering a property or hostel building. Once added, you can configure rooms and assign tenants."
          actionText="Add Property"
          onActionClick={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {properties.map((prop) => (
            <div
              key={prop.property_id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between ${
                prop.isOptimistic ? 'border-blue-300 opacity-60 pointer-events-none' : 'border-slate-100'
              }`}
            >
              {/* Top accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-blue-500 to-blue-600" />
              
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0">
                    {prop.isOptimistic ? <Loader2 className="w-6 h-6 animate-spin" /> : <Building2 className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 truncate">{prop.property_name}</h3>
                      {prop.isOptimistic && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                          Saving...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{prop.address}, {prop.city}</span>
                    </p>
                  </div>
                </div>

                {/* Property Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 text-center">
                    <div className="text-sm font-black text-slate-900">{prop.total_rooms || 0}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Rooms</div>
                  </div>
                  <div className="bg-green-50/50 border border-green-100/50 rounded-xl p-2.5 text-center">
                    <div className="text-sm font-black text-green-700">{prop.total_rooms || 0}</div>
                    <div className="text-[9px] font-bold text-green-500 uppercase mt-0.5">Capacity</div>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-2.5 text-center">
                    <div className="text-sm font-black text-blue-700">{prop.city}</div>
                    <div className="text-[9px] font-bold text-blue-500 uppercase mt-0.5">City</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 justify-end">
                <button
                  onClick={() => navigate(`/landlord/rooms?property_id=${prop.property_id}`)}
                  disabled={prop.isOptimistic}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition disabled:opacity-50"
                >
                  <DoorOpen className="w-3.5 h-3.5" />
                  Rooms
                </button>
                <button
                  onClick={() => openEditModal(prop)}
                  disabled={prop.isOptimistic}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition disabled:opacity-50"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => navigate(`/landlord/announcements?property_id=${prop.property_id}`)}
                  disabled={prop.isOptimistic}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition disabled:opacity-50"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  Announce
                </button>
                <button
                  onClick={() => handleDelete(prop.property_id)}
                  disabled={prop.isOptimistic}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition ml-auto disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Add New Property' : 'Edit Property'}
      >
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3">
              {formError}
            </p>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
              Property / Hostel Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="property_name"
                value={form.property_name}
                onChange={handleInputChange}
                placeholder="e.g. Halleluyah Court"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
              Address
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleInputChange}
              rows={2}
              placeholder="e.g. No 5, SQI road, Ogbomoso"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                City
              </label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleInputChange}
                placeholder="Ogbomoso"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                Total Rooms
              </label>
              <input
                type="number"
                name="total_rooms"
                value={form.total_rooms}
                onChange={handleInputChange}
                min={0}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
          >
            {submitLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Property'
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Properties;
