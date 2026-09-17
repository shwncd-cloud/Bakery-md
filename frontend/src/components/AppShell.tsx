import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { useOutboxStatus } from '../offline/useOutboxStatus';
import { OvenLogo } from './OvenLogo';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  MANAGER: 'Gerente',
  CASHIER: 'Cajero',
  WAITER: 'Mesero',
  COOK: 'Cocinero',
  PLATFORM_ADMIN: 'Admin. de plataforma',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { isOnline, pending } = useOutboxStatus();

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: 'var(--color-cream)',
    opacity: isActive ? 1 : 0.7,
    fontWeight: isActive ? 700 : 500,
    textDecoration: 'none',
    fontSize: '0.9rem',
  });

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar__brand">
          <OvenLogo size={28} />
          Hornillas
        </div>
        {(can(user?.role, 'VIEW_DASHBOARD') ||
          can(user?.role, 'TAKE_ORDER') ||
          can(user?.role, 'HANDLE_PAYMENT') ||
          can(user?.role, 'MANAGE_CATALOG') ||
          can(user?.role, 'ENTER_EXPENSE')) && (
          <nav style={{ display: 'flex', gap: 18 }}>
            {(can(user?.role, 'TAKE_ORDER') || can(user?.role, 'HANDLE_PAYMENT') || can(user?.role, 'VIEW_DASHBOARD')) && (
              <NavLink to="/" style={navLinkStyle} end>
                {can(user?.role, 'VIEW_DASHBOARD') ? 'Panel' : 'Mesas'}
              </NavLink>
            )}
            {/* Only shown when the floor isn't already "/" for this role
                (i.e. someone like the Owner who also has VIEW_DASHBOARD) -
                otherwise the link above already goes to the floor. */}
            {can(user?.role, 'VIEW_DASHBOARD') && (can(user?.role, 'TAKE_ORDER') || can(user?.role, 'HANDLE_PAYMENT')) && (
              <NavLink to="/floor" style={navLinkStyle}>
                Mesas
              </NavLink>
            )}
            {can(user?.role, 'MANAGE_CATALOG') && (
              <NavLink to="/catalog" style={navLinkStyle}>
                Catálogo
              </NavLink>
            )}
            {can(user?.role, 'ENTER_EXPENSE') && (
              <NavLink to="/expenses" style={navLinkStyle}>
                Gastos
              </NavLink>
            )}
          </nav>
        )}
        <div className="top-bar__user">
          {user && (
            <span>
              {user.fullName} · {ROLE_LABELS[user.role] ?? user.role}
            </span>
          )}
          <button className="btn btn-ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </div>
      {!isOnline && (
        <div className="offline-banner">
          Sin conexión — los pedidos y pagos se guardarán y enviarán automáticamente al recuperar señal.
        </div>
      )}
      {isOnline && pending > 0 && <div className="offline-banner">Sincronizando {pending} elemento(s) pendiente(s)...</div>}
      {children}
    </div>
  );
}
