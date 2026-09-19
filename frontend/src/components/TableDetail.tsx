import { useEffect, useState } from 'react';
import * as api from '../api/client';
import { OptimisticOrderItem } from '../api/client';
import type { PaymentSelection } from '../api/client';
import type { KitchenTicket, OrderItem, PaymentMethod, Product, TableSummary } from '../api/types';
import { can } from '../auth/permissions';
import { useAuth } from '../auth/AuthContext';
import { formatCOP } from '../utils/money';
import { AddItemModal, DiscountModal, MergeModal, PaymentModal } from './modals';

const STATUS_LABELS: Record<string, string> = {
  ORDERED: 'Pedido',
  SENT_TO_KITCHEN: 'En cocina',
  SERVED: 'Servido',
  PAID: 'Pagado',
  CANCELED: 'Cancelado',
};

function lineTotalCents(item: OrderItem): number {
  const base = item.unitPriceCents * item.quantity;
  const discountOff = (item.discounts ?? []).reduce((total, d) => {
    const off = d.type === 'PERCENT' ? Math.round((base * d.value) / 100) : d.value;
    return total + off;
  }, 0);
  return Math.max(0, base - discountOff);
}

export function TableDetail({
  tableId,
  tables,
  onBack,
}: {
  tableId: string;
  tables: TableSummary[];
  onBack: () => void;
}) {
  const { user } = useAuth();
  const table = tables.find((t) => t.id === tableId);
  const [items, setItems] = useState<OptimisticOrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // orderItemId -> how many of its units to pay for. Defaults to the full
  // quantity when selected, but can be reduced so a cashier can collect
  // for part of a multi-unit line and leave the rest open for later.
  const [selectedForPayment, setSelectedForPayment] = useState<Map<string, number>>(new Map());
  const [ticket, setTicket] = useState<KitchenTicket | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [discountTarget, setDiscountTarget] = useState<OrderItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  async function loadItems() {
    setError(null);
    try {
      const list = await api.getTableItems(tableId);
      setItems(list);
    } catch {
      setError('No se pudo cargar la cuenta de la mesa');
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([api.listProducts(), api.getTableItems(tableId)])
      .then(([productList, itemList]) => {
        setProducts(productList.filter((p) => p.active));
        setItems(itemList);
      })
      .catch(() => setError('No se pudo cargar la mesa'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  if (!table) return null;

  const eligibleForKitchen = items.some((i) => i.status === 'ORDERED' && i.product.requiresKitchenTicket);
  const selectedEntries: PaymentSelection[] = items
    .filter((i) => selectedForPayment.has(i.id))
    .map((item) => ({ item, quantity: selectedForPayment.get(item.id)! }));
  const selectedTotal = selectedEntries.reduce(
    (sum, { item, quantity }) => sum + (quantity === item.quantity ? lineTotalCents(item) : item.unitPriceCents * quantity),
    0,
  );

  async function handleAdd(product: Product, quantity: number, note?: string) {
    if (!user) return;
    const created = await api.createOrderItem(tableId, product, quantity, user.id, note);
    setItems((prev) => [...prev, created]);
  }

  async function handleQuantityChange(item: OrderItem, quantity: number) {
    if (quantity < 1) return;
    const updated = await api.updateOrderItem(item.id, quantity);
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  async function handleCancel(item: OrderItem) {
    await api.cancelOrderItem(item.id);
    await loadItems();
  }

  async function handleSendToKitchen() {
    setError(null);
    try {
      const result = await api.sendToKitchen(tableId);
      setTicket(result);
      await loadItems();
    } catch {
      setError('No había productos listos para enviar a cocina');
    }
  }

  async function handleReprint() {
    if (!ticket) return;
    const result = await api.reprintTicket(ticket.id);
    setTicket(result);
  }

  async function handleApplyDiscount(type: 'PERCENT' | 'FIXED', value: number, reason: string) {
    if (!discountTarget) return;
    await api.applyDiscount(discountTarget.id, type, value, reason);
    await loadItems();
  }

  function toggleSelection(item: OrderItem) {
    setSelectedForPayment((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item.quantity); // default: pay the full line, same as before
      return next;
    });
  }

  function setSelectedQuantity(item: OrderItem, quantity: number) {
    setSelectedForPayment((prev) => {
      const next = new Map(prev);
      next.set(item.id, Math.min(item.quantity, Math.max(1, quantity)));
      return next;
    });
  }

  async function handlePay(method: PaymentMethod) {
    await api.createPayment(selectedEntries, method);
    setSelectedForPayment(new Map());
    await loadItems();
  }

  async function handleMerge(targetTableId: string) {
    await api.mergeTable(tableId, targetTableId);
    onBack();
  }

  const payableStatuses = new Set(['ORDERED', 'SENT_TO_KITCHEN', 'SERVED']);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Mesas
        </button>
        <h2>{table.label}</h2>
        <div />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        {loading ? (
          <p>Cargando...</p>
        ) : items.length === 0 ? (
          <div className="empty-state">Sin pedidos todavía.</div>
        ) : (
          items.map((item) => (
            <div className="list-row" key={item.id}>
              {can(user?.role, 'HANDLE_PAYMENT') && payableStatuses.has(item.status) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedForPayment.has(item.id)}
                    onChange={() => toggleSelection(item)}
                  />
                  {selectedForPayment.has(item.id) && item.quantity > 1 && !item.discounts?.length && (
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={selectedForPayment.get(item.id)}
                      onChange={(e) => setSelectedQuantity(item, Number(e.target.value))}
                      title={`¿Cuántas de las ${item.quantity} unidades vas a cobrar?`}
                      style={{ width: 52 }}
                    />
                  )}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div>
                  {item.quantity}x {item.product.name}
                  {item.pendingSync && <span className="badge" style={{ marginLeft: 8 }}>pendiente de enviar</span>}
                </div>
                {item.note && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Nota: {item.note}</div>
                )}
                {selectedForPayment.has(item.id) && selectedForPayment.get(item.id)! < item.quantity && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Cobrando {selectedForPayment.get(item.id)} de {item.quantity}
                  </div>
                )}
                {item.discounts && item.discounts.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Descuento: {item.discounts[0].reason}
                  </div>
                )}
              </div>
              <span className={`badge badge-status-${item.status}`}>{STATUS_LABELS[item.status]}</span>
              <strong>{formatCOP(lineTotalCents(item))}</strong>
              {item.status === 'ORDERED' && can(user?.role, 'EDIT_PRE_KITCHEN_ITEM') && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-secondary" onClick={() => handleQuantityChange(item, item.quantity + 1)}>
                    +
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleQuantityChange(item, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <button className="btn btn-danger" onClick={() => handleCancel(item)}>
                    Cancelar
                  </button>
                </div>
              )}
              {item.status !== 'PAID' && item.status !== 'CANCELED' && can(user?.role, 'APPLY_DISCOUNT') && !item.discounts?.length && (
                <button className="btn btn-secondary" onClick={() => setDiscountTarget(item)}>
                  Descuento
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {ticket && (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Ticket de cocina:</strong> {ticket.printedAt ? 'Impreso ✓' : 'Enviado, esperando impresión...'}
          <button className="btn btn-secondary" style={{ marginLeft: 10 }} onClick={handleReprint}>
            Reenviar a la impresora
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {can(user?.role, 'TAKE_ORDER') && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} disabled={products.length === 0}>
            + Agregar producto
          </button>
        )}
        {can(user?.role, 'SEND_TO_KITCHEN') && (
          <button className="btn btn-secondary" onClick={handleSendToKitchen} disabled={!eligibleForKitchen}>
            Enviar a cocina
          </button>
        )}
        {can(user?.role, 'TAKE_ORDER') && (
          <button className="btn btn-secondary" onClick={() => setShowMergeModal(true)}>
            Unir con otra mesa
          </button>
        )}
        {can(user?.role, 'HANDLE_PAYMENT') && selectedForPayment.size > 0 && (
          <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
            Cobrar seleccionados ({formatCOP(selectedTotal)})
          </button>
        )}
      </div>

      {showAddModal && <AddItemModal products={products} onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
      {discountTarget && (
        <DiscountModal onClose={() => setDiscountTarget(null)} onApply={handleApplyDiscount} />
      )}
      {showPaymentModal && (
        <PaymentModal totalCents={selectedTotal} onClose={() => setShowPaymentModal(false)} onPay={handlePay} />
      )}
      {showMergeModal && (
        <MergeModal
          tables={tables}
          currentTableId={tableId}
          onClose={() => setShowMergeModal(false)}
          onMerge={handleMerge}
        />
      )}
    </div>
  );
}
