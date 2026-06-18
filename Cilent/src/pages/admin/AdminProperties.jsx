// src/pages/admin/AdminProperties.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { 
  Building2, 
  User, 
  MapPin, 
  Calendar,
  ArrowLeft 
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminProperties = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getProperties();
      setProperties(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch platform properties list');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage size="lg" />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in p-2">
      {/* Back to dashboard */}
      <button 
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Platform Properties</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Audit log of physical hostels and rental complexes managed by ProTech</p>
        </div>
        <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-1.5 hidden sm:block">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{properties.length} Hostels</span>
        </div>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No Properties Registered"
          description="There are currently no hostel properties listed on the platform."
          icon={Building2}
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/admin/dashboard')}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4">Hostel Property</th>
                  <th className="p-4">Owner Landlord</th>
                  <th className="p-4">Hostel Address</th>
                  <th className="p-4">Creation Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                {properties.map((property) => (
                  <tr key={property.property_id} className="hover:bg-slate-50/30 transition">
                    {/* Property info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-650 flex items-center justify-center font-bold text-sm">
                          🏨
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm block">{property.property_name}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">ID: PROP-{property.property_id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Owner Landlord */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800 block">{property.landlord_name}</span>
                          <span className="text-[9px] text-slate-405 font-bold uppercase">@{property.landlord_username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Address details */}
                    <td className="p-4 text-slate-700 font-medium">
                      <div className="flex items-start gap-1.5 max-w-[280px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{property.property_address}</span>
                      </div>
                    </td>

                    {/* Registration Date */}
                    <td className="p-4 text-slate-450">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                        <span>{formatDate(property.created_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProperties;
