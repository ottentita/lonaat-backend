import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, isAdmin } from '@/utils/auth';

const AdminRoute = () => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
