// src/components/layout/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    } else if (location.pathname.startsWith('/tenant')) {
      return <Navigate to="/tenant/login" state={{ from: location }} replace />;
    } else {
      return <Navigate to="/landlord/login" state={{ from: location }} replace />;
    }
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'landlord') return <Navigate to="/landlord/dashboard" replace />;
    if (user.role === 'tenant') return <Navigate to="/tenant/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
