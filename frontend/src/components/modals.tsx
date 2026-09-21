import { FormEvent, ReactNode, useState } from 'react';
import { ApiError } from '../api/client';
import type { PaymentMethod, Product, TableSummary } from '../api/types';
import { formatCOP } from '../utils/money';

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Ocurrió un error. Intenta de nuevo.';
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function AddItemModal({
  products,
  onClose,
  onAdd,
}: {
  products: Product[];
  onClose: () => void;
  onAdd: (product: Product, quantity: number, note?: string) => Promise<void>;
}) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(selectedProduct, quantity, note || undefined);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Search-as-you-type instead of a long category-grouped dropdown - real
  // usage showed hunting through the list was slowing down order-taking.
  // Matches on any part of the name so "pan" finds "Pan francés" too.
  const normalizedSearch = search.trim().toLowerCase();
  const matches = normalizedSearch
    ? products.filter((p) => p.name.toLowerCase().includes(normalizedSearch)).slice(0, 8)
    : [];

  return (
    <ModalShell title="Agregar producto" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Producto</label>
          {selectedProduct ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                {selectedProduct.name} - {formatCOP(selectedProduct.unitPriceCents)}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedProduct(null);
                  setSearch('');
                }}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Escribe el nombre del producto..."
                autoFocus
              />
              {normalizedSearch && (
                <div className="search-results">
                  {matches.length === 0 ? (
                    <div className="empty-state">Sin resultados.</div>
                  ) : (
                    matches.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        className="search-result-row"
                        onClick={() => {
                          setSelectedProduct(p);
                          setSearch('');
                        }}
                      >
                        <span>{p.name}</span>
                        <span>{formatCOP(p.unitPriceCents)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div className="form-field">
          <label>Cantidad</label>
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
        </div>
        <div className="form-field">
          <label>Nota (opcional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sin cebolla, para llevar, ..." />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !selectedProduct}>
            {submitting ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function DiscountModal({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (type: 'PERCENT' | 'FIXED', value: number, reason: string) => Promise<void>;
}) {
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState(10);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onApply(type, value, reason);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Aplicar descuento" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as 'PERCENT' | 'FIXED')}>
            <option value="PERCENT">Porcentaje (%)</option>
            <option value="FIXED">Monto fijo (pesos)</option>
          </select>
        </div>
        <div className="form-field">
          <label>{type === 'PERCENT' ? 'Porcentaje' : 'Pesos'}</label>
          <input type="number" min={1} value={value} onChange={(e) => setValue(Number(e.target.value))} required />
        </div>
        <div className="form-field">
          <label>Motivo (obligatorio)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} required />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || reason.trim().length < 3}>
            {submitting ? 'Aplicando...' : 'Aplicar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function PaymentModal({
  totalCents,
  onClose,
  onPay,
}: {
  totalCents: number;
  onClose: () => void;
  onPay: (method: PaymentMethod) => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onPay(method);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Cobrar" onClose={onClose}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 14 }}>{formatCOP(totalCents)}</p>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Método de pago</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="CASH">Efectivo</option>
            <option value="NEQUI">Nequi</option>
            <option value="DAVIPLATA">Daviplata</option>
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Cobrando...' : 'Confirmar cobro'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function MergeModal({
  tables,
  currentTableId,
  onClose,
  onMerge,
}: {
  tables: TableSummary[];
  currentTableId: string;
  onClose: () => void;
  onMerge: (targetTableId: string) => Promise<void>;
}) {
  const options = tables.filter((t) => t.id !== currentTableId);
  const [targetId, setTargetId] = useState(options[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!targetId) return;
    setSubmitting(true);
    setError(null);
    try {
      await onMerge(targetId);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Unir con otra mesa" onClose={onClose}>
      <p style={{ marginBottom: 12, color: 'var(--color-text-muted)' }}>
        Los pedidos abiertos de esta mesa se moverán a la mesa que elijas.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Mesa destino</label>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !targetId}>
            {submitting ? 'Uniendo...' : 'Unir mesas'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
