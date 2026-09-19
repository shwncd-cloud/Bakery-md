import { FormEvent, useEffect, useState } from 'react';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { CustomOrder, Product } from '../api/types';
import { formatCOP } from '../utils/money';

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Ocurrió un error. Intenta de nuevo.';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO');
}

export function CustomOrdersPage() {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [depositPesos, setDepositPesos] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [o, p] = await Promise.all([api.listCustomOrders(), api.listProducts()]);
      setOrders(o);
      setProducts(p);
      setProductId((current) => current || p[0]?.id || '');
    } catch {
      setError('No se pudieron cargar los pedidos especiales');
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
      await api.createCustomOrder({
        productId,
        quantity,
        description: description || undefined,
        // Same convention as product prices and expenses: enter plain
        // pesos, store as the smallest-unit integer the API expects.
        depositCents: Math.round(depositPesos * 100),
        deliveryDate: new Date(deliveryDate).toISOString(),
      });
      setQuantity(1);
      setDescription('');
      setDepositPesos(0);
      setDeliveryDate('');
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFulfilled(order: CustomOrder) {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, fulfilled: !o.fulfilled } : o)));
    try {
      await api.setCustomOrderFulfilled(order.id, !order.fulfilled);
    } catch {
      await load(); // revert to server truth if the update failed
    }
  }

  // Same grouping convention as the order-taking product picker.
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.category ?? 'Otros';
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const sortedGroupNames = Array.from(groups.keys()).sort((a, b) =>
    a === 'Otros' ? 1 : b === 'Otros' ? -1 : a.localeCompare(b),
  );

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>Pedidos especiales</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3>Nuevo pedido especial</h3>
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : '+ Agregar pedido'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-tan)' }}>
            {formError && <div className="error-banner">{formError}</div>}
            <div className="form-field">
              <label>Producto</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
                {sortedGroupNames.map((groupName) => (
                  <optgroup key={groupName} label={groupName}>
                    {groups.get(groupName)!.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {formatCOP(p.unitPriceCents)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Cantidad</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
            </div>
            <div className="form-field">
              <label>Descripción (sabor, mensaje, tamaño, etc. — opcional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Abono / depósito (pesos, opcional)</label>
              <input
                type="number"
                min={0}
                value={depositPesos || ''}
                onChange={(e) => setDepositPesos(Number(e.target.value))}
              />
            </div>
            <div className="form-field">
              <label>Fecha de entrega</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting || !productId || !deliveryDate}>
              {submitting ? 'Guardando...' : 'Guardar pedido'}
            </button>
          </form>
        )}

        {loading ? (
          <p>Cargando...</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">Sin pedidos especiales registrados todavía.</div>
        ) : (
          orders.map((o) => (
            <div className="list-row" key={o.id}>
              <div style={{ flex: 1 }}>
                <div>
                  {o.product.name} × {o.quantity}
                  {o.fulfilled && (
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> · Entregado</span>
                  )}
                </div>
                {o.description && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{o.description}</div>
                )}
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Pedido el {formatDate(o.createdAt)} · Entrega {formatDate(o.deliveryDate)}
                  {o.depositCents > 0 && <> · Abono {formatCOP(o.depositCents)}</>}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                <input type="checkbox" checked={o.fulfilled} onChange={() => toggleFulfilled(o)} />
                Entregado
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
