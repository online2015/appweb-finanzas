import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();

  if (loading) return <div className="empty-state">Cargando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/sin-acceso" replace />;

  return <Outlet />;
}

export function AdminRoute() {
  const { profile } = useAuth();
  if (profile?.rol !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
