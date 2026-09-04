import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { session, profile, loading, signInWithGoogle } = useAuth();

  if (!loading && session && profile) return <Navigate to="/" replace />;
  if (!loading && session && !profile) return <Navigate to="/sin-acceso" replace />;

  return (
    <div className="login-screen">
      <div className="login-box">
        <h1>Gastos Operativos</h1>
        <p>NETINNOVADORA</p>
        <button className="btn btn-primary" onClick={signInWithGoogle}>
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  );
}
