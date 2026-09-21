import { useEffect, useState } from 'react';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type {
  ExpenseBreakdownRow,
  Payment,
  ProductBreakdownRow,
  ReportPeriod,
  SalesSummary,
  WaiterPerformanceRow,
} from '../api/types';
import { can } from '../auth/permissions';
import { useAuth } from '../auth/AuthContext';
import { formatCOP } from '../utils/money';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

// Local calendar date (YYYY-MM-DD) in the browser's own timezone - not
// toISOString(), which is UTC and can land on the wrong day near midnight.
function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Ocurrió un error. Intenta de nuevo.';
}

export function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>('day');
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [products, setProducts] = useState<ProductBreakdownRow[]>([]);
  const [waiters, setWaiters] = useState<WaiterPerformanceRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseBreakdownRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.getSalesSummary(period, date),
      api.getProductBreakdown(period, date),
      api.getWaiterPerformance(period, date),
      api.getExpenseBreakdown(period, date),
      api.listPayments(period, date),
    ])
      .then(([s, p, w, e, pay]) => {
        setSummary(s);
        setProducts(p);
        setWaiters(w);
        setExpenses(e);
        setPayments(pay);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [period, date]);

  async function handleTriggerSummary() {
    setSummaryMessage(null);
    try {
      const result = await api.triggerMonthlySummary();
      setSummaryMessage(
        result.sent > 0
          ? `Resumen enviado a ${result.sent} de ${result.totalRecipients} destinatario(s).`
          : 'No hay destinatarios con correo configurado.',
      );
    } catch {
      setSummaryMessage('No se pudo enviar el resumen.');
    }
  }

  async function handleDeletePayment(payment: Payment) {
    if (!confirm('¿Eliminar esta venta? Los productos volverán a quedar sin pagar.')) return;
    setDeleteError(null);
    try {
      await api.deletePayment(payment.id);
      load();
    } catch (err) {
      setDeleteError(errorMessage(err));
    }
  }

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>Panel del propietario</h2>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label>Período</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {loading || !summary ? (
        <p>Cargando...</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-tile">
              <div className="stat-tile__label">Ventas totales</div>
              <div className="stat-tile__value">{formatCOP(summary.totalSalesCents)}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__label">Gastos totales</div>
              <div className="stat-tile__value">{formatCOP(summary.totalExpensesCents)}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__label">Utilidad</div>
              <div className="stat-tile__value" style={{ color: summary.netCents < 0 ? 'var(--color-danger)' : undefined }}>
                {formatCOP(summary.netCents)}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 10 }}>Productos vendidos</h3>
            {products.length === 0 ? (
              <div className="empty-state">Sin ventas en este período.</div>
            ) : (
              products.map((p) => (
                <div className="list-row" key={p.productId}>
                  <span>{p.name}</span>
                  <span>{p.unitsSold} unidades</span>
                  <strong>{formatCOP(p.revenueCents)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 10 }}>Desempeño del personal</h3>
            {waiters.length === 0 ? (
              <div className="empty-state">Sin ventas en este período.</div>
            ) : (
              waiters.map((w) => (
                <div className="list-row" key={w.userId}>
                  <span>{w.fullName}</span>
                  <span>{w.itemsSold} productos</span>
                  <strong>{formatCOP(w.revenueCents)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 10 }}>Gastos por proveedor</h3>
            {expenses.length === 0 ? (
              <div className="empty-state">Sin gastos en este período.</div>
            ) : (
              expenses.map((e) => (
                <div className="list-row" key={e.provider}>
                  <span>{e.provider}</span>
                  <strong>{formatCOP(e.totalCents)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 10 }}>Ventas registradas</h3>
            {deleteError && <div className="error-banner">{deleteError}</div>}
            {payments.length === 0 ? (
              <div className="empty-state">Sin ventas registradas en este período.</div>
            ) : (
              payments.map((pay) => (
                <div className="list-row" key={pay.id}>
                  <div style={{ flex: 1 }}>
                    <div>
                      {pay.orderItems.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {new Date(pay.createdAt).toLocaleString('es-CO')} · {pay.method}
                    </div>
                  </div>
                  <strong>{formatCOP(pay.amountCents)}</strong>
                  {can(user?.role, 'DELETE_PAYMENT') && (
                    <button className="btn btn-danger" onClick={() => handleDeletePayment(pay)}>
                      Eliminar
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <button className="btn btn-secondary" onClick={handleTriggerSummary}>
            Enviar resumen mensual ahora
          </button>
          {summaryMessage && <p style={{ marginTop: 10, color: 'var(--color-text-muted)' }}>{summaryMessage}</p>}
        </>
      )}
    </div>
  );
}
