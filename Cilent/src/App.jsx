// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Layouts
import LandlordLayout from './components/layout/LandlordLayout';
import TenantLayout from './components/layout/TenantLayout';
import AdminLayout from './components/layout/AdminLayout';

// Public pages
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import ForgotPassword from './pages/public/ForgotPassword';
import VerifyOTP from './pages/public/VerifyOTP';
import ResetSuccess from './pages/public/ResetSuccess';
import PaymentVerify from './pages/public/PaymentVerify';

// Landlord pages
import LandlordDashboard from './pages/landlord/LandlordDashboard';
import Properties from './pages/landlord/Properties';
import Rooms from './pages/landlord/Rooms';
import TenantApprovals from './pages/landlord/TenantApprovals';
import LandlordPayments from './pages/landlord/LandlordPayments';
import BankSetup from './pages/landlord/BankSetup';
import Announcements from './pages/landlord/Announcements';
import LandlordNotifications from './pages/landlord/LandlordNotifications';
import LandlordProfile from './pages/landlord/LandlordProfile';

// Tenant pages
import TenantDashboard from './pages/tenant/TenantDashboard';
import PayRent from './pages/tenant/PayRent';
import PaymentHistory from './pages/tenant/PaymentHistory';
import TenantAnnouncements from './pages/tenant/TenantAnnouncements';
import TenantNotifications from './pages/tenant/TenantNotifications';
import TenantProfile from './pages/tenant/TenantProfile';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLandlords from './pages/admin/AdminLandlords';
import AdminTenants from './pages/admin/AdminTenants';
import AdminPayments from './pages/admin/AdminPayments';
import AdminProperties from './pages/admin/AdminProperties';
import AdminProfile from './pages/admin/AdminProfile';

const AuthRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'landlord') return <Navigate to="/landlord/dashboard" replace />;
  if (user.role === 'tenant') return <Navigate to="/tenant/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <div className="min-h-screen bg-background text-text-dark">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-success" element={<ResetSuccess />} />
        <Route path="/payment/verify" element={<PaymentVerify />} />

        {/* Landlord Routes guarded & wrapped in LandlordLayout */}
        <Route path="/landlord" element={<ProtectedRoute allowedRoles={['landlord']} />}> 
          <Route element={<LandlordLayout />}>
            <Route path="dashboard" element={<LandlordDashboard />} />
            <Route path="properties" element={<Properties />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="approvals" element={<TenantApprovals />} />
            <Route path="payments" element={<LandlordPayments />} />
            <Route path="bank-setup" element={<BankSetup />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="notifications" element={<LandlordNotifications />} />
            <Route path="profile" element={<LandlordProfile />} />
          </Route>
        </Route>

        {/* Tenant Routes guarded & wrapped in TenantLayout */}
        <Route path="/tenant" element={<ProtectedRoute allowedRoles={['tenant']} />}> 
          <Route element={<TenantLayout />}>
            <Route path="dashboard" element={<TenantDashboard />} />
            <Route path="pay" element={<PayRent />} />
            <Route path="history" element={<PaymentHistory />} />
            <Route path="announcements" element={<TenantAnnouncements />} />
            <Route path="notifications" element={<TenantNotifications />} />
            <Route path="profile" element={<TenantProfile />} />
          </Route>
        </Route>

        {/* Admin Routes guarded & wrapped in AdminLayout */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}> 
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="landlords" element={<AdminLandlords />} />
            <Route path="tenants" element={<AdminTenants />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>
        </Route>

        <Route path="/dashboard" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
};

export default App;
