import { FormEvent, useEffect, useState } from 'react';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { Expense } from '../api/types';
import { formatCOP } from '../utils/money';

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Ocurrió un error. Intenta de nuevo.';
}

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState('');
  const [amountPesos, setAmountPesos] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setExpenses(await api.listExpenses());
    } catch {
      setError('No se pudieron cargar los gastos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      // Same convention as product prices: enter plain pesos, store as
      // the smallest-unit integer the API expects.
      await api.createExpense(category, Math.round(amountPesos * 100), description || undefined);
      setCategory('');
      setAmountPesos(0);
      setDescription('');
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>Gastos</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3>Registrar gasto</h3>
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : '+ Agregar gasto'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-tan)' }}>
            {formError && <div className="error-banner">{formError}</div>}
            <div className="form-field">
              <label>Categoría</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Harina, servicios, mantenimiento..."
                required
              />
            </div>
            <div className="form-field">
              <label>Monto (pesos)</label>
              <input
                type="number"
                min={1}
                value={amountPesos || ''}
                onChange={(e) => setAmountPesos(Number(e.target.value))}
                required
              />
            </div>
            <div className="form-field">
              <label>Descripción (opcional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting || !category || amountPesos <= 0}>
              {submitting ? 'Guardando...' : 'Guardar gasto'}
            </button>
          </form>
        )}

        {loading ? (
          <p>Cargando...</p>
        ) : expenses.length === 0 ? (
          <div className="empty-state">Sin gastos registrados todavía.</div>
        ) : (
          expenses.map((e) => (
            <div className="list-row" key={e.id}>
              <div style={{ flex: 1 }}>
                <div>{e.category}</div>
                {e.description && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{e.description}</div>
                )}
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                {new Date(e.createdAt).toLocaleDateString('es-CO')}
              </span>
              <strong>{formatCOP(e.amountCents)}</strong>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
