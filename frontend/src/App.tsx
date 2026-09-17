import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './auth/AuthContext';
import { can } from './auth/permissions';
import { CatalogAdminPage } from './pages/CatalogAdminPage';
import { DashboardPage } from './pages/DashboardPage';
import { FloorPage } from './pages/FloorPage';
import { LoginPage } from './pages/LoginPage';
import { NoAccessPage } from './pages/NoAccessPage';

function HomeRoute() {
  const { user } = useAuth();
  if (can(user?.role, 'TAKE_ORDER') || can(user?.role, 'HANDLE_PAYMENT')) {
    return <FloorPage />;
  }
  if (can(user?.role, 'VIEW_DASHBOARD')) {
    return <DashboardPage />;
  }
  return <NoAccessPage />;
}

function CatalogRoute() {
  const { user } = useAuth();
  return can(user?.role, 'MANAGE_CATALOG') ? <CatalogAdminPage /> : <Navigate to="/" replace />;
}

export function App() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/" element={<HomeRoute />} />
        <Route path="/catalog" element={<CatalogRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
