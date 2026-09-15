import { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
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

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar__brand">
          <OvenLogo size={28} />
          Hornillas
        </div>
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
