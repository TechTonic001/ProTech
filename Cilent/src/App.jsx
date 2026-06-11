// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import ForgotPassword from './pages/public/ForgotPassword';
import VerifyOTP from './pages/public/VerifyOTP';
import ResetSuccess from './pages/public/ResetSuccess';
import PaymentVerify from './pages/public/PaymentVerify';
import LandlordDashboard from './pages/landlord/LandlordDashboard';
import Properties from './pages/landlord/Properties';
import Rooms from './pages/landlord/Rooms';
import TenantApprovals from './pages/landlord/TenantApprovals';
import LandlordPayments from './pages/landlord/LandlordPayments';
import Announcements from './pages/landlord/Announcements';
import LandlordNotifications from './pages/landlord/LandlordNotifications';
import LandlordProfile from './pages/landlord/LandlordProfile';
import TenantDashboard from './pages/tenant/TenantDashboard';
import PayRent from './pages/tenant/PayRent';
import PaymentHistory from './pages/tenant/PaymentHistory';
import TenantAnnouncements from './pages/tenant/TenantAnnouncements';
import TenantNotifications from './pages/tenant/TenantNotifications';
import TenantProfile from './pages/tenant/TenantProfile';
import AdminDashboard from './pages/admin/AdminDashboard';

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

        <Route path="/landlord/*" element={<ProtectedRoute allowedRoles={['landlord']} />}> 
          <Route path="dashboard" element={<LandlordDashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="approvals" element={<TenantApprovals />} />
          <Route path="payments" element={<LandlordPayments />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="notifications" element={<LandlordNotifications />} />
          <Route path="profile" element={<LandlordProfile />} />
        </Route>

        <Route path="/tenant/*" element={<ProtectedRoute allowedRoles={['tenant']} />}> 
          <Route path="dashboard" element={<TenantDashboard />} />
          <Route path="pay" element={<PayRent />} />
          <Route path="history" element={<PaymentHistory />} />
          <Route path="announcements" element={<TenantAnnouncements />} />
          <Route path="notifications" element={<TenantNotifications />} />
          <Route path="profile" element={<TenantProfile />} />
        </Route>

        <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']} />}> 
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>

        <Route path="/dashboard" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
};

export default App;
