// src/pages/tenant/TenantAnnouncements.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { announcementAPI } from '../../utils/api';
import { formatRelativeTime } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { Megaphone, Calendar, Building, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const TenantAnnouncements = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await announcementAPI.getAll();
      setAnnouncements(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage size="lg" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-2">
      {/* Header back navigation */}
      <button 
        onClick={() => navigate('/tenant/dashboard')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Title */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Hostel Announcements</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Official broadcasts and updates from your landlord</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-1.5 hidden sm:block">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{announcements.length} Notices</span>
        </div>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          title="No Announcements"
          description="Your landlord hasn't posted any announcements yet. Any official updates about your property will appear here."
          icon={Megaphone}
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/tenant/dashboard')}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div 
              key={ann.announcement_id} 
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs hover:shadow-md transition duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left content details */}
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {ann.property_name}
                    </span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-350" />
                      {formatRelativeTime(ann.created_at)}
                    </span>
                  </div>

                  <h2 className="text-base lg:text-lg font-extrabold text-slate-900 leading-tight">
                    {ann.title}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                    {ann.message_body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantAnnouncements;
