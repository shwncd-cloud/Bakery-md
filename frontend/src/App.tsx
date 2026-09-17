import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './auth/AuthContext';
import { can } from './auth/permissions';
import { CatalogAdminPage } from './pages/CatalogAdminPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { FloorPage } from './pages/FloorPage';
import { LoginPage } from './pages/LoginPage';
import { NoAccessPage } from './pages/NoAccessPage';

function HomeRoute() {
  const { user } = useAuth();
  // Dashboard takes priority when both apply (e.g. Owner, who can also
  // help on the floor) - the dashboard is still "home" for that role,
  // the floor is reached via the separate /floor route/nav link.
  if (can(user?.role, 'VIEW_DASHBOARD')) {
    return <DashboardPage />;
  }
  if (can(user?.role, 'TAKE_ORDER') || can(user?.role, 'HANDLE_PAYMENT')) {
    return <FloorPage />;
  }
  return <NoAccessPage />;
}

function FloorRoute() {
  const { user } = useAuth();
  return can(user?.role, 'TAKE_ORDER') || can(user?.role, 'HANDLE_PAYMENT') ? (
    <FloorPage />
  ) : (
    <Navigate to="/" replace />
  );
}

function CatalogRoute() {
  const { user } = useAuth();
  return can(user?.role, 'MANAGE_CATALOG') ? <CatalogAdminPage /> : <Navigate to="/" replace />;
}

function ExpensesRoute() {
  const { user } = useAuth();
  return can(user?.role, 'ENTER_EXPENSE') ? <ExpensesPage /> : <Navigate to="/" replace />;
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
        <Route path="/floor" element={<FloorRoute />} />
        <Route path="/catalog" element={<CatalogRoute />} />
        <Route path="/expenses" element={<ExpensesRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
