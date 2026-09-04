import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">NETINNOVADORA</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/gastos" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            Gastos
          </NavLink>
          {profile?.rol === 'admin' && (
            <NavLink to="/ajustes" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              Ajustes
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{profile?.nombre || profile?.email}</div>
          <button className="btn-link" onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
