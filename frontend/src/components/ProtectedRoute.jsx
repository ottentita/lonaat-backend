import { Navigate, Outlet } from "react-router-dom";
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user } = useContext(AuthContext);
  // if no user in context, consider not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
