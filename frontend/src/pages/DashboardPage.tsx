import { useEffect, useState } from 'react';
import * as api from '../api/client';
import type {
  ExpenseBreakdownRow,
  ProductBreakdownRow,
  ReportPeriod,
  SalesSummary,
  WaiterPerformanceRow,
} from '../api/types';
import { formatCOP } from '../utils/money';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

export function DashboardPage() {
  const [period, setPeriod] = useState<ReportPeriod>('day');
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [products, setProducts] = useState<ProductBreakdownRow[]>([]);
  const [waiters, setWaiters] = useState<WaiterPerformanceRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getSalesSummary(period),
      api.getProductBreakdown(period),
      api.getWaiterPerformance(period),
      api.getExpenseBreakdown(period),
    ])
      .then(([s, p, w, e]) => {
        setSummary(s);
        setProducts(p);
        setWaiters(w);
        setExpenses(e);
      })
      .finally(() => setLoading(false));
  }, [period]);

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

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>Panel del propietario</h2>

      <div className="nav-tabs">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            className={`nav-tab ${period === p.value ? 'nav-tab--active' : ''}`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
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
            <h3 style={{ marginBottom: 10 }}>Gastos por categoría</h3>
            {expenses.length === 0 ? (
              <div className="empty-state">Sin gastos en este período.</div>
            ) : (
              expenses.map((e) => (
                <div className="list-row" key={e.category}>
                  <span>{e.category}</span>
                  <strong>{formatCOP(e.totalCents)}</strong>
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
