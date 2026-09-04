import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { SinAcceso } from './pages/SinAcceso';
import { Dashboard } from './pages/Dashboard';
import { Gastos } from './pages/Gastos';
import { Ajustes } from './pages/Ajustes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sin-acceso" element={<SinAcceso />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/gastos" element={<Gastos />} />
              <Route element={<AdminRoute />}>
                <Route path="/ajustes" element={<Ajustes />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
