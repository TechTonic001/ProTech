// src/App.jsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Layouts
import LandlordLayout from './components/layout/LandlordLayout';
import TenantLayout from './components/layout/TenantLayout';
import AdminLayout from './components/layout/AdminLayout';

// Public pages
const Landing = lazy(() => import('./pages/public/Landing'));
const LandlordLogin = lazy(() => import('./pages/landlord/LandlordLogin'));
const LandlordRegister = lazy(() => import('./pages/landlord/LandlordRegister'));
const TenantLogin = lazy(() => import('./pages/tenant/TenantLogin'));
const TenantRegister = lazy(() => import('./pages/tenant/TenantRegister'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'));
const VerifyOTP = lazy(() => import('./pages/public/VerifyOTP'));
const ResetSuccess = lazy(() => import('./pages/public/ResetSuccess'));
const PaymentVerify = lazy(() => import('./pages/public/PaymentVerify'));

// Landlord pages
const LandlordDashboard = lazy(() => import('./pages/landlord/LandlordDashboard'));
const Properties = lazy(() => import('./pages/landlord/Properties'));
const Rooms = lazy(() => import('./pages/landlord/Rooms'));
const TenantApprovals = lazy(() => import('./pages/landlord/TenantApprovals'));
const LandlordPayments = lazy(() => import('./pages/landlord/LandlordPayments'));
const BankSetup = lazy(() => import('./pages/landlord/BankSetup'));
const Announcements = lazy(() => import('./pages/landlord/Announcements'));
const LandlordNotifications = lazy(() => import('./pages/landlord/LandlordNotifications'));
const LandlordProfile = lazy(() => import('./pages/landlord/LandlordProfile'));

// Tenant pages
const TenantDashboard = lazy(() => import('./pages/tenant/TenantDashboard'));
const PayRent = lazy(() => import('./pages/tenant/PayRent'));
const PaymentHistory = lazy(() => import('./pages/tenant/PaymentHistory'));
const TenantAnnouncements = lazy(() => import('./pages/tenant/TenantAnnouncements'));
const TenantNotifications = lazy(() => import('./pages/tenant/TenantNotifications'));
const TenantProfile = lazy(() => import('./pages/tenant/TenantProfile'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminLandlords = lazy(() => import('./pages/admin/AdminLandlords'));
const AdminTenants = lazy(() => import('./pages/admin/AdminTenants'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminProperties = lazy(() => import('./pages/admin/AdminProperties'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));

const AuthRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;
  if (user.role === 'landlord') return <Navigate to="/landlord/dashboard" replace />;
  if (user.role === 'tenant') return <Navigate to="/tenant/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/" replace />;
};

const App = () => {
  return (
    <div className="min-h-screen bg-background text-text-dark">
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landlord/login" element={<LandlordLogin />} />
          <Route path="/landlord/register" element={<LandlordRegister />} />
          <Route path="/tenant/login" element={<TenantLogin />} />
          <Route path="/tenant/register" element={<TenantRegister />} />
          <Route path="/admin/login" element={<AdminLogin />} />
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
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']} />}>
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
      </Suspense>
      <Toaster position="top-right" />
    </div>
  );
};

export default App;
