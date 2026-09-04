import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function SinAcceso() {
  const { session, profile, loading, signOut } = useAuth();

  if (!loading && profile) return <Navigate to="/" replace />;

  return (
    <div className="login-screen">
      <div className="login-box">
        <h1>Sin acceso</h1>
        <p>
          Tu cuenta ({session?.user.email}) no está habilitada para esta app. Pedile a un
          administrador que te dé de alta desde Ajustes → Usuarios.
        </p>
        <button className="btn" onClick={signOut}>
          Volver a intentar con otra cuenta
        </button>
      </div>
    </div>
  );
}
