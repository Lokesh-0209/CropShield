import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRole, children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    const homePath = user?.role === 'farmer' ? '/farmer/home' : '/officer/dashboard';
    return <Navigate to={homePath} replace />;
  }

  return children ? children : <Outlet />;
}
