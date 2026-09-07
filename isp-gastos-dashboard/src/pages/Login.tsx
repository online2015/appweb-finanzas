import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function Login() {
  const { session, profile, loading, signInWithGoogle } = useAuth();

  if (!loading && session && profile) return <Navigate to="/" replace />;
  if (!loading && session && !profile) return <Navigate to="/sin-acceso" replace />;

  return (
    <div className="login-shell">
      <div className="login-brand-panel">
        <div className="login-brand-mark">NETINNOVADORA</div>
        <div>
          <p className="login-brand-headline">Gastos operativos, en un solo lugar.</p>
          <p className="login-brand-sub">Cargá, marcá como pagado y seguí la evolución mensual del gasto de la cooperativa.</p>
        </div>
        <div className="login-brand-glow" aria-hidden="true" />
      </div>

      <div className="login-form-panel">
        <div className="login-form-inner">
          <span className="login-eyebrow">Acceso al equipo</span>
          <h1 className="login-title">Iniciar sesión</h1>
          <p className="login-subtitle">Usá tu cuenta de Google del equipo para entrar.</p>
          <button className="btn-google" onClick={signInWithGoogle}>
            <GoogleIcon />
            Continuar con Google
          </button>
          <p className="login-footnote">Acceso restringido — solo cuentas dadas de alta por un administrador.</p>
        </div>
      </div>
    </div>
  );
}
