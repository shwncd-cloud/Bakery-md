import { FormEvent, useEffect, useState } from 'react';
import * as api from '../api/client';
import { ApiError, CreateProductInput } from '../api/client';
import type { Product, TableSummary } from '../api/types';
import { formatCOP } from '../utils/money';

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Ocurrió un error. Intenta de nuevo.';
}

export function CatalogAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [productList, tableList] = await Promise.all([api.listProducts(), api.listTables()]);
      setProducts(productList);
      setTables(tableList);
    } catch {
      setError('No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDeactivate(productId: string) {
    await api.deactivateProduct(productId);
    await load();
  }

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>Catálogo</h2>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <ProductsSection products={products} onDeactivate={handleDeactivate} onChanged={load} />
          <TablesSection tables={tables} onChanged={load} />
        </>
      )}
    </div>
  );
}

/// Shared by both "add a product" and "edit a product" - same fields
/// either way, just different initial values and submit label.
function ProductForm({
  initial,
  existingCategories,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial?: CreateProductInput;
  existingCategories: string[];
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (input: CreateProductInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  // The API stores unitPriceCents to avoid float math; COP doesn't
  // practically use centavos, so "pesos entered x 100" round-trips
  // correctly through formatCOP (which divides by 100) everywhere else.
  const [pricePesos, setPricePesos] = useState<number>(initial ? initial.unitPriceCents / 100 : 0);
  const [requiresKitchenTicket, setRequiresKitchenTicket] = useState(initial?.requiresKitchenTicket ?? false);
  const [trackQuantitySold, setTrackQuantitySold] = useState(initial?.trackQuantitySold ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({
        name,
        category: category.trim() || undefined,
        unitPriceCents: Math.round(pricePesos * 100),
        requiresKitchenTicket,
        trackQuantitySold,
      });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-tan)' }}>
      {formError && <div className="error-banner">{formError}</div>}
      <div className="form-field">
        <label>Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="form-field">
        <label>Categoría (opcional)</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          list="category-options"
          placeholder="Panadería, Desayunos, Bebidas..."
        />
        <datalist id="category-options">
          {existingCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="form-field">
        <label>Precio (pesos)</label>
        <input
          type="number"
          min={1}
          value={pricePesos || ''}
          onChange={(e) => setPricePesos(Number(e.target.value))}
          required
        />
      </div>
      <div className="form-field">
        <label>
          <input
            type="checkbox"
            checked={requiresKitchenTicket}
            onChange={(e) => setRequiresKitchenTicket(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Requiere preparación en cocina (se envía ticket al cocinero)
        </label>
      </div>
      <div className="form-field">
        <label>
          <input
            type="checkbox"
            checked={trackQuantitySold}
            onChange={(e) => setTrackQuantitySold(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Registrar cantidad vendida (para control de inventario)
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting || !name || pricePesos <= 0}>
          {submitting ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ProductsSection({
  products,
  onDeactivate,
  onChanged,
}: {
  products: Product[];
  onDeactivate: (id: string) => Promise<void>;
  onChanged: () => Promise<void>;
}) {
  // 'none' | 'create' | a product id currently being edited
  const [activeForm, setActiveForm] = useState<string>('none');
  const existingCategories = Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c)));

  async function handleCreate(input: CreateProductInput) {
    await api.createProduct(input);
    setActiveForm('none');
    await onChanged();
  }

  async function handleUpdate(id: string, input: CreateProductInput) {
    await api.updateProduct(id, input);
    setActiveForm('none');
    await onChanged();
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3>Productos</h3>
        <button className="btn btn-primary" onClick={() => setActiveForm(activeForm === 'create' ? 'none' : 'create')}>
          {activeForm === 'create' ? 'Cancelar' : '+ Agregar producto'}
        </button>
      </div>

      {activeForm === 'create' && (
        <ProductForm
          existingCategories={existingCategories}
          submitLabel="Guardar producto"
          onCancel={() => setActiveForm('none')}
          onSubmit={handleCreate}
        />
      )}

      {products.length === 0 ? (
        <div className="empty-state">Sin productos todavía.</div>
      ) : (
        products.map((p) =>
          activeForm === p.id ? (
            <ProductForm
              key={p.id}
              initial={{
                name: p.name,
                category: p.category ?? undefined,
                unitPriceCents: p.unitPriceCents,
                requiresKitchenTicket: p.requiresKitchenTicket,
                trackQuantitySold: p.trackQuantitySold,
              }}
              existingCategories={existingCategories}
              submitLabel="Guardar cambios"
              onCancel={() => setActiveForm('none')}
              onSubmit={(input) => handleUpdate(p.id, input)}
            />
          ) : (
            <div className="list-row" key={p.id}>
              <div style={{ flex: 1 }}>
                <div>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {p.category ? `${p.category} · ` : ''}
                  {p.requiresKitchenTicket ? 'Cocina' : 'Directo'}
                  {p.trackQuantitySold ? ' · Inventario' : ''}
                </div>
              </div>
              <strong>{formatCOP(p.unitPriceCents)}</strong>
              <button className="btn btn-secondary" onClick={() => setActiveForm(p.id)}>
                Editar
              </button>
              <button className="btn btn-danger" onClick={() => onDeactivate(p.id)}>
                Desactivar
              </button>
            </div>
          ),
        )
      )}
    </div>
  );
}

function TablesSection({ tables, onChanged }: { tables: TableSummary[]; onChanged: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.createTable(label);
      setLabel('');
      setShowForm(false);
      await onChanged();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3>Mesas</h3>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Agregar mesa'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-tan)' }}>
          {formError && <div className="error-banner">{formError}</div>}
          <div className="form-field">
            <label>Nombre o número de mesa</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mesa 1" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting || !label}>
            {submitting ? 'Guardando...' : 'Guardar mesa'}
          </button>
        </form>
      )}

      {tables.length === 0 ? (
        <div className="empty-state">Sin mesas todavía.</div>
      ) : (
        <div className="grid grid-tables">
          {tables.map((t) => (
            <div key={t.id} className="table-tile">
              {t.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
