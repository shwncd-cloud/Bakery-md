import { FormEvent, ReactNode, useState } from 'react';
import { ApiError } from '../api/client';
import type { Product, TableSummary } from '../api/types';
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
  onAdd: (product: Product, quantity: number) => Promise<void>;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(product, quantity);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Agregar producto" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Producto</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - {formatCOP(p.unitPriceCents)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Cantidad</label>
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !productId}>
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
  onPay: (method: 'CASH' | 'TRANSFER') => Promise<void>;
}) {
  const [method, setMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
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
          <select value={method} onChange={(e) => setMethod(e.target.value as 'CASH' | 'TRANSFER')}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
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
