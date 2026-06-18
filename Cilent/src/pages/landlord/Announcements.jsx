// src/pages/landlord/Announcements.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { propertyAPI, announcementAPI } from '../../utils/api';
import { formatRelativeTime } from '../../utils/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { 
  Megaphone, 
  Mail, 
  Smartphone, 
  Send, 
  Trash2, 
  Building,
  Loader2,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const Announcements = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialPropertyId = queryParams.get('property_id');

  const [properties, setProperties] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    property_id: initialPropertyId || 'all',
    title: '',
    message_body: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [propRes, annRes] = await Promise.all([
        propertyAPI.getAll(),
        announcementAPI.getAll(),
      ]);

      setProperties(propRes.data.data || []);
      setAnnouncements(annRes.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load announcements data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message_body) {
      toast.error('Please fill in the title and message body.');
      return;
    }

    setSubmitLoading(true);
    try {
      // If property_id is 'all', how does backend handle it?
      // In the backend announcement.controller.js:
      // if (!property_id || !title || !message_body) { return res.status(400); }
      // So 'property_id' MUST be a specific ID on the backend!
      // If 'all' is chosen, we must iterate or specify the selected property.
      // Wait! Let's check backend createAnnouncement:
      // It queries properties where property_id = ? AND landlord_id = ?
      // It inserts one announcement.
      // So if 'all' is selected, we can post an announcement for each property!
      // This is extremely robust and ensures compatibility with the backend check!
      if (form.property_id === 'all') {
        if (properties.length === 0) {
          toast.error('No properties available to announce to.');
          setSubmitLoading(false);
          return;
        }
        await Promise.all(
          properties.map(p => 
            announcementAPI.create({
              property_id: p.property_id,
              title: form.title,
              message_body: form.message_body
            })
          )
        );
      } else {
        await announcementAPI.create({
          property_id: Number(form.property_id),
          title: form.title,
          message_body: form.message_body
        });
      }

      toast.success('Announcements sent to all active tenants!');
      setForm(prev => ({ ...prev, title: '', message_body: '' }));
      
      // Reload history
      const annRes = await announcementAPI.getAll();
      setAnnouncements(annRes.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to send announcement');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement history?')) {
      return;
    }

    try {
      await announcementAPI.delete(id);
      toast.success('Announcement history deleted');
      // Reload history
      const annRes = await announcementAPI.getAll();
      setAnnouncements(annRes.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to delete announcement');
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Left Column: Compose Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between shadow-xs">
        <form onSubmit={handleSend} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-5 h-5 text-indigo-600 animate-pulse" />
            <h3 className="text-base font-black text-slate-900">New Announcement</h3>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
              Target Property
            </label>
            <select
              name="property_id"
              value={form.property_id}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
            >
              <option value="all">📢 All Registered Hostels</option>
              {properties.map(p => (
                <option key={p.property_id} value={p.property_id}>
                  🏢 {p.property_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
              Announcement Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              placeholder="e.g. Scheduled Water Maintenance"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
              Message Body
            </label>
            <textarea
              name="message_body"
              value={form.message_body}
              onChange={handleInputChange}
              rows={6}
              placeholder="Provide information about water cutoff, landlord inspects, security changes..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition resize-none"
            />
            <div className="text-right text-[10px] text-slate-400 font-bold mt-1.5 uppercase select-none">
              {form.message_body.length} characters
            </div>
          </div>

          {/* Delivery pre-check indicators */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 font-semibold text-slate-600 text-xs select-none">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Delivery Channels
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <span>Email notification to every tenant's inbox</span>
              <span className="w-2 h-2 rounded-full bg-green-500 ml-auto" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span>PWA push notification directly to mobile screens</span>
              <span className="w-2 h-2 rounded-full bg-green-500 ml-auto" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
          >
            {submitLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Broadcasting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Broadcast to Tenants
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: History Panel */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          Previous Broadcasts
        </h3>

        {announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No history found"
            message="You haven't issued any announcements yet. Create one to inform your tenants."
          />
        ) : (
          <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            {announcements.map((ann) => (
              <div
                key={ann.announcement_id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:border-indigo-200 transition duration-150 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-sm font-black text-slate-900 leading-tight">
                      {ann.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">
                      {formatRelativeTime(ann.created_at)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line mt-2 font-medium">
                    {ann.message_body}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Badge status="info">
                    {ann.property_name || 'Hostel'}
                  </Badge>
                  
                  <button
                    onClick={() => handleDelete(ann.announcement_id)}
                    className="p-1 text-slate-300 hover:text-red-500 transition"
                    title="Delete history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Announcements;
