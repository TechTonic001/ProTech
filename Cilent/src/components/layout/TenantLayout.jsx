// src/components/layout/TenantLayout.jsx
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { leaseAPI } from '../../utils/api';
import { 
  Home, 
  CreditCard, 
  Receipt, 
  Megaphone, 
  Bell, 
  UserCircle, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

const TenantLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [lease, setLease] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchActiveLease();
  }, []);

  const fetchActiveLease = async () => {
    try {
      const res = await leaseAPI.getMine();
      const active = res.data.data?.find(l => l.lease_status === 'active');
      if (active) setLease(active);
    } catch (err) {
      console.error('Failed to load lease details:', err.message);
    }
  };

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'My Dashboard', path: 'dashboard', icon: Home }
      ]
    },
    {
      title: 'RENT',
      items: [
        { label: 'Pay Rent', path: 'pay', icon: CreditCard },
        { label: 'Payment History', path: 'history', icon: Receipt }
      ]
    },
    {
      title: 'PROPERTY',
      items: [
        { label: 'Announcements', path: 'announcements', icon: Megaphone },
        { label: 'Notifications', path: 'notifications', icon: Bell }
      ]
    },
    {
      title: 'ACCOUNT',
      items: [
        { label: 'My Profile', path: 'profile', icon: UserCircle }
      ]
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0F1C3F] to-[#080E25] text-white select-none">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold">
          🔑
        </div>
        <div>
          <div className="text-lg font-black tracking-tight">ProTech</div>
          <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Tenant Portal</div>
        </div>
        <button className="lg:hidden ml-auto p-1 text-white/60 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Welcome box */}
      <div className="mx-4 mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
        <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Welcome,</div>
        <div className="text-sm font-bold text-white mt-0.5 truncate">@{user?.username}</div>
        <div className="text-[10px] text-indigo-200 mt-1 truncate">
          {lease ? `Room ${lease.room_number} • ${lease.property_name}` : 'No active lease'}
        </div>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        {navSections.map((sec, idx) => (
          <div key={idx}>
            <div className="px-6 text-[10px] font-bold text-white/30 tracking-widest uppercase mb-1.5">
              {sec.title}
            </div>
            <div className="space-y-1">
              {sec.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl mx-2 text-sm font-medium transition duration-150 border-l-2
                    ${isActive 
                      ? 'bg-indigo-600/20 text-white border-indigo-400 font-semibold' 
                      : 'text-white/60 hover:bg-white/5 hover:text-white border-transparent'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer User Card */}
      <div className="p-4 border-t border-white/5 bg-white/3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
          {user?.full_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'T'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{user?.full_name}</div>
          <div className="text-xs text-white/40 font-semibold truncate">Tenant</div>
        </div>
        <button 
          onClick={logout} 
          title="Sign Out"
          className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden lg:block w-64 border-r border-slate-100">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
        <div className={`fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
      </div>

      {/* Right panel container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="fixed top-0 lg:left-64 right-0 height-[64px] h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 z-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-50" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-extrabold text-slate-900 leading-none">Tenant Portal</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5 hidden sm:block">Rent Tracking & Receipts</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer" onClick={() => navigate('notifications')}>
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </div>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-sm shadow-indigo-200">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-none truncate w-24">@{user?.username}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Approved</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 mt-16 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TenantLayout;
